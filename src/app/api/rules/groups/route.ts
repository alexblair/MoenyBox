import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-utils";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    const groups = await prisma.ruleGroup.findMany({
      where: { userId: user.id },
      include: {
        rules: {
          orderBy: { sortOrder: "asc" },
          include: {
            conditions: true,
            actions: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    const parsed = groups.map((g) => ({
      ...g,
      scenarios: (() => { try { return JSON.parse(g.scenarios); } catch { return ["IMPORT", "MANUAL"]; } })(),
    }));
    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "获取规则组失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
    await requirePermission(user.id, "account.manage");
    const body = await request.json();
    const { name, description, mode, scenarios, rules } = body;

    const group = await prisma.ruleGroup.create({
      data: {
        name,
        description,
        mode: mode || "ALL",
        scenarios: scenarios ? JSON.stringify(scenarios) : undefined,
        userId: user.id,
        rules: rules?.length
          ? {
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
            }
          : undefined,
      },
      include: {
        rules: {
          include: { conditions: true, actions: true },
        },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error.name === "PermissionError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "创建规则组失败" }, { status: 500 });
  }
}
