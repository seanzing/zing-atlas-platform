import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  });
}
