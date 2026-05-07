import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    // params must be awaited (Next.js 14 App Router)
    await params;

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const attachmentId = searchParams.get("attachmentId");
    const filename = searchParams.get("filename") || "attachment";
    const mimeType = searchParams.get("mimeType") || "application/octet-stream";

    if (!messageId || !attachmentId) {
      return NextResponse.json({ error: "messageId and attachmentId required" }, { status: 400 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
      select: { googleRefreshToken: true },
    });

    if (!teamMember?.googleRefreshToken) {
      return NextResponse.json({ error: "Google account not connected" }, { status: 503 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: teamMember.googleRefreshToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    const data = attachment.data.data;
    if (!data) {
      return NextResponse.json({ error: "Attachment data not found" }, { status: 404 });
    }

    // Gmail uses base64url encoding
    const buffer = Buffer.from(data, "base64url");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 });
  }
}
