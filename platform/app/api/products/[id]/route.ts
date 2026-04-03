import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    logger.error({ err: error }, "GET /api/products/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Validate numeric fields
    if (body.price !== undefined && body.price !== null) {
      const numPrice = Number(body.price);
      if (isNaN(numPrice) || numPrice < 0) {
        return NextResponse.json({ error: "price must be a non-negative number" }, { status: 400 });
      }
    }
    if (body.commissionValue !== undefined && body.commissionValue !== null) {
      const numComm = Number(body.commissionValue);
      if (isNaN(numComm) || numComm < 0) {
        return NextResponse.json({ error: "commissionValue must be a non-negative number" }, { status: 400 });
      }
    }
    if (body.launchFeeCommissionRate !== undefined && body.launchFeeCommissionRate !== null) {
      const numRate = Number(body.launchFeeCommissionRate);
      if (isNaN(numRate) || numRate < 0 || numRate > 1) {
        return NextResponse.json({ error: "launchFeeCommissionRate must be between 0 and 1" }, { status: 400 });
      }
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields: Record<string, unknown> = {};
    const whitelist = ["description", "price", "category", "commissionType", "commissionValue", "launchFeeCommissionRate"];
    for (const key of whitelist) {
      if (key in body) allowedFields[key] = body[key];
    }

    const product = await prisma.product.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json(product);
  } catch (error) {
    logger.error({ err: error }, "PUT /api/products/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(product);
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/products/[id] error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
