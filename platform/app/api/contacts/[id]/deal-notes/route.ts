import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Returns all deal notes for every deal belonging to this contact.
// Used to surface pipeline department notes on the contact page.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    // Fetch all deals for this contact
    const deals = await prisma.deal.findMany({
      where: { contactId: id, organizationId: ORG_ID, deletedAt: null },
      select: { id: true, title: true },
    });

    if (!deals.length) return NextResponse.json([], { status: 200 });

    const dealIds = deals.map((d) => d.id);
    const dealTitleMap = Object.fromEntries(deals.map((d) => [d.id, d.title]));

    const notes = await prisma.dealNote.findMany({
      where: { dealId: { in: dealIds } },
      orderBy: { createdAt: "desc" },
    });

    const result = notes.map((n) => ({
      ...n,
      dealTitle: dealTitleMap[n.dealId] ?? "Unknown Deal",
    }));

    return NextResponse.json(serialize(result), { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "GET /api/contacts/[id]/deal-notes error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
