import { NextResponse } from "next/server";
import { syncStripeToAR } from "@/lib/stripe-sync";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";

// Module-level last sync time (resets on restart — fine for Phase 1)
let lastSyncTime: string | null = null;

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const summary = await syncStripeToAR();
    lastSyncTime = new Date().toISOString();

    return NextResponse.json({
      ...summary,
      lastSyncTime,
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/ar/sync error");
    return NextResponse.json(
      { error: "Stripe sync failed" },
      { status: 500 }
    );
  }
}
