import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readStore } from "@/lib/db";
import {
  buildMemberAnalytics,
  memberAnalyticsOverview,
} from "@/lib/memberAnalytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const members = buildMemberAnalytics(store);
  const overview = memberAnalyticsOverview(members);

  return NextResponse.json({
    overview,
    members,
    generated_at: new Date().toISOString(),
  });
}
