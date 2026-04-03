import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        _count: {
          select: { deals: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "GET /api/contacts error");
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const body = await request.json();

    const {
      name,
      email,
      secondaryEmail,
      company,
      phone,
      status,
      leadSource,
      campaignId,
      avatar,
      value,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.create({
      data: {
        organizationId: ORG_ID,
        name,
        ...(email !== undefined && { email }),
        ...(secondaryEmail !== undefined && { secondaryEmail }),
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        ...(status !== undefined && { status }),
        ...(leadSource !== undefined && { leadSource }),
        ...(campaignId !== undefined && { campaignId }),
        ...(avatar !== undefined && { avatar }),
        ...(value !== undefined && { value }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/contacts error");
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
