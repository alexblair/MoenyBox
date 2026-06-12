import { describe, it, expect, vi, beforeEach } from "vitest";
import { requirePermission, checkAnyAccountPermission, PermissionError } from "@/lib/permission-utils";

vi.mock("@/lib/db", () => ({
  prisma: {
    userGroupMember: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/server/groupPermissions", () => ({
  hasPermission: vi.fn(),
  getUserEffectivePermissions: vi.fn(),
}));

const { prisma } = await import("@/lib/db");
const { hasPermission, getUserEffectivePermissions } = await import("@/server/groupPermissions");

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("不抛出错误当权限已授予", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(1);
    (hasPermission as any).mockResolvedValue(true);
    await expect(requirePermission(1, "transaction.create", 1)).resolves.toBeUndefined();
    expect(hasPermission).toHaveBeenCalledWith(1, "transaction.create", 1);
  });

  it("抛出 PermissionError 当权限未授予", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(1);
    (hasPermission as any).mockResolvedValue(false);
    await expect(requirePermission(1, "account.manage")).rejects.toThrow(PermissionError);
    await expect(requirePermission(1, "account.manage")).rejects.toThrow("权限不足");
  });

  it("错误信息包含 permission 和 accountId", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(1);
    (hasPermission as any).mockResolvedValue(false);
    try {
      await requirePermission(1, "transaction.edit", 5);
    } catch (e: any) {
      expect(e.permission).toBe("transaction.edit");
      expect(e.accountId).toBe(5);
    }
  });

  it("accountId 可选参数", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(1);
    (hasPermission as any).mockResolvedValue(true);
    await expect(requirePermission(1, "transaction.view")).resolves.toBeUndefined();
    expect(hasPermission).toHaveBeenCalledWith(1, "transaction.view", undefined);
  });

  it("无组成员时自动放行（god 模式）", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(0);
    (hasPermission as any).mockResolvedValue(false);
    await expect(requirePermission(1, "account.manage")).resolves.toBeUndefined();
    expect(hasPermission).not.toHaveBeenCalled();
  });
});

describe("checkAnyAccountPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("返回 true 当用户有任何账户具有该权限", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(1);
    (getUserEffectivePermissions as any).mockResolvedValue([
      { permission: "account.view", granted: true },
      { permission: "transaction.create", granted: true },
    ]);
    const result = await checkAnyAccountPermission(1, "transaction.create");
    expect(result).toBe(true);
  });

  it("返回 false 当用户没有该权限", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(1);
    (getUserEffectivePermissions as any).mockResolvedValue([
      { permission: "account.view", granted: true },
    ]);
    const result = await checkAnyAccountPermission(1, "account.manage");
    expect(result).toBe(false);
  });

  it("返回 false 当权限存在但被拒绝", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(1);
    (getUserEffectivePermissions as any).mockResolvedValue([
      { permission: "transaction.create", granted: false },
    ]);
    const result = await checkAnyAccountPermission(1, "transaction.create");
    expect(result).toBe(false);
  });

  it("无组成员时返回 true（god 模式）", async () => {
    (prisma.userGroupMember.count as any).mockResolvedValue(0);
    (getUserEffectivePermissions as any).mockResolvedValue([]);
    const result = await checkAnyAccountPermission(1, "account.view");
    expect(result).toBe(true);
  });
});
