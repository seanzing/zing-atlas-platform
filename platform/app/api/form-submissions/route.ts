import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/api-auth";
import { ORG_ID } from "@/lib/constants";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { organizationId: ORG_ID, contactId },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(serialize(submissions));
  } catch (error) {
    logger.error({ err: error }, "GET /api/form-submissions error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Public POST -- no auth required (forms are publicly accessible)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, formName, formData } = body;

    if (!formName || !formData) {
      return NextResponse.json(
        { error: "formName and formData are required" },
        { status: 400 }
      );
    }

    const submission = await prisma.formSubmission.create({
      data: {
        organizationId: ORG_ID,
        contactId: contactId || null,
        formName,
        formData,
      },
    });

    return NextResponse.json(serialize(submission), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/form-submissions error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
