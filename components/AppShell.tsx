"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type SessionUser = {
  id: number;
  username: string;
  role: "admin" | "user";
  status: "pending" | "active" | "suspended";
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
};

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = "/login";
  }

  return { user, loading, logout, setUser };
}

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="app-shell">
        <p className="page-desc">Loading…</p>
      </div>
    );
  }

  const displayName = user.name || user.username;
  const isAdmin = user.role === "admin";

  return (
    <div className={`app-shell${isAdmin ? " app-shell-admin" : ""}`}>
      <header className="topbar">
        <Link href={isAdmin ? "/admin" : "/"} className="brand">
          {isAdmin && user.company ? user.company : "KOREA AUTO AUTION"}
        </Link>
        <div className="topbar-meta">
          <span className="topbar-user">
            {displayName}
            {isAdmin ? " · 관리자" : ""}
          </span>
          {isAdmin ? (
            <>
              <Link href="/admin" className="btn">
                관리
              </Link>
              <Link href="/admin/products/new" className="btn btn-primary">
                잔존물등록
              </Link>
              <Link href="/profile" className="btn">
                프로필
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="btn">
                Auctions
              </Link>
              <Link href="/my-wins" className="btn">
                My wins
              </Link>
              <Link href="/profile" className="btn">
                Profile
              </Link>
            </>
          )}
          <button type="button" className="btn btn-ghost" onClick={logout}>
            {isAdmin ? "로그아웃" : "Sign out"}
          </button>
        </div>
      </header>
      {title && <h1 className="page-title">{title}</h1>}
      {children}
    </div>
  );
}
