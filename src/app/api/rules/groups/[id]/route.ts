import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const id = Number(params.id);
    const group = await prisma.ruleGroup.findFirst({
      where: { id, userId: user.id },
      include: {
        rules: {
          orderBy: { sortOrder: "asc" },
          include: {
            conditions: true,
            actions: true,
          },
        },
      },
    });
    if (!group) {
      return NextResponse.json({ error: "规则组不存在" }, { status: 404 });
    }
    return NextResponse.json({
      ...group,
      scenarios: (() => { try { return JSON.parse(group.scenarios); } catch { return ["IMPORT", "MANUAL"]; } })(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取规则组失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const id = Number(params.id);
    const existing = await prisma.ruleGroup.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "规则组不存在" }, { status: 404 });
    const body = await request.json();
    const { name, description, mode, sortOrder, active, scenarios, rules } = body;

    const group = await prisma.ruleGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(mode !== undefined && { mode }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(active !== undefined && { active }),
        ...(scenarios !== undefined && { scenarios: JSON.stringify(scenarios) }),
        ...(rules !== undefined && {
          rules: {
            deleteMany: {},
            create: rules.map((rule: any, idx: number) => ({
              name: rule.name,
              description: rule.description,
              conditionMode: rule.conditionMode || "ALL",
              sortOrder: idx,
              conditions: {
                create: (rule.conditions || []).map((c: any) => ({
                  field: c.field,
                  operator: c.operator,
                  value: c.value,
                })),
              },
              actions: {
                create: (rule.actions || []).map((a: any) => ({
                  field: a.field,
                  value: a.value,
                })),
              },
            })),
          },
        }),
      },
      include: {
        rules: {
          include: { conditions: true, actions: true },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "更新规则组失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const id = Number(params.id);
    const existing = await prisma.ruleGroup.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "规则组不存在" }, { status: 404 });
    await prisma.ruleGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "删除规则组失败" }, { status: 500 });
  }
}
