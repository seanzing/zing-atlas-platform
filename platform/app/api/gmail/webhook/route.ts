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

      // Extract plain text and HTML body
      let bodyText = "";
      let bodyHtml = "";
      const parts = fullMsg.data.payload?.parts ?? [];

      const walkPartsWebhook = (wparts: any[]) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
        for (const part of wparts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyText = Buffer.from(part.body.data, "base64").toString("utf-8");
          } else if (part.mimeType === "text/html" && part.body?.data) {
            bodyHtml = Buffer.from(part.body.data, "base64").toString("utf-8");
          } else if (part.parts) {
            walkPartsWebhook(part.parts);
          }
        }
      }

      if (parts.length > 0) {
        walkPartsWebhook(parts);
      } else if (fullMsg.data.payload?.body?.data) {
        if (fullMsg.data.payload.mimeType === "text/html") {
          bodyHtml = Buffer.from(fullMsg.data.payload.body.data, "base64").toString("utf-8");
        } else {
          bodyText = Buffer.from(fullMsg.data.payload.body.data, "base64").toString("utf-8");
        }
      }

      // --- Inline image extraction + upload to Supabase Storage ---
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      type InlinePart = { cid: string; mimeType: string; data?: string; attachmentId?: string };
      const inlineParts: InlinePart[] = [];

      const extractInlineParts = (iparts: any[]) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
        for (const part of iparts) {
          const hdrs = part.headers ?? [];
          const contentId = hdrs.find((h: any) => h.name?.toLowerCase() === 'content-id')?.value as string | undefined;  // eslint-disable-line @typescript-eslint/no-explicit-any
          const disposition = hdrs.find((h: any) => h.name?.toLowerCase() === 'content-disposition')?.value as string | undefined;  // eslint-disable-line @typescript-eslint/no-explicit-any
          if (contentId && !disposition?.toLowerCase().includes('attachment') && part.mimeType?.startsWith('image/')) {
            const cleanCid = contentId.replace(/[<>]/g, '').trim();
            inlineParts.push({
              cid: cleanCid,
              mimeType: part.mimeType,
              data: part.body?.data,
              attachmentId: part.body?.attachmentId,
            });
          }
          if (part.parts) extractInlineParts(part.parts);
        }
      }

      if (parts.length > 0) extractInlineParts(parts);

      const cidToUrl: Record<string, string> = {};
      for (const inline of inlineParts) {
        try {
          let imageData = inline.data;
          if (!imageData && inline.attachmentId) {
            const attRes = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: message.id!,
              id: inline.attachmentId,
            });
            imageData = attRes.data.data ?? undefined;
          }
          if (!imageData) continue;

          const buffer = Buffer.from(imageData, 'base64url');
          const ext = inline.mimeType.split('/')[1]?.split('+')[0] ?? 'jpg';
          const safeCid = inline.cid.replace(/[^a-zA-Z0-9]/g, '_');
          const path = `${activityEntry.contactId}/${message.id}/${safeCid}.${ext}`;

          const uploadRes = await fetch(
            `https://nxmvslehqxvvcfunimvx.supabase.co/storage/v1/object/email-images/${path}`,
            {
              method: 'POST',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': inline.mimeType,
                'x-upsert': 'true',
              },
              body: buffer,
            }
          );

          if (uploadRes.ok) {
            cidToUrl[inline.cid] = `https://nxmvslehqxvvcfunimvx.supabase.co/storage/v1/object/public/email-images/${path}`;
          }
        } catch {
          // Non-fatal
        }
      }

      // Rewrite cid: references in HTML
      for (const [cid, url] of Object.entries(cidToUrl)) {
        const escapedCid = cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        bodyHtml = bodyHtml.replace(new RegExp(`cid:${escapedCid}`, 'g'), url);
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
          metadata: JSON.parse(JSON.stringify({
            gmailMessageId: message.id,
            bodyHtml: bodyHtml || undefined,
            hasHtml: bodyHtml.length > 0,
          })),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Always return 200 to Pub/Sub to avoid retries
    return NextResponse.json({ ok: true });
  }
}
