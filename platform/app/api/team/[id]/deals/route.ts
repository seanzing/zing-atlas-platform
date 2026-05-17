import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { calcDealCommission } from "@/lib/commission";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const defaultTo = now.toISOString().split("T")[0];
    const from = searchParams.get("from") || defaultFrom;
    const to = searchParams.get("to") || defaultTo;

    // Get team member
    const member = await prisma.teamMember.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });
    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();

    // Get all won deals attributed to this rep in the date range
    const deals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        stage: "won",
        deletedAt: null,
        rep: { equals: fullName, mode: "insensitive" },
        wonDate: { gte: new Date(from), lte: new Date(to) },
      },
      include: { product: true, contact: { select: { name: true } } },
      orderBy: { wonDate: "desc" },
    });

    const dealRows = deals.map((d) => {
      const dealValue = Number(d.value || 0);
      const launchFee = Number(d.launchFeeAmount || 0);
      const totalSale = dealValue + launchFee;

      const comm = calcDealCommission(
        { value: dealValue, launchFeeAmount: launchFee || null },
        d.product
          ? {
              commissionType: d.product.commissionType,
              commissionValue: d.product.commissionValue ? Number(d.product.commissionValue) : null,
              launchFeeCommissionRate: d.product.launchFeeCommissionRate ? Number(d.product.launchFeeCommissionRate) : null,
            }
          : null
      );

      const commissionPct = totalSale > 0 ? (comm.total / totalSale) * 100 : 0;

      // Status logic
      let status: "live" | "cancelled" | "pending" = "pending";
      if (d.stripeCustomerId && d.paymentStatus === "confirmed") status = "live";
      if (d.paymentStatus === "cancelled") status = "cancelled";

      return {
        id: d.id,
        contactId: d.contactId,
        customerName: d.contact?.name || d.contactName || "Unknown",
        wonDate: d.wonDate,
        status,
        productName: d.product?.description || d.title || "—",
        dealValue,
        launchFee,
        totalSale,
        subscriptionCommission: comm.subscriptionCommission,
        launchFeeCommission: comm.launchFeeCommission,
        totalCommission: comm.total,
        commissionPct,
        stripeCustomerId: d.stripeCustomerId,
        paymentStatus: d.paymentStatus,
      };
    });

    const summary = {
      totalRevenue: dealRows.reduce((s, d) => s + d.dealValue, 0),
      totalLaunchFees: dealRows.reduce((s, d) => s + d.launchFee, 0),
      totalCommission: dealRows.reduce((s, d) => s + d.totalCommission, 0),
      dealCount: dealRows.length,
    };

    return NextResponse.json(serialize({ member, deals: dealRows, summary }));
  } catch (error) {
    logger.error({ err: error }, "GET /api/team/[id]/deals error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
