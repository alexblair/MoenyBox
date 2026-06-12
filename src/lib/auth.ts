import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";

const COOKIE_NAME = "mb_session";
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

function encrypt(text: string): string {
  const key = crypto.createHash("sha256").update(SECRET).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + cipher.getAuthTag().toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string | null {
  try {
    const parts = text.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    const key = crypto.createHash("sha256").update(SECRET).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  return crypto.scryptSync(password, salt, 64).toString("hex") === hash;
}

export function createSession(userId: number): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 86400000 });
  return encrypt(payload);
}

export function parseSession(token: string): { userId: number } | null {
  const decrypted = decrypt(token);
  if (!decrypted) return null;
  try {
    const payload = JSON.parse(decrypted);
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function getServerUser(): Promise<{ id: number; name: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = parseSession(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true },
  });
  return user;
}

const isSecure = process.env.NODE_ENV === "production";

export function setSessionCookie(userId: number): string {
  const token = createSession(userId);
  const secure = isSecure ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${7 * 86400}`;
}

export function clearSessionCookie(): string {
  const secure = isSecure ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`;
}
