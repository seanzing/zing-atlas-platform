import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { sendGmailAs } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const { to, subject, body, previewUrl } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 }
      );
    }

    const onboarding = await prisma.onboarding.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fromEmail = auth.user.email;
    if (!fromEmail) {
      return NextResponse.json({ error: "No email on auth user" }, { status: 400 });
    }

    // Find team member for audit trail
    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
    });

    // Graceful degradation if Gmail not configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        { error: "Gmail not configured" },
        { status: 503 }
      );
    }

    await sendGmailAs(fromEmail, to, subject, body);

    await prisma.activityLog.create({
      data: {
        organizationId: ORG_ID,
        onboardingId: id,
        type: "email_sent",
        subject,
        body,
        toEmail: to,
        fromEmail,
        previewUrl: previewUrl ?? null,
        teamMemberId: teamMember?.id ?? null,
      },
    });

    logger.info({ id, to, subject }, "Email sent via Gmail");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "POST /api/onboarding/[id]/send-email failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
