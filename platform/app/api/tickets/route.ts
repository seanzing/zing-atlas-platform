import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tickets = await prisma.ticket.findMany({
      where,
      include: { contact: true },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    logger.error({ err: error }, "GET /api/tickets error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.subject) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        ...body,
        organizationId: ORG_ID,
      },
      include: { contact: true },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/tickets error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
