import { prisma } from "@/lib/db";
import { Category } from "@/types";
import defaultCategoriesData from "@demo-data/categories.json";
import defaultAccountsData from "@demo-data/accounts.json";

const COLOR_PALETTE = [
  "#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b",
  "#14b8a6", "#d946ef", "#0ea5e9", "#84cc16", "#f43f5e",
];

function randomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

async function resolveColor(userId: number, parentId: number | null, color?: string): Promise<string> {
  if (color) return color;
  if (parentId) {
    const parent = await prisma.category.findFirst({ where: { id: parentId, userId }, select: { color: true } });
    if (parent) return parent.color;
  }
  return randomColor();
}

export async function getCategoryTree(userId: number): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  const map = new Map<number, Category>();
  const roots: Category[] = [];

  for (const c of categories) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const c of categories) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getCategoryById(id: number, userId: number): Promise<Category | null> {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  return category;
}

export async function createCategory(userId: number, data: {
  name: string;
  parentId?: number | null;
  color?: string;
  icon?: string;
  note?: string;
  sortOrder?: number;
}): Promise<Category> {
  const color = await resolveColor(userId, data.parentId ?? null, data.color);
  const category = await prisma.category.create({
    data: {
      name: data.name,
      parentId: data.parentId ?? null,
      color,
      icon: data.icon,
      note: data.note,
      sortOrder: data.sortOrder ?? 0,
      userId,
    },
  });
  return category;
}

export async function updateCategory(
  id: number,
  userId: number,
  data: {
    name?: string;
    color?: string;
    icon?: string;
    note?: string;
    sortOrder?: number;
    parentId?: number | null;
  }
): Promise<Category> {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("分类不存在");
  const { parentId, ...rest } = data;
  const updateData: any = { ...rest };
  if (parentId !== undefined) {
    updateData.parent = parentId === null
      ? { disconnect: true }
      : { connect: { id: parentId } };
  }
  const category = await prisma.category.update({ where: { id }, data: updateData });
  return category;
}

export async function deleteCategory(id: number, userId: number): Promise<void> {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw new Error("分类不存在");

  const all = await prisma.category.findMany();
  const idsToDelete = [id];
  const queue = [id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const c of all) {
      if (c.parentId === current) {
        idsToDelete.push(c.id);
        queue.push(c.id);
      }
    }
  }

  const count = await prisma.transaction.count({
    where: { categoryId: { in: idsToDelete } },
  });

  if (count > 0) {
    throw new Error("该分类或子分类下存在交易记录，无法删除");
  }

  await prisma.category.deleteMany({ where: { id: { in: idsToDelete } } });
}

export async function batchDeleteCategories(ids: number[], userId: number): Promise<{ deleted: number[]; failed: { id: number; reason: string }[] }> {
  const deleted: number[] = [];
  const failed: { id: number; reason: string }[] = [];

  for (const id of ids) {
    const category = await prisma.category.findFirst({ where: { id, userId } });
    if (!category) {
      failed.push({ id, reason: "分类不存在" });
      continue;
    }

    const all = await prisma.category.findMany();
    const idsToDelete = [id];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const c of all) {
        if (c.parentId === current) {
          idsToDelete.push(c.id);
          queue.push(c.id);
        }
      }
    }

    const count = await prisma.transaction.count({
      where: { categoryId: { in: idsToDelete } },
    });

    if (count > 0) {
      failed.push({ id, reason: `分类"${category.name}"或子分类下存在交易记录，无法删除` });
      continue;
    }

    await prisma.category.deleteMany({ where: { id: { in: idsToDelete } } });
    deleted.push(id);
  }

  return { deleted, failed };
}

export async function initCategories(
  userId: number,
  data: { name: string; parentName?: string | null; color?: string; icon?: string; note?: string }[]
): Promise<{ created: number; skipped: number }> {
  const existingMap = new Map<string, number>();
  const allExisting = await prisma.category.findMany({ where: { userId } });
  for (const c of allExisting) {
    existingMap.set(c.name, c.id);
  }

  let created = 0;
  let skipped = 0;

  const nameToId = new Map<string, number>();

  for (const item of data) {
    if (!item.name?.trim()) continue;

    const name = item.name.trim();
    if (existingMap.has(name)) {
      skipped++;
      nameToId.set(name, existingMap.get(name)!);
      continue;
    }

    let parentId: number | null = null;
    if (item.parentName) {
      const parent = existingMap.get(item.parentName) ?? nameToId.get(item.parentName);
      if (parent) parentId = parent;
    }

    const color = await resolveColor(userId, parentId, item.color);
    const cat = await prisma.category.create({
      data: {
        name,
        parentId,
        color,
        icon: item.icon,
        note: item.note,
        userId,
      },
    });
    created++;
    nameToId.set(name, cat.id);
    existingMap.set(name, cat.id);
  }

  return { created, skipped };
}

export function getDefaultInitCategories(): { name: string; parentName: string | null; color?: string; icon?: string; note?: string }[] {
  return defaultCategoriesData as { name: string; parentName: string | null; color?: string; icon?: string; note?: string }[];
}

export function getDefaultInitAccounts(): { name: string; type: string; balance: number; currency: string; icon?: string }[] {
  return defaultAccountsData as { name: string; type: string; balance: number; currency: string; icon?: string }[];
}

export async function batchUpdateCategories(
  ids: number[],
  userId: number,
  data: { icon?: string; color?: string }
): Promise<number> {
  const updateData: Record<string, string> = {};
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;

  const result = await prisma.category.updateMany({
    where: { id: { in: ids }, userId },
    data: updateData,
  });
  return result.count;
}

export async function getExportCategories(userId: number): Promise<{ name: string; parentName: string | null; color: string; icon?: string; note?: string }[]> {
  const all = await prisma.category.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
  const nameMap = new Map<number, string>();
  for (const c of all) nameMap.set(c.id, c.name);

  return all.map((c) => ({
    name: c.name,
    parentName: c.parentId ? (nameMap.get(c.parentId) ?? null) : null,
    color: c.color,
    ...(c.icon ? { icon: c.icon } : {}),
    ...(c.note ? { note: c.note } : {}),
  }));
}
