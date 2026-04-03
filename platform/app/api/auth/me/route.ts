import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = session.user.email;
    if (!email) {
      return NextResponse.json({ error: "No email on session" }, { status: 401 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        organizationId: ORG_ID,
        email,
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true,
      },
    });

    return NextResponse.json({
      email,
      teamMember: teamMember
        ? {
            id: teamMember.id,
            firstName: teamMember.firstName,
            lastName: teamMember.lastName,
            role: teamMember.role,
          }
        : null,
      isAdmin: teamMember?.role === "Admin",
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/auth/me error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
