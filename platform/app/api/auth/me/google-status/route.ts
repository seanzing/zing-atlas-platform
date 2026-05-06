import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ connected: false });
    }

    const member = await prisma.teamMember.findFirst({
      where: { organizationId: ORG_ID, email: session.user.email, deletedAt: null },
      select: { googleRefreshToken: true },
    });

    return NextResponse.json({ connected: !!member?.googleRefreshToken });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
