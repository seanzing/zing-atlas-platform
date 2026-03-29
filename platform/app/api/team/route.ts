import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET() {
  try {
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        organizationId: ORG_ID,
        active: true,
        deletedAt: null,
      },
    });

    return NextResponse.json(teamMembers);
  } catch (error) {
    logger.error({ err: error }, "GET /api/team error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
