import { google } from "googleapis";

interface GmailAttachment {
  name: string;
  size: number;
  mimeType: string;
  attachmentId: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  hasHtml: boolean;
  attachments: GmailAttachment[];
}

function walkParts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[],
  result: { text: string; html: string; attachments: GmailAttachment[] }
) {
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      result.text = Buffer.from(part.body.data, "base64").toString("utf-8");
    } else if (part.mimeType === "text/html" && part.body?.data) {
      result.html = Buffer.from(part.body.data, "base64").toString("utf-8");
    } else if (
      part.mimeType === "multipart/alternative" ||
      part.mimeType === "multipart/mixed" ||
      part.mimeType === "multipart/related"
    ) {
      if (part.parts) walkParts(part.parts, result);
    } else if (part.filename && part.body?.attachmentId) {
      result.attachments.push({
        name: part.filename,
        size: part.body.size || 0,
        mimeType: part.mimeType,
        attachmentId: part.body.attachmentId,
      });
    }
  }
}

export async function getThreadReplies(
  threadId: string,
  sentMessageSubject: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  supabaseServiceKey: string,
  contactId: string,
): Promise<GmailMessage[]> {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const messages = thread.data.messages ?? [];

  // Skip the first message (the one we sent), return the rest as replies
  const replyPromises = messages.slice(1).map(async (msg) => {
    const headers = msg.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    // Walk MIME tree for text, html, and attachments
    const result = { text: "", html: "", attachments: [] as GmailAttachment[] };
    const parts = msg.payload?.parts ?? [];

    if (parts.length > 0) {
      walkParts(parts, result);
    } else if (msg.payload?.body?.data) {
      // Single-part message (no multipart structure)
      if (msg.payload.mimeType === "text/html") {
        result.html = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
      } else {
        result.text = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
      }
    }

    // --- Inline image extraction + upload to Supabase Storage ---
    type InlinePart = { cid: string; mimeType: string; data?: string; attachmentId?: string };
    const inlineParts: InlinePart[] = [];

    const extractInlineParts = (mparts: any[]) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
      for (const part of mparts) {
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

    const allMsgParts = msg.payload?.parts ?? [];
    if (allMsgParts.length > 0) extractInlineParts(allMsgParts);

    // Fetch + upload each inline image, build cid→URL map
    const cidToUrl: Record<string, string> = {};
    for (const inline of inlineParts) {
      try {
        let imageData = inline.data;
        if (!imageData && inline.attachmentId) {
          const attRes = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: msg.id!,
            id: inline.attachmentId,
          });
          imageData = attRes.data.data ?? undefined;
        }
        if (!imageData) continue;

        const buffer = Buffer.from(imageData, 'base64url');
        const ext = inline.mimeType.split('/')[1]?.split('+')[0] ?? 'jpg';
        const safeCid = inline.cid.replace(/[^a-zA-Z0-9]/g, '_');
        const path = `${contactId}/${msg.id}/${safeCid}.${ext}`;

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/email-images/${path}`,
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
          cidToUrl[inline.cid] = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/email-images/${path}`;
        }
      } catch {
        // Non-fatal — image stays as cid: reference
      }
    }

    // Rewrite cid: references in HTML
    let processedHtml = result.html;
    for (const [cid, url] of Object.entries(cidToUrl)) {
      const escapedCid = cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedHtml = processedHtml.replace(new RegExp(`cid:${escapedCid}`, 'g'), url);
    }
    result.html = processedHtml;

    return {
      id: msg.id ?? "",
      threadId: msg.threadId ?? threadId,
      snippet: msg.snippet ?? "",
      from: getHeader("from"),
      to: getHeader("to"),
      subject: getHeader("subject"),
      date: getHeader("date"),
      bodyText: result.text.trim(),
      bodyHtml: result.html,
      hasHtml: result.html.length > 0,
      attachments: result.attachments,
    };
  });

  // Await all message processing (map callbacks are now async)
  const replies = await Promise.all(replyPromises);

  return replies;
}
