import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface EmailMessage {
  id: string;
  type: "email_sent" | "email_received";
  subject: string | null;
  body: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

interface EmailThread {
  gmailThreadId: string;
  subject: string;
  messageCount: number;
  lastMessageAt: string;
  participants: string[];
  messages: EmailMessage[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const allActivity = await prisma.activityLog.findMany({
      where: { contactId: id, organizationId: ORG_ID },
      orderBy: { createdAt: "asc" },
    });

    // Split into email (threaded) vs other activity
    const emailEntries = allActivity.filter(
      (a) => (a.type === "email_sent" || a.type === "email_received") && a.gmailThreadId
    );
    const standaloneEntries = allActivity.filter(
      (a) => !(a.type === "email_sent" || a.type === "email_received") || !a.gmailThreadId
    );

    // Group emails by gmailThreadId
    const threadMap = new Map<string, typeof emailEntries>();
    for (const entry of emailEntries) {
      const tid = entry.gmailThreadId!;
      if (!threadMap.has(tid)) threadMap.set(tid, []);
      threadMap.get(tid)!.push(entry);
    }

    // Build thread objects
    const threads: EmailThread[] = Array.from(threadMap.entries()).map(([tid, msgs]) => {
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const lastMessage = sorted[sorted.length - 1];

      const participantSet = new Set<string>();
      for (const m of sorted) {
        if (m.fromEmail) participantSet.add(m.fromEmail);
        if (m.toEmail) participantSet.add(m.toEmail);
      }

      return {
        gmailThreadId: tid,
        subject: sorted[0].subject || "(no subject)",
        messageCount: sorted.length,
        lastMessageAt: lastMessage.createdAt.toISOString(),
        participants: Array.from(participantSet),
        messages: sorted.map((m) => ({
          id: m.id,
          type: m.type as "email_sent" | "email_received",
          subject: m.subject,
          body: m.body,
          fromEmail: m.fromEmail,
          toEmail: m.toEmail,
          createdAt: m.createdAt.toISOString(),
          metadata: m.metadata as Record<string, unknown> | null,
        })),
      };
    });

    // Sort threads by most recent message desc
    threads.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return NextResponse.json({
      threads,
      standalone: standaloneEntries.map((e) => ({
        id: e.id,
        type: e.type,
        subject: e.subject,
        body: e.body,
        fromEmail: e.fromEmail,
        toEmail: e.toEmail,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ threads: [], standalone: [] });
  }
}
