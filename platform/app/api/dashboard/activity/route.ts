import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const activity = await prisma.activityLog.findMany({
      where: { organizationId: ORG_ID },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ activity });
  } catch {
    return NextResponse.json({ activity: [] });
  }
}
