"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
        if (d.user) router.replace("/");
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.passwordConfirm) {
      setError("Password confirmation does not match.");
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
          phone: form.phone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign-up failed.");
        return;
      }
      setSuccess(
        data.message ||
          "Registration complete. You can sign in after an administrator approves your account."
      );
      setTimeout(() => router.replace("/login"), 2500);
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card form" onSubmit={onSubmit}>
        <h1>Sign up</h1>
        <p>After registration, an administrator must approve your account before you can sign in.</p>

        <div className="field">
          <label htmlFor="username">Username</label>
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
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
            placeholder="010-0000-0000"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
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
          <label htmlFor="passwordConfirm">Confirm password</label>
          <input
            id="passwordConfirm"
            type="password"
            value={form.passwordConfirm}
            onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p style={{ margin: 0, color: "var(--accent)" }}>{success}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading || !!success}>
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>

        <p className="auth-contact">
          <a href="mailto:rbautoscrap@naver.com">rbautoscrap@naver.com</a>
        </p>
      </form>
    </div>
  );
}
