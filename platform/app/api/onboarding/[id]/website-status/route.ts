import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { notifyByPosition } from "@/lib/notify";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "not_started",
  "building",
  "draft_sent",
  "in_revision",
  "customer_approved",
  "in_qa",
  "published",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const { status } = await request.json();

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const onboarding = await prisma.onboarding.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const oldStatus = onboarding.websiteStatus || "not_started";

    // Find team member for audit trail
    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
    });

    const updated = await prisma.onboarding.update({
      where: { id },
      data: { websiteStatus: status },
    });

    await prisma.activityLog.create({
      data: {
        organizationId: ORG_ID,
        onboardingId: id,
        type: "status_change",
        metadata: { field: "websiteStatus", from: oldStatus, to: status },
        teamMemberId: teamMember?.id ?? null,
      },
    });

    // ── Notifications ──
    const businessName = onboarding.businessName || onboarding.customerName || "a customer";
    const link = `/onboarding/${id}`;

    if (status === "customer_approved") {
      await notifyByPosition("publishing", {
        type: "status_change",
        title: "Website approved — ready for publishing",
        message: `${businessName} has approved their website. Ready for QA and go-live.`,
        link,
      }).catch(() => {});
    }

    if (status === "in_revision") {
      await notifyByPosition("designer", {
        type: "status_change",
        title: "Revision requested",
        message: `${businessName} has requested revisions on their website.`,
        link,
      }).catch(() => {});
    }

    if (status === "published") {
      await notifyByPosition("admin", {
        type: "site_deployed",
        title: "Website published",
        message: `${businessName}'s website is now live.`,
        link,
      }).catch(() => {});
    }

    logger.info({ id, from: oldStatus, to: status }, "Website status updated");
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ err: error }, "POST /api/onboarding/[id]/website-status failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
