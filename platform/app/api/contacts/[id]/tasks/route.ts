import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const active = await prisma.contactTask.findMany({
      where: {
        contactId: id,
        organizationId: ORG_ID,
        completed: false,
      },
      orderBy: { dueDate: "asc" },
    });
    const done = await prisma.contactTask.findMany({
      where: {
        contactId: id,
        organizationId: ORG_ID,
        completed: true,
      },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json(serialize([...active, ...done]), { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "GET /api/contacts/[id]/tasks error");
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    const task = await prisma.contactTask.create({
      data: {
        contactId: id,
        organizationId: ORG_ID,
        title: body.title.trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    return NextResponse.json(serialize(task), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/contacts/[id]/tasks error");
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
