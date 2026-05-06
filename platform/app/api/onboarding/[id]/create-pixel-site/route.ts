import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PIXEL_API_URL = "https://pixel.yourwebsiteexample.com/api/sites";
const PIXEL_SECRET = "zing-pixel-internal-2026";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const onboarding = await prisma.onboarding.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
      include: { items: true },
    });

    if (!onboarding) {
      return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    }

    const websiteItem = onboarding.items.find((i) => i.taskType === "website");
    if (!websiteItem) {
      return NextResponse.json({ error: "No website task found" }, { status: 400 });
    }

    // Call Pixel API to create site
    const pixelBody = {
      business_name: onboarding.businessName ?? "",
      slug: slugify(onboarding.businessName ?? "site"),
      owner_email: onboarding.email ?? "",
      owner_phone: onboarding.phone ?? "",
      existing_url: onboarding.existingUrl ?? "",
      atlasOnboardingId: id,
    };

    const pixelRes = await fetch(PIXEL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pixel-secret": PIXEL_SECRET,
      },
      body: JSON.stringify(pixelBody),
    });

    if (!pixelRes.ok) {
      const errText = await pixelRes.text().catch(() => "Unknown error");
      logger.error({ status: pixelRes.status, body: errText }, "Pixel API create-site failed");
      return NextResponse.json(
        { error: "Could not create site in Pixel. Try again or create manually." },
        { status: 502 }
      );
    }

    const pixelData = await pixelRes.json();
    const siteId = pixelData.siteId ?? pixelData.id ?? "";

    // Update the website OnboardingItem
    await prisma.onboardingItem.update({
      where: { id: websiteItem.id },
      data: {
        currentStatus: "in_progress",
        stage: "in_progress",
        notes: JSON.stringify({ pixelSiteId: siteId }),
      },
    });

    const pixelUrl = `https://pixel.yourwebsiteexample.com/dashboard/sites/${siteId}`;

    logger.info({ onboardingId: id, siteId }, "Pixel site created");
    return NextResponse.json(serialize({ siteId, pixelUrl }), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/onboarding/[id]/create-pixel-site failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
