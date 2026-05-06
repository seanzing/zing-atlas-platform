import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const q = new URL(request.url).searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [contacts, onboardings, deals] = await Promise.all([
      prisma.contact.findMany({
        where: {
          organizationId: ORG_ID,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, email: true },
      }),
      prisma.onboarding.findMany({
        where: {
          organizationId: ORG_ID,
          deletedAt: null,
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { businessName: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, customerName: true, businessName: true },
      }),
      prisma.deal.findMany({
        where: {
          organizationId: ORG_ID,
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, contactName: true },
      }),
    ]);

    const results = [
      ...contacts.map((c) => ({
        type: "contact" as const,
        id: c.id,
        title: c.name,
        subtitle: c.email || "",
        url: `/contacts/${c.id}`,
      })),
      ...onboardings.map((o) => ({
        type: "onboarding" as const,
        id: o.id,
        title: o.customerName || "",
        subtitle: o.businessName || "",
        url: `/onboarding`,
      })),
      ...deals.map((d) => ({
        type: "deal" as const,
        id: d.id,
        title: d.title,
        subtitle: d.contactName || "",
        url: `/pipeline`,
      })),
    ];

    logger.info({ q, count: results.length }, "GET /api/search");
    return NextResponse.json({ results });
  } catch (error) {
    logger.error({ err: error }, "GET /api/search failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
