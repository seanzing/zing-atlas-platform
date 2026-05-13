import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { contactId, type, subject, metadata } = body;

    if (!contactId || !type) {
      return NextResponse.json({ error: "contactId and type are required" }, { status: 400 });
    }

    const entry = await prisma.activityLog.create({
      data: {
        organizationId: ORG_ID,
        contactId,
        type,
        subject: subject ?? null,
        metadata: metadata ?? null,
      },
    });

    logger.info({ entryId: entry.id, contactId, type }, "POST /api/activity");
    return NextResponse.json({ id: entry.id }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "POST /api/activity failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
