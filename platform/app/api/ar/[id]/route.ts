import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    return NextResponse.json(account);
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
    const { id } = await params;

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

    const updated = await prisma.arAccount.update({
      where: { id },
      data: body,
      include: {
        timeline: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/ar/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
