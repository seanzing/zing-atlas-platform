import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const account = await prisma.arAccount.findFirst({
      where: {
        id,
        organizationId: ORG_ID,
        deletedAt: null,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "AR account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, note, date } = body;

    if (!type || !note) {
      return NextResponse.json(
        { error: "Missing required fields: type, note" },
        { status: 400 }
      );
    }

    const entry = await prisma.arTimeline.create({
      data: {
        arId: id,
        type,
        note,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/ar/[id]/timeline error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
