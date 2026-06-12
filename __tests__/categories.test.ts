import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDefaultInitCategories, getDefaultInitAccounts } from "@/server/categories";

describe("getDefaultInitCategories", () => {
  it("从 demo-data/categories.json 加载并返回数组", () => {
    const data = getDefaultInitCategories();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("每条数据包含 name 和 parentName", () => {
    const data = getDefaultInitCategories();
    for (const item of data) {
      expect(item).toHaveProperty("name");
      expect(typeof item.name).toBe("string");
      expect(item).toHaveProperty("parentName");
    }
  });

  it("包含预定义的顶级分类", () => {
    const data = getDefaultInitCategories();
    const topLevel = data.filter((c) => c.parentName === null);
    const names = topLevel.map((c) => c.name);
    expect(names).toContain("餐饮");
    expect(names).toContain("交通");
    expect(names).toContain("购物");
    expect(names).toContain("收入");
  });
});

describe("getDefaultInitAccounts", () => {
  it("从 demo-data/accounts.json 加载并返回数组", () => {
    const data = getDefaultInitAccounts();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("每条数据包含 name, type, balance, currency", () => {
    const data = getDefaultInitAccounts();
    for (const item of data) {
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("balance");
      expect(item).toHaveProperty("currency");
    }
  });
});
