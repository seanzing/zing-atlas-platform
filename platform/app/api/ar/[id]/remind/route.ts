import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    // Look up AR account
    const account = await prisma.arAccount.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!account) {
      return NextResponse.json({ error: "AR account not found" }, { status: 404 });
    }

    // Phase 1: just add a timeline entry noting reminder sent
    // (Twilio/email integration in Phase 2)
    const now = new Date();
    await prisma.arTimeline.create({
      data: {
        arId: id,
        date: now,
        type: "reminder-sent",
        note: "Payment reminder sent from Atlas",
      },
    });

    logger.info({ arId: id }, "Payment reminder recorded");

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "POST /api/ar/[id]/remind error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
