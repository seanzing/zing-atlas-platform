import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID, ONBOARDING_TASK_TEMPLATES, PRODUCT_TASK_MAP } from "@/lib/constants";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const products = await prisma.product.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        _count: { select: { taskTemplates: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    logger.error({ err: error }, "GET /api/products error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();

    if (!body.description || body.price === undefined || body.price === null) {
      return NextResponse.json(
        { error: "description and price are required" },
        { status: 400 }
      );
    }

    const { basePlan, tasks } = body;

    // Validate numeric fields
    if (body.price !== undefined && body.price !== null) {
      const numPrice = Number(body.price);
      if (isNaN(numPrice) || numPrice < 0) {
        return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 });
      }
    }
    if (body.commissionValue !== undefined && body.commissionValue !== null) {
      const numComm = Number(body.commissionValue);
      if (isNaN(numComm) || numComm < 0) {
        return NextResponse.json({ error: "commissionValue must be a non-negative number" }, { status: 400 });
      }
    }
    if (body.launchFeeCommissionRate !== undefined && body.launchFeeCommissionRate !== null) {
      const numRate = Number(body.launchFeeCommissionRate);
      if (isNaN(numRate) || numRate < 0 || numRate > 1) {
        return NextResponse.json({ error: "launchFeeCommissionRate must be between 0 and 1" }, { status: 400 });
      }
    }

    // Whitelist allowed fields to prevent mass assignment
    const product = await prisma.product.create({
      data: {
        description: body.description,
        price: body.price,
        category: body.category ?? null,
        commissionType: body.commissionType ?? null,
        commissionValue: body.commissionValue ?? null,
        launchFeeCommissionRate: body.launchFeeCommissionRate ?? null,
        organizationId: ORG_ID,
      },
    });

    // Determine task templates to create
    let taskTemplates: Array<{
      productId: string;
      taskType: string;
      taskName: string;
      taskOrder: number;
      ownerRole: string | null;
      daysOffset: number;
      isConditional: boolean;
      statusOptions: Record<string, unknown>[] | undefined;
    }> = [];

    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      // Custom tasks provided directly
      taskTemplates = tasks.map((t: Record<string, unknown>, idx: number) => ({
        productId: product.id,
        taskType: (t.taskType as string) || "custom",
        taskName: (t.taskName as string) || "Untitled Task",
        taskOrder: (t.taskOrder as number) ?? idx,
        ownerRole: (t.ownerRole as string) || null,
        daysOffset: (t.daysOffset as number) ?? 14,
        isConditional: (t.isConditional as boolean) ?? false,
        statusOptions: (t.statusOptions as Record<string, unknown>[]) ?? [],
      }));
    } else if (basePlan && PRODUCT_TASK_MAP[basePlan]) {
      // Pre-populate from base plan constants
      const taskTypes = PRODUCT_TASK_MAP[basePlan];
      taskTemplates = taskTypes.map((taskType, idx) => {
        const template = ONBOARDING_TASK_TEMPLATES[taskType];
        return {
          productId: product.id,
          taskType: template.taskType,
          taskName: template.itemName,
          taskOrder: idx,
          ownerRole: template.ownerRole,
          daysOffset: template.daysOffset,
          isConditional: template.isConditional,
          statusOptions: JSON.parse(JSON.stringify(template.statusOptions)),
        };
      });
    }

    if (taskTemplates.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.productTaskTemplate.createMany({ data: taskTemplates as any });
    }

    const result = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        _count: { select: { taskTemplates: { where: { deletedAt: null } } } },
      },
    });

    logger.info({ productId: product.id, taskCount: taskTemplates.length }, "POST /api/products");
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/products error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
