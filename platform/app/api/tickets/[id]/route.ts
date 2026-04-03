import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
      include: { contact: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    logger.error({ err: error }, "GET /api/tickets/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.ticket.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["subject", "description", "status", "priority", "category", "assignee", "notes", "contactId", "contactName"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: allowedFields,
      include: { contact: true },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/tickets/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
