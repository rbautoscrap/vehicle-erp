"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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
        setError(data.error || "Sign-in failed");
        return;
      }
      router.replace(data.user?.role === "admin" ? "/admin" : "/");
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-hero">
      <div className="login-hero-bg" aria-hidden="true" />
      <div className="login-hero-veil" aria-hidden="true" />

      <div className="login-hero-frame">
        <section className="login-hero-copy">
          <p className="login-hero-brand">KOREA AUTO AUTION</p>
          <h1 className="login-hero-title">
            Your Gateway to Premium Salvage Vehicles.
          </h1>
          <p className="login-hero-lead">
            Connecting Global Buyers with Korea&apos;s Top Supply Networks.
          </p>
        </section>

        <form className="login-hero-panel form" onSubmit={onSubmit}>
          <h2>Sign in</h2>
          <p className="login-hero-panel-desc">
            Access live auctions and place bids.
          </p>

          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
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
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="auth-switch">
            Don&apos;t have an account? <Link href="/signup">Sign up</Link>
          </p>

          <p className="auth-contact">
            <a href="mailto:rbautoscrap@naver.com">rbautoscrap@naver.com</a>
          </p>
        </form>
      </div>
    </div>
  );
}
