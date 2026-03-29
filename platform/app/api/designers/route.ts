import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET() {
  try {
    const designers = await prisma.designer.findMany({
      where: {
        organizationId: ORG_ID,
        active: true,
      },
    });

    return NextResponse.json(designers);
  } catch (error) {
    logger.error({ err: error }, "GET /api/designers error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
