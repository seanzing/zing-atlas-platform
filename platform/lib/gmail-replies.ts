import { google } from "googleapis";

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  body: string;
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

    // Extract plain text body
    let body = "";
    const parts = msg.payload?.parts ?? [];
    const textPart = parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    } else if (msg.payload?.body?.data) {
      body = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
    }

    return {
      id: msg.id ?? "",
      threadId: msg.threadId ?? threadId,
      snippet: msg.snippet ?? "",
      from: getHeader("from"),
      subject: getHeader("subject"),
      date: getHeader("date"),
      body: body.trim(),
    };
  });

  return replies;
}
