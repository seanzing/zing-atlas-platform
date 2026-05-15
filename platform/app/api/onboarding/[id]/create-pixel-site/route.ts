import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PIXEL_API_URL = "https://pixel.yourwebsiteexample.com/api/sites";
const PIXEL_SECRET = process.env.PIXEL_API_SECRET || "";

function generateSiteId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
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
    // Attempt site creation with a random ID, retrying on conflict (CF Pages project names are globally unique)
    let pixelData: Record<string, string> | null = null;
    let lastError = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const siteIdCandidate = generateSiteId();
      const pixelBody = {
        id: siteIdCandidate,
        business_name: onboarding.businessName ?? "",
        owner_email: onboarding.email ?? "",
        phone: onboarding.phone ?? "",
        address: onboarding.existingUrl ?? "",
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

      if (pixelRes.ok) {
        pixelData = await pixelRes.json();
        break;
      }

      const errText = await pixelRes.text().catch(() => "Unknown error");
      lastError = errText;

      // Only retry on conflict (409) — fail fast on other errors
      if (pixelRes.status !== 409) {
        logger.error({ status: pixelRes.status, body: errText }, "Pixel API create-site failed");
        return NextResponse.json(
          { error: "Could not create site in Pixel. Try again or create manually." },
          { status: 502 }
        );
      }

      logger.warn({ attempt, siteIdCandidate }, "Site ID conflict, retrying with new ID");
    }

    if (!pixelData) {
      logger.error({ lastError }, "Pixel API: exhausted retries on ID conflict");
      return NextResponse.json(
        { error: "Could not generate a unique site ID. Please try again." },
        { status: 502 }
      );
    }

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
