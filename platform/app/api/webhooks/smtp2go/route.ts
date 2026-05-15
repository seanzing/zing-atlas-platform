import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// SMTP2GO delivery event webhook
// Configure in SMTP2GO dashboard: Sending > Webhook URLs
// URL: https://zing-atlas-platform-production.up.railway.app/api/webhooks/smtp2go
//
// Events received: delivered, opened, clicked, bounced, spam, unsubscribed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // SMTP2GO sends an array of events
    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const messageId = event.email_id ?? event.message_id ?? event.request_id;
      const eventType = event.event ?? event.type;

      if (!messageId || !eventType) continue;

      // Map SMTP2GO event to a delivery status
      const statusMap: Record<string, string> = {
        delivered:    "delivered",
        opened:       "opened",
        clicked:      "clicked",
        bounced:      "bounced",
        hard_bounced: "bounced",
        soft_bounced: "bounced",
        spam:         "spam",
        unsubscribed: "unsubscribed",
      };
      const deliveryStatus = statusMap[eventType] ?? eventType;

      // Find the ActivityLog entry by smtp2goMessageId stored in metadata
      // Prisma JSON filtering: metadata->>'smtp2goMessageId' = messageId
      const entries = await prisma.activityLog.findMany({
        where: {
          type: "email_sent",
          metadata: { path: ["smtp2goMessageId"], equals: messageId },
        },
        take: 1,
      });

      if (!entries.length) {
        logger.warn({ messageId, eventType }, "SMTP2GO webhook: no matching ActivityLog found");
        continue;
      }

      const entry = entries[0];
      const existingMeta = (entry.metadata as Record<string, unknown>) ?? {};

      // Only upgrade status — don't downgrade (e.g. opened > delivered)
      const statusRank: Record<string, number> = {
        failed: 0, sent: 1, delivered: 2, opened: 3, clicked: 4,
        bounced: 2, spam: 2, unsubscribed: 2,
      };
      const currentRank = statusRank[existingMeta.deliveryStatus as string ?? "sent"] ?? 0;
      const newRank = statusRank[deliveryStatus] ?? 0;
      const updatedStatus = newRank > currentRank ? deliveryStatus : existingMeta.deliveryStatus;

      const timestampKey = `${deliveryStatus}At`;
      await prisma.activityLog.update({
        where: { id: entry.id },
        data: {
          metadata: {
            ...existingMeta,
            deliveryStatus: updatedStatus,
            [timestampKey]: new Date().toISOString(),
          },
        },
      });

      logger.info({ messageId, eventType, deliveryStatus, activityId: entry.id }, "SMTP2GO webhook processed");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "SMTP2GO webhook handler failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
