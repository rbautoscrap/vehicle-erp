"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { fuelTypeLabelEn, saleTypeLabelEn } from "@/lib/labels";

type LiveTeaser = {
  id: number;
  year: string;
  vehicle_type: string;
  fuel_type: string;
  sale_type: string;
  end_at: string;
  thumb: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<LiveTeaser[]>([]);
  const [totalLive, setTotalLive] = useState(0);
  const [liveLoading, setLiveLoading] = useState(true);
  const [gateHint, setGateHint] = useState("");

  const loadLive = useCallback(async () => {
    try {
      const res = await fetch("/api/public/live");
      if (!res.ok) return;
      const data = await res.json();
      setLive(Array.isArray(data.auctions) ? data.auctions : []);
      setTotalLive(Number(data.total_live) || 0);
    } catch {
      // keep previous list
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(d.user.role === "admin" ? "/admin" : "/");
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    loadLive();
    const id = setInterval(loadLive, 5000);
    return () => clearInterval(id);
  }, [loadLive]);

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

  function requireLogin() {
    setGateHint("Sign in to view details and place bids.");
    document.getElementById("login-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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

          <div className="login-live" aria-labelledby="login-live-title">
            <div className="login-live-head">
              <h2 id="login-live-title">Live now</h2>
              <span className="login-live-count">
                {liveLoading && live.length === 0
                  ? "…"
                  : `${totalLive} live`}
              </span>
            </div>
            <p className="login-live-note">Preview only · sign in for details</p>

            {liveLoading && live.length === 0 ? (
              <p className="login-live-empty">Loading…</p>
            ) : live.length === 0 ? (
              <p className="login-live-empty">No live auctions right now.</p>
            ) : (
              <ul className="login-live-list">
                {live.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="login-live-item"
                      onClick={requireLogin}
                    >
                      {a.thumb ? (
                        <img
                          className="login-live-thumb"
                          src={a.thumb}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="login-live-thumb login-live-thumb-empty">
                          —
                        </div>
                      )}
                      <div className="login-live-text">
                        <strong>
                          {a.year} {a.vehicle_type}
                        </strong>
                        <span className="login-live-meta">
                          {a.sale_type
                            ? saleTypeLabelEn(a.sale_type)
                            : "—"}
                          {" · "}
                          {fuelTypeLabelEn(a.fuel_type)}
                        </span>
                        <span className="login-live-ends">
                          Ends <Countdown endAt={a.end_at} />
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <form
          id="login-panel"
          className="login-hero-panel form"
          onSubmit={onSubmit}
        >
          <h2>Sign in</h2>
          <p className="login-hero-panel-desc">
            Access live auctions and place bids.
          </p>

          {gateHint && <p className="login-gate-hint">{gateHint}</p>}

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
