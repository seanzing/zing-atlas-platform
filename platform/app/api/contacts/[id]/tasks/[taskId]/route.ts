import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id, taskId } = await params;

    const body = await request.json();
    if (typeof body?.completed !== "boolean") {
      return NextResponse.json(
        { error: "completed must be a boolean" },
        { status: 400 }
      );
    }

    const task = await prisma.contactTask.update({
      where: {
        id: taskId,
        contactId: id,
        organizationId: ORG_ID,
      },
      data: {
        completed: body.completed,
        completedAt: body.completed ? new Date() : null,
      },
    });

    return NextResponse.json(serialize(task), { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/contacts/[id]/tasks/[taskId] error");
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
