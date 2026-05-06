import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const item = await prisma.onboardingItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Merge into existing notes JSON, preserving all fields
    let existing: Record<string, unknown> = {};
    if (item.notes) {
      try { existing = JSON.parse(item.notes); } catch { /* ignore */ }
    }
    // Support legacy { note } field as userNote
    const toMerge = "note" in body && !("userNote" in body)
      ? { ...body, userNote: body.note }
      : body;
    delete toMerge.note;
    const merged = JSON.stringify({ ...existing, ...toMerge });
    const updated = await prisma.onboardingItem.update({
      where: { id },
      data: { notes: merged },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
