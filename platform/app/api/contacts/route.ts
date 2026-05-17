import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

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
        deals: {
          where: { stage: "won", deletedAt: null },
          select: { rep: true, value: true },
          take: 1,
          orderBy: { wonDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = contacts.map((c) => ({
      ...c,
      rep: c.deals[0]?.rep ?? c.assignedRep ?? null,
      dealValue: c.deals[0]?.value ?? null,
    }));

    return NextResponse.json(serialize(mapped), { status: 200 });
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
      industry,
      websiteUrl,
      marketingComments,
      manualRep,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Round-robin rep assignment
    let assignedRep: string | undefined = manualRep || undefined;
    if (!assignedRep) {
      const activeReps = await prisma.teamMember.findMany({
        where: { organizationId: ORG_ID, active: true, deletedAt: null, role: { not: null } },
        orderBy: { id: "asc" },
      });
      if (activeReps.length > 0) {
        const rrState = await prisma.roundRobinState.upsert({
          where: { id: 1 },
          create: { id: 1, lastRepIndex: 0 },
          update: {},
        });
        const nextIndex = (rrState.lastRepIndex + 1) % activeReps.length;
        assignedRep = activeReps[nextIndex].firstName ?? undefined;
        await prisma.roundRobinState.update({
          where: { id: 1 },
          data: { lastRepIndex: nextIndex },
        });
      }
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
        ...(industry !== undefined && { industry }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(marketingComments !== undefined && { marketingComments }),
        assignedRep: assignedRep ?? undefined,
      },
    });

    return NextResponse.json(serialize(contact), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/contacts error");
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
