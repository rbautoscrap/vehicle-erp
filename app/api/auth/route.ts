import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession, getSession, clearSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({ user: session });
  } catch (err) {
    console.error("auth GET error", err);
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Enter your username and password." },
        { status: 400 }
      );
    }

    const result = authenticate(username, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    await createSession(result.user);
    return NextResponse.json({ user: result.user });
  } catch (err) {
    console.error("auth POST error", err);
    return NextResponse.json(
      { error: "An error occurred while signing in." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
