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
  clientSecret: string
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
  const replies = messages.slice(1).map((msg) => {
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

  return replies;
}
