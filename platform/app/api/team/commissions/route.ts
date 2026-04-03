import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { calcDealCommission } from "@/lib/commission";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);

    // Default to current calendar month
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const from = searchParams.get("from") || defaultFrom;
    const to = searchParams.get("to") || defaultTo;

    // Fetch all team members
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        organizationId: ORG_ID,
        active: true,
        deletedAt: null,
      },
    });

    // Fetch all won deals in date range (only confirmed payments earn commission)
    const wonDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        stage: "won",
        paymentStatus: "confirmed",
        deletedAt: null,
        wonDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      include: {
        product: true,
      },
    });

    const result = teamMembers.map((member) => {
      const repDeals = wonDeals.filter(
        (d) =>
          d.rep?.toLowerCase() === member.firstName?.toLowerCase()
      );

      let totalRevenue = 0;
      let subscriptionCommission = 0;
      let launchFeeCommission = 0;

      for (const deal of repDeals) {
        const dealValue = Number(deal.value || 0);
        totalRevenue += dealValue;

        const comm = calcDealCommission(
          {
            value: dealValue,
            launchFeeAmount: deal.launchFeeAmount
              ? Number(deal.launchFeeAmount)
              : null,
          },
          deal.product
            ? {
                commissionType: deal.product.commissionType,
                commissionValue: deal.product.commissionValue
                  ? Number(deal.product.commissionValue)
                  : null,
                launchFeeCommissionRate: deal.product.launchFeeCommissionRate
                  ? Number(deal.product.launchFeeCommissionRate)
                  : null,
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
        role: member.role,
        monthlyTarget: Number(member.monthlyTarget || 0),
        totalRevenue,
        subscriptionCommission,
        launchFeeCommission,
        totalCommission: subscriptionCommission + launchFeeCommission,
        dealCount: repDeals.length,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "GET /api/team/commissions error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
