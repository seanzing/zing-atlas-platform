import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

// MIME types the browser can render inline natively
const INLINE_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "image/svg+xml", "image/bmp", "image/tiff",
  "application/pdf",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/webm",
  "text/plain", "text/csv",
]);

// Office MIME types that Google Docs Viewer can render
const OFFICE_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id: contactId } = await params;

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const attachmentId = searchParams.get("attachmentId");
    const filename = searchParams.get("filename") || "attachment";
    const mimeType = searchParams.get("mimeType") || "application/octet-stream";
    const mode = searchParams.get("mode") || "download"; // "view" or "download"

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

    // For Office docs in view mode — upload to Storage and redirect to Google Docs Viewer
    if (mode === "view" && OFFICE_TYPES.has(mimeType)) {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: teamMember.googleRefreshToken });
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const attachment = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: attachmentId,
      });

      const data = attachment.data.data;
      if (!data) return NextResponse.json({ error: "Attachment data not found" }, { status: 404 });

      const buffer = Buffer.from(data, "base64url");
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${contactId}/${messageId}/${safeName}`;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      // Upload to Supabase Storage
      const uploadRes = await fetch(
        `https://nxmvslehqxvvcfunimvx.supabase.co/storage/v1/object/email-images/${storagePath}`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": mimeType,
            "x-upsert": "true",
          },
          body: buffer,
        }
      );

      if (!uploadRes.ok) {
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      const publicUrl = `https://nxmvslehqxvvcfunimvx.supabase.co/storage/v1/object/public/email-images/${storagePath}`;
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`;

      // Redirect to Google Docs Viewer
      return NextResponse.redirect(viewerUrl);
    }

    // For all other types — fetch from Gmail and serve directly
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: teamMember.googleRefreshToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    const data = attachment.data.data;
    if (!data) return NextResponse.json({ error: "Attachment data not found" }, { status: 404 });

    const buffer = Buffer.from(data, "base64url");

    // Inline for natively renderable types in view mode, attachment otherwise
    const isInline = mode === "view" && INLINE_TYPES.has(mimeType);
    const disposition = isInline
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.length),
        // Allow browser to cache for 1 hour
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 });
  }
}


