import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const notes = await prisma.contactNote.findMany({
      where: {
        contactId: id,
        organizationId: ORG_ID,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(serialize(notes), { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "GET /api/contacts/[id]/notes error");
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    if (!body?.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json(
        { error: "Note body is required" },
        { status: 400 }
      );
    }

    const note = await prisma.contactNote.create({
      data: {
        contactId: id,
        organizationId: ORG_ID,
        body: body.body.trim(),
      },
    });

    return NextResponse.json(serialize(note), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/contacts/[id]/notes error");
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
