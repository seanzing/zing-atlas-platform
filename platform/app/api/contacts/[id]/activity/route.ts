import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const activity = await prisma.activityLog.findMany({
      where: { contactId: id, organizationId: ORG_ID },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ activity });
  } catch {
    return NextResponse.json({ activity: [] });
  }
}
