import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

function getDefaultRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const repParam = searchParams.get("rep");

    const defaults = getDefaultRange();
    const from = fromParam ? new Date(fromParam) : defaults.from;
    const to = toParam ? new Date(toParam) : defaults.to;

    const toEndOfDay = new Date(to);
    toEndOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      organizationId: ORG_ID,
      deletedAt: null,
    };

    // Filter by date range: include deals whose dueDate falls in range,
    // OR deals with no dueDate (include them regardless), but scope by createdAt if no dueDate.
    // Strategy: include deal if (dueDate in range) OR (dueDate is null AND createdAt in range)
    if (fromParam || toParam) {
      where.OR = [
        {
          dueDate: {
            gte: from,
            lte: toEndOfDay,
          },
        },
        {
          dueDate: null,
          createdAt: {
            gte: from,
            lte: toEndOfDay,
          },
        },
      ];
    }

    if (repParam) {
      where.rep = repParam;
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: true,
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(deals);
  } catch (err) {
    logger.error({ err }, "GET /api/pipeline error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
