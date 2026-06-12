import { PrismaClient, AccountType } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import defaultCategoriesData from "../demo-data/categories.json";
import defaultAccountsData from "../demo-data/accounts.json";

const prisma = new PrismaClient();

interface CategoryItem {
  name: string;
  parentName: string | null;
  color?: string;
  icon?: string;
  note?: string;
}

async function main() {
  console.log("Seeding...");

  const existing = await prisma.user.findFirst({ where: { name: "admin" } });
  const user = existing ?? await prisma.user.create({
    data: {
      name: "admin",
      passwordHash: hashPassword("admin"),
      active: true,
    },
  });

  console.log(`  User: ${user.name} (id=${user.id})`);

  const catData = defaultCategoriesData as CategoryItem[];
  const nameToId = new Map<string, number>();

  for (const item of catData) {
    const existing = Array.from(nameToId.entries()).find(([, id]) => id);
    const parentId = item.parentName ? (nameToId.get(item.parentName) ?? null) : null;
    const cat = await prisma.category.create({
      data: {
        name: item.name,
        parentId,
        color: item.color ?? "#6b7280",
        icon: item.icon,
        note: item.note,
        sortOrder: 0,
        userId: user.id,
      },
    });
    nameToId.set(item.name, cat.id);
  }

  for (const acct of defaultAccountsData as { name: string; type: string; balance: number; currency?: string; icon?: string }[]) {
    await prisma.account.create({
      data: {
        name: acct.name,
        type: acct.type as AccountType,
        balance: acct.balance,
        currency: acct.currency ?? "CNY",
        icon: acct.icon,
        userId: user.id,
      },
    });
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
