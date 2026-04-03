import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();

    if (!body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: "firstName and lastName are required" },
        { status: 400 }
      );
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["firstName", "lastName", "email", "phone", "role", "commissionRate", "monthlyTarget", "active"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const member = await prisma.teamMember.create({
      data: {
        ...allowedFields,
        organizationId: ORG_ID,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/team error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
