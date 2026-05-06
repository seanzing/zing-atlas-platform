import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-webhook-secret");
    if (!secret || secret !== process.env.PIXEL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { event, siteId, atlasOnboardingId, liveUrl } = await request.json();

    if (event === "site_deployed_live" && atlasOnboardingId) {
      const onboarding = await prisma.onboarding.findFirst({
        where: { id: atlasOnboardingId, organizationId: ORG_ID, deletedAt: null },
      });

      if (!onboarding) {
        logger.warn({ atlasOnboardingId }, "Pixel webhook: onboarding not found");
        return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
      }

      await prisma.onboarding.update({
        where: { id: atlasOnboardingId },
        data: { websiteStatus: "published" },
      });

      // Log to activity
      await prisma.activityLog.create({
        data: {
          organizationId: ORG_ID,
          onboardingId: atlasOnboardingId,
          type: "site_deployed",
          subject: "Website deployed to production",
          metadata: { siteId, liveUrl: liveUrl ?? "", source: "pixel_webhook" },
        },
      });

      logger.info({ atlasOnboardingId, siteId }, "Pixel webhook: site marked published");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, "Pixel webhook error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
