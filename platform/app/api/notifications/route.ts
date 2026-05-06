import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const member = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
      select: { id: true },
    });

    if (!member) return NextResponse.json({ notifications: [], unread: 0 });

    const notifications = await prisma.notification.findMany({
      where: { teamMemberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unread = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unread });
  } catch {
    return NextResponse.json({ notifications: [], unread: 0 });
  }
}
