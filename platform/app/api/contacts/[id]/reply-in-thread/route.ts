import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const { to, subject, body, gmailThreadId } = await request.json();

    if (!to || !subject || !body || !gmailThreadId) {
      return NextResponse.json(
        { error: "to, subject, body, and gmailThreadId required" },
        { status: 400 }
      );
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
      select: { id: true, googleRefreshToken: true },
    });

    if (!teamMember?.googleRefreshToken) {
      return NextResponse.json(
        { error: "Google account not connected" },
        { status: 503 }
      );
    }

    const fromEmail = auth.user.email;
    if (!fromEmail) {
      return NextResponse.json(
        { error: "No email on auth user" },
        { status: 400 }
      );
    }

    const htmlBody = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const { threadId } = await sendGmailAs(
      fromEmail,
      to,
      subject,
      htmlBody,
      teamMember.googleRefreshToken,
      { threadId: gmailThreadId }
    );

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
        gmailThreadId: threadId || gmailThreadId,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
