import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleCode } from "@/lib/gmail";
import { google } from "googleapis";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    logger.warn({ error }, "Google OAuth callback error");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?googleError=access_denied`
    );
  }

  try {
    // Get session to find which team member is connecting
    const supabase = createSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login`
      );
    }

    // Exchange code for tokens
    const { refreshToken, email: googleEmail } = await exchangeGoogleCode(code);

    // Store refresh token on the TeamMember record matched by their session email
    const updated = await prisma.teamMember.updateMany({
      where: {
        organizationId: ORG_ID,
        email: session.user.email,
        deletedAt: null,
      },
      data: { googleRefreshToken: refreshToken },
    });

    if (updated.count === 0) {
      logger.warn({ email: session.user.email }, "No TeamMember found to store Google token");
    } else {
      logger.info({ email: googleEmail }, "Google account connected for team member");

      // Set up Gmail Pub/Sub watch for real-time notifications
      const pubsubTopic = process.env.GMAIL_PUBSUB_TOPIC;
      if (pubsubTopic) {
        try {
          const clientId = process.env.GOOGLE_CLIENT_ID!;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
          const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
          oauth2Client.setCredentials({ refresh_token: refreshToken });
          const gmail = google.gmail({ version: "v1", auth: oauth2Client });

          const watchRes = await gmail.users.watch({
            userId: "me",
            requestBody: {
              topicName: pubsubTopic,
              labelIds: ["INBOX"],
            },
          });

          if (watchRes.data.historyId) {
            const member = await prisma.teamMember.findFirst({
              where: { email: session.user.email, organizationId: ORG_ID, deletedAt: null },
            });
            if (member) {
              await prisma.teamMember.update({
                where: { id: member.id },
                data: { gmailHistoryId: watchRes.data.historyId },
              });
            }
          }
        } catch (e) {
          logger.warn({ err: e }, "gmail.watch() failed — Pub/Sub not configured yet");
        }
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?googleConnected=true`
    );
  } catch (err) {
    logger.error({ err }, "Google OAuth callback failed");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?googleError=callback_failed`
    );
  }
}
