import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readStore, toPublicUser, type PublicUser, type Role } from "./db";

const COOKIE = "auction_session";

function secret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-me"
  );
}

export type SessionUser = PublicUser;

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    company: user.company,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.id);
    if (!id) return null;

    const store = readStore();
    const user = store.users.find((u) => u.id === id);
    if (!user) return null;
    if (user.status === "suspended" || user.status === "pending") return null;
    return toPublicUser(user);
  } catch {
    return null;
  }
}

export async function requireSession(
  roles?: Role[]
): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }
  if (roles && !roles.includes(session.role)) {
    return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  }
  return session;
}

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

export function authenticate(
  username: string,
  password: string
): AuthResult {
  const store = readStore();
  const user = store.users.find((u) => u.username === username);
  if (!user) return { ok: false, error: "Invalid username or password." };
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return { ok: false, error: "Invalid username or password." };
  }
  if (user.status === "pending") {
    return {
      ok: false,
      error: "Your account is pending approval. Please wait for an administrator.",
    };
  }
  if (user.status === "suspended") {
    return {
      ok: false,
      error: "This account has been suspended. Contact an administrator.",
    };
  }
  return { ok: true, user: toPublicUser(user) };
}
