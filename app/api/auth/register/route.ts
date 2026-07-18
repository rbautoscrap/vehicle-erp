import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { writeStore, toPublicUser } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "Username, password, and name are required." },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username may only contain letters, numbers, and _." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (username.toLowerCase() === "admin") {
      return NextResponse.json(
        { error: "This username is not available." },
        { status: 400 }
      );
    }

    let created = null as ReturnType<typeof toPublicUser> | null;
    let duplicate = false;

    writeStore((store) => {
      if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        duplicate = true;
        return;
      }

      const user = {
        id: store.nextUserId++,
        username,
        password_hash: bcrypt.hashSync(password, 10),
        role: "user" as const,
        status: "pending" as const,
        name,
        email,
        phone,
        address: "",
        company: "",
        created_at: new Date().toISOString(),
      };
      store.users.push(user);
      created = toPublicUser(user);
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "This username is already taken." },
        { status: 409 }
      );
    }

    if (!created) {
      return NextResponse.json({ error: "Registration failed." }, { status: 500 });
    }

    // Do not create a session — admin must approve first
    return NextResponse.json(
      {
        user: created,
        pending: true,
        message:
          "Registration complete. You can sign in after an administrator approves your account.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json(
      { error: "An error occurred during registration." },
      { status: 500 }
    );
  }
}
