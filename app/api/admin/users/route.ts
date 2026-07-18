import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readStore, toAdminUserView } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const users = store.users
    .map(toAdminUserView)
    .sort((a, b) => {
      const rank = (s: string) =>
        s === "pending" ? 0 : s === "active" ? 1 : 2;
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return a.username.localeCompare(b.username);
    });

  return NextResponse.json({ users });
}
