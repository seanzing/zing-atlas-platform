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
    const { to, subject, body } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
      select: { id: true, googleRefreshToken: true },
    });

    if (!teamMember?.googleRefreshToken) {
      return NextResponse.json(
        { error: "Google account not connected. Go to Account to connect." },
        { status: 503 }
      );
    }

    const fromEmail = auth.user.email;
    if (!fromEmail) {
      return NextResponse.json({ error: "No email on auth user" }, { status: 400 });
    }

    // Convert plain-text body to HTML (escape entities, preserve line breaks)
    const htmlBody = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
    await sendGmailAs(fromEmail, to, subject, htmlBody, teamMember.googleRefreshToken);

    await prisma.activityLog.create({
      data: {
        organizationId: ORG_ID,
        contactId: id,
        teamMemberId: teamMember.id,
        type: "email_sent",
        subject,
        body,
        toEmail: to,
        fromEmail,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "POST /api/contacts/[id]/send-email failed");
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
