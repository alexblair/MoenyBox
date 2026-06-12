import { describe, it, expect } from "vitest";
import { buildTree, formatCurrency, formatDate } from "@/lib/utils";

describe("buildTree", () => {
  it("构建多层级树结构", () => {
    const items = [
      { id: 1, parentId: null, name: "食物" },
      { id: 2, parentId: 1, name: "早餐" },
      { id: 3, parentId: 1, name: "午餐" },
      { id: 4, parentId: null, name: "交通" },
      { id: 5, parentId: 4, name: "公交" },
      { id: 6, parentId: 4, name: "地铁" },
    ];
    const tree = buildTree(items);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].id).toBe(2);
    expect(tree[1].id).toBe(4);
    expect(tree[1].children).toHaveLength(2);
  });

  it("处理空数组", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("处理孤立节点（parentId 没有对应父级）", () => {
    const items = [
      { id: 1, parentId: 99, name: "孤立" },
      { id: 2, parentId: null, name: "根" },
    ];
    const tree = buildTree(items);
    expect(tree).toHaveLength(2);
    expect(tree.some((n) => n.id === 1)).toBe(true);
  });

  it("处理单个根节点", () => {
    const items = [{ id: 1, parentId: null, name: "单一" }];
    const tree = buildTree(items);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toEqual([]);
  });
});

describe("formatCurrency", () => {
  it("格式化金额为 CNY", () => {
    const result = formatCurrency(1234.5);
    expect(result).toContain("1,234.50");
  });

  it("处理零金额", () => {
    expect(formatCurrency(0)).toContain("0.00");
  });

  it("处理大金额", () => {
    const result = formatCurrency(1000000);
    expect(result).toContain("1,000,000");
  });
});

describe("formatDate", () => {
  it("short 格式", () => {
    const d = new Date("2024-06-15");
    expect(formatDate(d, "short")).toMatch(/06\/15/);
  });

  it("long 格式", () => {
    const d = new Date("2024-06-15");
    expect(formatDate(d, "long")).toContain("2024");
    expect(formatDate(d, "long")).toContain("6月");
  });

  it("datetime 格式", () => {
    const d = new Date("2024-06-15T14:30:00");
    const r = formatDate(d, "datetime");
    expect(r).toContain("2024");
    expect(r).toContain("06");
    expect(r).toContain("15");
  });
});
