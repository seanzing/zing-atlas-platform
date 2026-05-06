import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { getThreadReplies } from "@/lib/gmail-replies";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Google not configured" }, { status: 503 });
    }

    // Get team member's refresh token
    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
      select: { id: true, googleRefreshToken: true },
    });
    if (!teamMember?.googleRefreshToken) {
      return NextResponse.json({ error: "Google account not connected" }, { status: 503 });
    }

    // Find all sent emails with gmailThreadId for this contact
    const sentEmails = await prisma.activityLog.findMany({
      where: {
        contactId: id,
        organizationId: ORG_ID,
        type: "email_sent",
        gmailThreadId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (sentEmails.length === 0) {
      return NextResponse.json({ newReplies: 0 });
    }

    // Get already-known reply message IDs to avoid duplicates
    const existingReplies = await prisma.activityLog.findMany({
      where: {
        contactId: id,
        organizationId: ORG_ID,
        type: "email_received",
        gmailThreadId: { not: null },
      },
      select: { metadata: true },
    });
    const knownMessageIds = new Set(
      existingReplies
        .map((r) => (r.metadata as { gmailMessageId?: string } | null)?.gmailMessageId)
        .filter(Boolean)
    );

    let newReplies = 0;

    for (const sent of sentEmails) {
      if (!sent.gmailThreadId) continue;

      try {
        const replies = await getThreadReplies(
          sent.gmailThreadId,
          sent.subject ?? "",
          teamMember.googleRefreshToken,
          clientId,
          clientSecret
        );

        for (const reply of replies) {
          if (knownMessageIds.has(reply.id)) continue;

          await prisma.activityLog.create({
            data: {
              organizationId: ORG_ID,
              contactId: id,
              teamMemberId: teamMember.id,
              type: "email_received",
              subject: reply.subject || `Re: ${sent.subject}`,
              body: reply.bodyText || reply.snippet,
              fromEmail: reply.from,
              toEmail: reply.to || (auth.user.email ?? ""),
              gmailThreadId: sent.gmailThreadId,
              metadata: JSON.parse(JSON.stringify({
                gmailMessageId: reply.id,
                bodyHtml: reply.bodyHtml,
                hasHtml: reply.hasHtml,
                attachments: reply.attachments,
              })),
            },
          });
          knownMessageIds.add(reply.id);
          newReplies++;
        }
      } catch {
        // Non-fatal — skip threads that fail
      }
    }

    return NextResponse.json({ newReplies });
  } catch {
    return NextResponse.json({ error: "Failed to check replies" }, { status: 500 });
  }
}
