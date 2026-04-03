import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id, taskId } = await params;
    const body = await request.json();

    const existing = await prisma.productTaskTemplate.findFirst({
      where: { id: taskId, productId: id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task template not found" }, { status: 404 });
    }

    const updated = await prisma.productTaskTemplate.update({
      where: { id: taskId },
      data: {
        ...(body.taskType !== undefined && { taskType: body.taskType }),
        ...(body.taskName !== undefined && { taskName: body.taskName }),
        ...(body.taskOrder !== undefined && { taskOrder: body.taskOrder }),
        ...(body.ownerRole !== undefined && { ownerRole: body.ownerRole }),
        ...(body.daysOffset !== undefined && { daysOffset: body.daysOffset }),
        ...(body.isConditional !== undefined && { isConditional: body.isConditional }),
        ...(body.statusOptions !== undefined && { statusOptions: body.statusOptions }),
      },
    });

    logger.info({ productId: id, taskId }, "PUT /api/products/[id]/tasks/[taskId]");
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/products/[id]/tasks/[taskId] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id, taskId } = await params;

    const existing = await prisma.productTaskTemplate.findFirst({
      where: { id: taskId, productId: id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task template not found" }, { status: 404 });
    }

    const deleted = await prisma.productTaskTemplate.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    logger.info({ productId: id, taskId }, "DELETE /api/products/[id]/tasks/[taskId]");
    return NextResponse.json(deleted);
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/products/[id]/tasks/[taskId] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
