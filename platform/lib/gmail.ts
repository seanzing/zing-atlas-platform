import { google } from "googleapis";

/**
 * Send an email via Gmail API using a team member's stored OAuth refresh token.
 * Each team member connects their Google account once (Settings → Connect Google Account),
 * which stores their refresh token. This function uses that token to send as them.
 */
export async function sendGmailAs(
  fromEmail: string,
  to: string,
  subject: string,
  bodyHtml: string,
  refreshToken: string,
  options?: { threadId?: string; inReplyTo?: string }
): Promise<{ threadId: string | null }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const headers = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
  ];

  if (options?.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
    headers.push(`References: ${options.inReplyTo}`);
  }

  const raw = headers.join("\r\n") + "\r\n\r\n" +
    `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${bodyHtml}</div>`;

  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
      ...(options?.threadId ? { threadId: options.threadId } : {}),
    },
  });

  return { threadId: response.data.threadId ?? null };
}

/**
 * Exchange an OAuth authorization code for tokens.
 * Called from the /api/auth/google/callback route.
 */
export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  email: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned — user may need to revoke and reconnect");
  }

  // Get user email from token info
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  if (!tokens.access_token) throw new Error("No access token received from Google");
  if (!data.email) throw new Error("No email received from Google");

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    email: data.email,
  };
}

/**
 * Build the Google OAuth authorization URL for the connect flow.
 */
export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force consent screen to always get refresh_token
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}
