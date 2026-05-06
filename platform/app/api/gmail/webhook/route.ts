import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = body.message?.data;
    if (!data) return NextResponse.json({ ok: true });

    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
    const { emailAddress, historyId } = decoded;

    if (!emailAddress || !historyId) return NextResponse.json({ ok: true });

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        email: emailAddress,
        organizationId: ORG_ID,
        googleRefreshToken: { not: null },
      },
    });
    if (!teamMember?.googleRefreshToken) return NextResponse.json({ ok: true });

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: teamMember.googleRefreshToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const storedHistoryId = teamMember.gmailHistoryId;

    const historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId: storedHistoryId || String(parseInt(historyId) - 1),
      historyTypes: ["messageAdded"],
      labelId: "INBOX",
    });

    const addedMessages =
      historyRes.data.history?.flatMap((h) => h.messagesAdded ?? []) ?? [];

    // Update stored historyId
    await prisma.teamMember.update({
      where: { id: teamMember.id },
      data: { gmailHistoryId: historyId },
    });

    for (const { message } of addedMessages) {
      if (!message?.id || !message?.threadId) continue;

      // Check if this thread belongs to a tracked contact
      const activityEntry = await prisma.activityLog.findFirst({
        where: {
          gmailThreadId: message.threadId,
          organizationId: ORG_ID,
          type: "email_sent",
        },
        select: { contactId: true, subject: true },
      });

      if (!activityEntry?.contactId) continue;

      // Check for duplicate
      const existing = await prisma.activityLog.findFirst({
        where: {
          organizationId: ORG_ID,
          type: "email_received",
          metadata: { path: ["gmailMessageId"], equals: message.id },
        },
      });
      if (existing) continue;

      // Fetch full message
      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });
      const headers = fullMsg.data.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

      const from = getHeader("from");
      const to = getHeader("to");
      const subject = getHeader("subject");

      // Extract plain text body
      let bodyText = "";
      const parts = fullMsg.data.payload?.parts ?? [];
      const textPart = parts.find((p) => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, "base64").toString("utf-8");
      } else if (fullMsg.data.payload?.body?.data) {
        bodyText = Buffer.from(fullMsg.data.payload.body.data, "base64").toString("utf-8");
      }

      await prisma.activityLog.create({
        data: {
          organizationId: ORG_ID,
          contactId: activityEntry.contactId,
          teamMemberId: teamMember.id,
          type: "email_received",
          subject: subject || `Re: ${activityEntry.subject}`,
          body: bodyText,
          fromEmail: from,
          toEmail: to,
          gmailThreadId: message.threadId,
          metadata: { gmailMessageId: message.id },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Always return 200 to Pub/Sub to avoid retries
    return NextResponse.json({ ok: true });
  }
}
