"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PhoneInput } from "@/components/PhoneInput";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { digitsOnly } from "@/lib/phone";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    name: "",
    email: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          name: form.name,
          email: form.email,
          phone: digitsOnly(form.phone),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }
      setSuccess(
        data.message ||
          "가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다."
      );
      setTimeout(() => router.replace("/signin"), 2500);
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
        <form className="login-card form" onSubmit={onSubmit}>
          <h1>회원가입</h1>
          <p>가입 후 관리자 승인이 완료되어야 로그인할 수 있습니다.</p>

          <div className="field">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
            />
          </div>
          <div className="field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="phone">연락처</label>
            <PhoneInput
              id="phone"
              value={form.phone}
              onChange={(phone) => setForm((prev) => ({ ...prev, phone }))}
              autoComplete="tel"
              placeholder="01012345678"
            />
          </div>
          <div className="field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              id="passwordConfirm"
              type="password"
              value={form.passwordConfirm}
              onChange={(e) =>
                setForm({ ...form, passwordConfirm: e.target.value })
              }
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          {error && <p className="error">{error}</p>}
          {success && (
            <p style={{ margin: 0, color: "var(--accent)" }}>{success}</p>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !!success}
          >
            {loading ? "가입 중…" : "회원가입"}
          </button>

          <p className="auth-switch">
            이미 계정이 있으신가요? <Link href="/signin">로그인</Link>
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
