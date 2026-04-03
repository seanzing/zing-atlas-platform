import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

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
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();

    if (!body.subject) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["subject", "description", "status", "priority", "category", "contactId", "contactName", "assignee", "notes"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const ticket = await prisma.ticket.create({
      data: {
        ...allowedFields,
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
