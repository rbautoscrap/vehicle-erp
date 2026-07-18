import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, requireSession } from "@/lib/auth";
import { writeStore, toPublicUser } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  return NextResponse.json({ user: session });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const currentPassword = String(body.current_password || "");
    const newPassword = String(body.new_password || "");

    let error: string | null = null;
    let updated = null as ReturnType<typeof toPublicUser> | null;

    writeStore((store) => {
      const user = store.users.find((u) => u.id === session.id);
      if (!user) {
        error = "User not found.";
        return;
      }

      if (newPassword) {
        if (!currentPassword) {
          error = "Current password is required to change your password.";
          return;
        }
        if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
          error = "Current password is incorrect.";
          return;
        }
        if (newPassword.length < 6) {
          error = "New password must be at least 6 characters.";
          return;
        }
        user.password_hash = bcrypt.hashSync(newPassword, 10);
      }

      if (session.role === "admin") {
        const name = String(body.name ?? user.name).trim();
        const email = String(body.email ?? user.email).trim();
        const phone = String(body.phone ?? user.phone).trim();
        const company = String(body.company ?? user.company).trim();
        const address = String(body.address ?? user.address).trim();
        if (!name) {
          error = "Enter your name.";
          return;
        }
        user.name = name;
        user.email = email;
        user.phone = phone;
        user.company = company;
        user.address = address;
      } else {
        // Clients may only change address and password
        const address = String(body.address ?? "").trim();
        user.address = address;
      }

      updated = toPublicUser(user);
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
    }

    await createSession(updated);
    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("profile PATCH error", err);
    return NextResponse.json(
      { error: "An error occurred while saving the profile." },
      { status: 500 }
    );
  }
}
