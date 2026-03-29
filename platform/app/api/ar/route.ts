import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const accounts = await prisma.arAccount.findMany({
      where,
      include: {
        timeline: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    logger.error({ err: error }, "GET /api/ar error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
