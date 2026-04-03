import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const templates = await prisma.productTaskTemplate.findMany({
      where: { productId: id, deletedAt: null },
      orderBy: { taskOrder: "asc" },
    });

    logger.info({ productId: id, count: templates.length }, "GET /api/products/[id]/tasks");
    return NextResponse.json(templates);
  } catch (error) {
    logger.error({ err: error }, "GET /api/products/[id]/tasks failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!body.taskType || !body.taskName) {
      return NextResponse.json(
        { error: "taskType and taskName are required" },
        { status: 400 }
      );
    }

    const template = await prisma.productTaskTemplate.create({
      data: {
        productId: id,
        taskType: body.taskType,
        taskName: body.taskName,
        taskOrder: body.taskOrder ?? 0,
        ownerRole: body.ownerRole ?? null,
        daysOffset: body.daysOffset ?? 14,
        isConditional: body.isConditional ?? false,
        statusOptions: body.statusOptions ?? [],
      },
    });

    logger.info({ productId: id, templateId: template.id }, "POST /api/products/[id]/tasks");
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/products/[id]/tasks failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
