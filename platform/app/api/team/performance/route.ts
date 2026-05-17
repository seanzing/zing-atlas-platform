import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { calcDealCommission } from "@/lib/commission";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    const from = searchParams.get("from") || defaultFrom;
    const to = searchParams.get("to") || defaultTo;

    const teamMembers = await prisma.teamMember.findMany({
      where: { organizationId: ORG_ID, deletedAt: null },
      orderBy: { firstName: "asc" },
    });

    // Won deals in period with confirmed payment
    const wonDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        stage: "won",
        paymentStatus: "confirmed",
        deletedAt: null,
        wonDate: { gte: new Date(from), lte: new Date(to) },
      },
      include: { product: true },
    });

    // All-time won deals for live customer count (stripeCustomerId set = live in Stripe)
    const allWonDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        stage: "won",
        deletedAt: null,
        stripeCustomerId: { not: null },
      },
      select: { rep: true, stripeCustomerId: true },
    });

    const result = teamMembers.map((member) => {
      const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim().toLowerCase();

      // Match by full name (deals.rep stores full name e.g. "Elizabeth Adams")
      const repDeals = wonDeals.filter((d) => (d.rep || "").toLowerCase() === fullName);
      const liveCustomers = allWonDeals.filter((d) => (d.rep || "").toLowerCase() === fullName);

      let totalRevenue = 0;
      let subscriptionCommission = 0;
      let launchFeeCommission = 0;

      for (const deal of repDeals) {
        const dealValue = Number(deal.value || 0);
        totalRevenue += dealValue;
        const comm = calcDealCommission(
          { value: dealValue, launchFeeAmount: deal.launchFeeAmount ? Number(deal.launchFeeAmount) : null },
          deal.product
            ? {
                commissionType: deal.product.commissionType,
                commissionValue: deal.product.commissionValue ? Number(deal.product.commissionValue) : null,
                launchFeeCommissionRate: deal.product.launchFeeCommissionRate ? Number(deal.product.launchFeeCommissionRate) : null,
              }
            : null
        );
        subscriptionCommission += comm.subscriptionCommission;
        launchFeeCommission += comm.launchFeeCommission;
      }

      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        position: member.position,
        department: member.department,
        active: member.active,
        monthlyTarget: Number(member.monthlyTarget || 0),
        totalRevenue,
        subscriptionCommission,
        launchFeeCommission,
        totalCommission: subscriptionCommission + launchFeeCommission,
        dealCount: repDeals.length,
        liveCustomerCount: liveCustomers.length,
      };
    });

    return NextResponse.json(serialize(result));
  } catch (error) {
    logger.error({ err: error }, "GET /api/team/performance error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
