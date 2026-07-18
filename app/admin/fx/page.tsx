"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { formatWon } from "@/lib/format";

export default function AdminFxPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [usdKrw, setUsdKrw] = useState("");
  const [eurKrw, setEurKrw] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/admin/fx");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "환율을 불러오지 못했습니다.");
        return;
      }
      setUsdKrw(String(data.usd_krw ?? ""));
      setEurKrw(String(data.eur_krw ?? ""));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fx", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usd_krw: Number(usdKrw.replace(/,/g, "")),
          eur_krw: Number(eurKrw.replace(/,/g, "")),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      setUsdKrw(String(data.usd_krw));
      setEurKrw(String(data.eur_krw));
      setMessage(data.message || "저장되었습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  const usd = Number(usdKrw.replace(/,/g, ""));
  const eur = Number(eurKrw.replace(/,/g, ""));

  return (
    <AppShell title="관리자 · 환율">
      <AdminNav />
      <p className="page-desc">
        입찰 시 미화·유로화를 원화로 환산할 때 사용하는 환율입니다. 1 USD / 1 EUR = 원화
        금액으로 입력하세요.
      </p>

      <form className="form" onSubmit={onSave} style={{ maxWidth: 480 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem" }}>환율 설정</h2>
        {fetching ? (
          <p className="field-hint">불러오는 중…</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="usd_krw">1 USD → KRW</label>
              <input
                id="usd_krw"
                type="text"
                inputMode="numeric"
                value={usdKrw}
                onChange={(e) => setUsdKrw(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="예: 1350"
                required
              />
              {!Number.isNaN(usd) && usd > 0 && (
                <p className="field-hint">미리보기: 1 USD = {formatWon(usd)}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="eur_krw">1 EUR → KRW</label>
              <input
                id="eur_krw"
                type="text"
                inputMode="numeric"
                value={eurKrw}
                onChange={(e) => setEurKrw(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="예: 1450"
                required
              />
              {!Number.isNaN(eur) && eur > 0 && (
                <p className="field-hint">미리보기: 1 EUR = {formatWon(eur)}</p>
              )}
            </div>
            {error && <p className="error">{error}</p>}
            {message && <p className="bid-success">{message}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "저장 중…" : "환율 저장"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => load()}
                disabled={fetching || saving}
              >
                새로고침
              </button>
            </div>
          </>
        )}
      </form>
    </AppShell>
  );
}
