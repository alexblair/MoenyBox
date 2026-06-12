# MoneyBox Deployment Guide · 部署指南

> 支持 Docker / Vercel / 裸机等多种部署方式

---

## 目录 / Table of Contents

1. [环境要求 / Prerequisites](#1-环境要求--prerequisites)
2. [Docker 部署](#2-docker-部署)
3. [Vercel 部署](#3-vercel-部署)
4. [裸机部署 / Bare Metal](#4-裸机部署--bare-metal)
5. [数据库配置 / Database Configuration](#5-数据库配置--database-configuration)
6. [反向代理 / Reverse Proxy](#6-反向代理--reverse-proxy)
7. [环境变量参考 / Environment Variables](#7-环境变量参考--environment-variables)
8. [运维指南 / Operations](#8-运维指南--operations)

---

## 1. 环境要求 / Prerequisites

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| MySQL | 8.0 | 8.4+ |
| RAM | 512 MB | 1 GB |
| Disk | 500 MB | 1 GB |
| CPU | 1 core | 2 cores |

## 2. Docker 部署

### 2.1 Docker Compose (推荐)

```yaml
# docker-compose.yml
version: "3.8"

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: moneybox
      MYSQL_USER: moneybox
      MYSQL_PASSWORD: moneybox
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3307:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "mysql://moneybox:moneybox@db:3306/moneybox"
      SESSION_SECRET: "<generate-a-random-secret>"
      NEXT_PUBLIC_APP_URL: "https://your-domain.com"
    depends_on:
      db:
        condition: service_healthy

volumes:
  mysql_data:
```

### 2.2 Dockerfile

```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

```bash
# Build and run
docker compose up -d
```

### 2.3 Data Persistence

Uploaded files (attachments) are stored under `public/uploads/`. In Docker, mount a volume:

```yaml
volumes:
  - ./uploads:/app/public/uploads
```

## 3. Vercel 部署

### 3.1 准备工作

1. Push your code to GitHub/GitLab
2. Create a MySQL database (recommend PlanetScale, Aiven, or TiDB Cloud)
3. Import project in Vercel dashboard

### 3.2 环境变量配置

In Vercel dashboard → Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `mysql://...` (your MySQL connection string) |
| `SESSION_SECRET` | Random string (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain |

### 3.3 Build Settings

- Framework Preset: **Next.js**
- Build Command: `npx prisma generate && npm run build`
- Output Directory: `.next`

### 3.4 注意事项

- **Serverless functions** have a 10s cold start — consider using Vercel Pro for higher limits
- **File uploads** (attachments) require external storage (S3-compatible) in serverless environments
- **Prisma** needs `prisma generate` during build — included in build command

## 4. 裸机部署 / Bare Metal

### 4.1 安装依赖

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL 8.0
sudo apt-get install -y mysql-server-8.0
sudo mysql_secure_installation

# Verify
node --version  # >= 18
npm --version
mysql --version
```

### 4.2 创建数据库

```bash
mysql -u root -p
```

```sql
CREATE DATABASE IF NOT EXISTS moneybox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'moneybox'@'localhost' IDENTIFIED BY 'your-strong-password';
GRANT ALL PRIVILEGES ON moneybox.* TO 'moneybox'@'localhost';
FLUSH PRIVILEGES;
```

### 4.3 部署应用

```bash
# Clone
git clone <repo-url> /opt/moneybox
cd /opt/moneybox

# Install dependencies
npm ci --production=false

# Configure
cp .env.example .env
# Edit .env: set DATABASE_URL and SESSION_SECRET

# Setup database
npx prisma db push
npx prisma generate

# Build
npm run build

# Start with process manager
npm i -g pm2
pm2 start npm --name "moneybox" -- start
pm2 save
pm2 startup
```

## 5. 数据库配置 / Database Configuration

### 5.1 MySQL 调优建议

```ini
# /etc/mysql/mysql.conf.d/moneybox.cnf
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
max_connections = 200
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
```

### 5.2 备份策略

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/moneybox"
DATETIME=$(date +%Y%m%d_%H%M%S)
mysqldump -u moneybox -p moneybox | gzip > "$BACKUP_DIR/moneybox_$DATETIME.sql.gz"
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

```bash
# Restore
gunzip < moneybox_20260101_000000.sql.gz | mysql -u moneybox -p moneybox
```

## 6. 反向代理 / Reverse Proxy

### 6.1 Nginx

```nginx
server {
    listen 80;
    server_name moneybox.your-domain.com;

    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name moneybox.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/moneybox.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moneybox.your-domain.com/privkey.pem;

    # Upload size limit
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.2 Caddy (Alternative)

```caddyfile
moneybox.your-domain.com {
    reverse_proxy 127.0.0.1:3000
    encode gzip
    file_server
}
```

## 7. 环境变量参考 / Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | MySQL connection string, e.g. `mysql://user:pass@host:3306/db` |
| `SESSION_SECRET` | ✅ | — | Session encryption key (min 32 characters, random) |
| `NEXT_PUBLIC_APP_URL` | ❌ | `http://localhost:3000` | Public URL of your deployment |
| `HOSTNAME` | ❌ | `localhost` | Server listen address (use `0.0.0.0` for Docker) |

## 8. 运维指南 / Operations

### 8.1 Health Check

```bash
curl http://localhost:3000
# Should return 200 OK
```

### 8.2 Logs

```bash
# PM2 logs
pm2 logs moneybox

# Docker logs
docker compose logs -f app
```

### 8.3 Update

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Run migrations if schema changed
npx prisma db push

# Rebuild
npm run build

# Restart
pm2 restart moneybox   # or: docker compose restart app
```

### 8.4 Monitoring

```bash
# PM2 monitoring
pm2 monit

# Docker resource usage
docker stats
```

### 8.5 SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d moneybox.your-domain.com
```
