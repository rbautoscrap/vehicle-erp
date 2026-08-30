"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(d.user.role === "admin" ? "/admin" : "/");
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      router.replace(data.user?.role === "admin" ? "/admin" : "/");
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site-page">
      <PublicHeader />
      <div className="login-wrap site-signup">
        <form className="login-hero-panel form" onSubmit={onSubmit}>
          <h2>로그인</h2>
          <p className="login-hero-panel-desc">
            수출 경매 입찰 및 관리자 페이지 접속
          </p>
          <div className="field">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "로그인 중…" : "로그인"}
          </button>
          <p className="auth-switch">
            계정이 없으신가요? <Link href="/signup">회원가입</Link>
          </p>
          <p className="auth-contact">
            <a href="mailto:rbautoscrap@naver.com">rbautoscrap@naver.com</a>
          </p>
        </form>
      </div>
      <PublicFooter />
    </div>
  );
}
