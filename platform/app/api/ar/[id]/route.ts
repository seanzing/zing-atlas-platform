import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "AR account not found" }, { status: 404 });
    }

    const account = await prisma.arAccount.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        timeline: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "AR account not found" }, { status: 404 });
    }

    return NextResponse.json(serialize(account));
  } catch (error) {
    logger.error({ err: error }, "GET /api/ar/[id] error");
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

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "AR account not found" }, { status: 404 });
    }

    const existing = await prisma.arAccount.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "AR account not found" }, { status: 404 });
    }

    const body = await request.json();

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["customerName", "email", "phone", "status", "product", "mrr", "amountDue", "amountPaid", "notes"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const updated = await prisma.arAccount.update({
      where: { id },
      data: allowedFields,
      include: {
        timeline: true,
      },
    });

    return NextResponse.json(serialize(updated));
  } catch (error) {
    logger.error({ err: error }, "PUT /api/ar/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
