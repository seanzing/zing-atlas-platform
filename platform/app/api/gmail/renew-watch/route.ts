import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("authorization")?.replace("Bearer ", "");
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    if (!topicName) {
      return NextResponse.json({ error: "GMAIL_PUBSUB_TOPIC not configured" }, { status: 503 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    const members = await prisma.teamMember.findMany({
      where: {
        organizationId: ORG_ID,
        googleRefreshToken: { not: null },
        deletedAt: null,
      },
    });

    let renewed = 0;
    for (const member of members) {
      try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: member.googleRefreshToken! });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const watchRes = await gmail.users.watch({
          userId: "me",
          requestBody: {
            topicName,
            labelIds: ["INBOX"],
          },
        });

        if (watchRes.data.historyId) {
          await prisma.teamMember.update({
            where: { id: member.id },
            data: { gmailHistoryId: watchRes.data.historyId },
          });
        }

        renewed++;
      } catch {
        // Skip members that fail
      }
    }

    return NextResponse.json({ renewed });
  } catch {
    return NextResponse.json({ error: "Failed to renew watches" }, { status: 500 });
  }
}
