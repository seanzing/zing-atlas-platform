import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    logger.error({ err: error }, "GET /api/products error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.description || body.price === undefined || body.price === null) {
      return NextResponse.json(
        { error: "description and price are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        ...body,
        organizationId: ORG_ID,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/products error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
