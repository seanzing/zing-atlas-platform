import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    logger.error({ err: error }, "GET /api/campaigns error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...body,
        organizationId: ORG_ID,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/campaigns error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
