import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const notes = await prisma.dealNote.findMany({
      where: { dealId: id },
      orderBy: { createdAt: "asc" },
    });

    // Group by department with counts
    const grouped: Record<string, { count: number; notes: typeof notes }> = {};
    for (const note of notes) {
      if (!grouped[note.department]) {
        grouped[note.department] = { count: 0, notes: [] };
      }
      grouped[note.department].count++;
      grouped[note.department].notes.push(note);
    }

    return NextResponse.json(serialize({ notes, grouped }));
  } catch (error) {
    logger.error({ err: error }, "GET /api/deals/[id]/notes failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await req.json();

    if (!body.department || !body.content) {
      return NextResponse.json({ error: "department and content are required" }, { status: 400 });
    }

    // Look up author name
    const teamMember = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
    });
    const authorName = teamMember
      ? `${teamMember.firstName ?? ""} ${teamMember.lastName ?? ""}`.trim()
      : undefined;

    const note = await prisma.dealNote.create({
      data: {
        dealId: id,
        department: body.department,
        content: body.content,
        author: authorName || undefined,
      },
    });

    // Cross-reference: write ContactActivity if deal has a contact
    const deal = await prisma.deal.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });
    if (deal?.contactId) {
      await prisma.activityLog.create({
        data: {
          organizationId: ORG_ID,
          contactId: deal.contactId,
          type: "note",
          subject: `Deal note added [${body.department}]`,
          body: body.content,
          metadata: { dealId: id, department: body.department, noteId: note.id },
        },
      });
    }

    logger.info({ noteId: note.id, dealId: id }, "POST /api/deals/[id]/notes");
    return NextResponse.json(serialize(note), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/deals/[id]/notes failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
