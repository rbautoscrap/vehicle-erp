import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth";
import { writeStore, toAdminUserView, type Role, type UserStatus } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nextStatus = body.status as UserStatus | undefined;
  const nextRole = body.role as Role | undefined;

  if (
    nextStatus &&
    nextStatus !== "active" &&
    nextStatus !== "suspended" &&
    nextStatus !== "pending"
  ) {
    return NextResponse.json({ error: "잘못된 상태입니다." }, { status: 400 });
  }
  if (nextRole && nextRole !== "admin" && nextRole !== "user") {
    return NextResponse.json({ error: "잘못된 권한입니다." }, { status: 400 });
  }

  const outcome: {
    error: string | null;
    updated: ReturnType<typeof toAdminUserView> | null;
  } = { error: null, updated: null };

  writeStore((store) => {
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      outcome.error = "사용자를 찾을 수 없습니다.";
      return;
    }

    if (user.id === session.id) {
      if (nextStatus === "suspended" || nextStatus === "pending") {
        outcome.error = "본인 계정은 정지하거나 대기로 변경할 수 없습니다.";
        return;
      }
      if (nextRole === "user") {
        outcome.error = "본인의 관리자 권한은 해제할 수 없습니다.";
        return;
      }
    }

    if (user.role === "admin" && nextRole === "user") {
      const adminCount = store.users.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        outcome.error = "관리자 계정은 최소 1명 이상 필요합니다.";
        return;
      }
    }

    if (hasOwn(body, "username")) {
      const username = String(body.username ?? "")
        .trim()
        .toLowerCase();
      if (!username) {
        outcome.error = "아이디를 입력하세요.";
        return;
      }
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        outcome.error =
          "아이디는 3–32자의 영문 소문자, 숫자, . _ - 만 사용할 수 있습니다.";
        return;
      }
      const taken = store.users.some(
        (u) => u.id !== user.id && u.username.toLowerCase() === username
      );
      if (taken) {
        outcome.error = "이미 사용 중인 아이디입니다.";
        return;
      }
      user.username = username;
    }

    if (hasOwn(body, "name")) {
      const name = String(body.name ?? "").trim();
      if (!name) {
        outcome.error = "이름을 입력하세요.";
        return;
      }
      user.name = name;
    }

    if (hasOwn(body, "email")) {
      const email = String(body.email ?? "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        outcome.error = "이메일 형식이 올바르지 않습니다.";
        return;
      }
      user.email = email;
    }

    if (hasOwn(body, "phone")) {
      user.phone = String(body.phone ?? "").trim();
    }

    if (hasOwn(body, "address")) {
      user.address = String(body.address ?? "").trim();
    }

    if (hasOwn(body, "company")) {
      user.company = String(body.company ?? "").trim();
    }

    if (hasOwn(body, "new_password")) {
      const newPassword = String(body.new_password ?? "");
      if (newPassword) {
        if (newPassword.length < 6) {
          outcome.error = "새 비밀번호는 6자 이상이어야 합니다.";
          return;
        }
        user.password_hash = bcrypt.hashSync(newPassword, 10);
      }
    }

    if (nextStatus) user.status = nextStatus;
    if (nextRole) user.role = nextRole;

    outcome.updated = toAdminUserView(user);
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  return NextResponse.json({ user: outcome.updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      outcome.error = "사용자를 찾을 수 없습니다.";
      return;
    }

    if (user.id === session.id) {
      outcome.error = "본인 계정은 삭제할 수 없습니다.";
      return;
    }

    if (user.role === "admin") {
      const adminCount = store.users.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        outcome.error = "관리자 계정은 최소 1명 이상 필요합니다.";
        return;
      }
    }

    store.users = store.users.filter((u) => u.id !== userId);
    store.bids = store.bids.filter((b) => b.user_id !== userId);
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
