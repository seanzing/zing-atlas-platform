import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const templates = await prisma.emailTemplate.findMany({
      where: { organizationId: ORG_ID, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ templates: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { name, subject, body } = await request.json();
    if (!name || !subject || !body) {
      return NextResponse.json({ error: "name, subject, and body are required" }, { status: 400 });
    }

    const template = await prisma.emailTemplate.create({
      data: { organizationId: ORG_ID, name, subject, body },
    });

    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
