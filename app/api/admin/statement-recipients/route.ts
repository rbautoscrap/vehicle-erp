import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listStatementRecipients, readStore } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  return NextResponse.json({ recipients: listStatementRecipients(store) });
}
