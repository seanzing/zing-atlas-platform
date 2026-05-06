import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const member = await prisma.teamMember.findFirst({
      where: { supabaseUserId: auth.user.id, organizationId: ORG_ID },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ success: true });

    await prisma.notification.updateMany({
      where: { teamMemberId: member.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
