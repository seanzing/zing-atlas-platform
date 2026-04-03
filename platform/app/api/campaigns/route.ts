import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
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
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Whitelist allowed fields to prevent mass assignment
    const campaign = await prisma.campaign.create({
      data: {
        name: body.name,
        type: body.type ?? null,
        status: body.status ?? null,
        organizationId: ORG_ID,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/campaigns error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
