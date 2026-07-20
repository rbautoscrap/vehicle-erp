"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { formatDateTime, formatWon } from "@/lib/format";

type ResultRow = {
  auction: {
    id: number;
    title: string;
    vehicle_type: string;
    year: string;
    fuel_type: string;
    storage_location: string;
    sale_type: string;
    notes: string;
    result_memo: string;
    result_status: "pending" | "confirmed" | "unsold";
    photos: string[];
    start_price: number;
    end_at: string;
    highest_bid: number | null;
    bid_count: number;
  };
  winner: {
    user_id: number;
    username: string;
    name: string;
    phone: string;
    address: string;
    amount: number;
    bid_at: string;
  } | null;
};

function resultStatusLabel(status: string) {
  if (status === "confirmed") return "낙찰 확정";
  if (status === "unsold") return "유찰";
  return "결과 대기";
}

function resultStatusBadge(status: string) {
  if (status === "confirmed") return "badge-live";
  if (status === "unsold") return "badge-ended";
  return "badge-upcoming";
}

export default function AdminResultsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/results");
    if (res.ok) {
      const data = await res.json();
      setResults(data.results || []);
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

  async function patchResult(
    id: number,
    body: { result_status: "confirmed" | "unsold" },
    okMessage: string
  ) {
    setError("");
    setMessage("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "처리에 실패했습니다.");
        return;
      }
      setMessage(okMessage);
      await load();
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmWin(row: ResultRow) {
    const a = row.auction;
    const winner = row.winner;
    if (!winner) {
      setError("낙찰자가 없어 확정할 수 없습니다. 유찰 처리를 이용해 주세요.");
      return;
    }
    const label = a.title || `${a.year} ${a.vehicle_type}`.trim();
    if (
      !window.confirm(
        `「${label}」 낙찰 결과를 확정할까요?\n\n낙찰자: ${winner.name} (@${winner.username})\n금액: ${formatWon(winner.amount)}\n\n확정 후에만 해당 회원의 My wins에 표시됩니다.`
      )
    ) {
      return;
    }
    void patchResult(
      a.id,
      { result_status: "confirmed" },
      `낙찰 결과가 확정되었습니다. 낙찰자 화면에 매물이 표시됩니다.`
    );
  }

  function markUnsold(row: ResultRow) {
    const a = row.auction;
    const label = a.title || `${a.year} ${a.vehicle_type}`.trim();
    if (
      !window.confirm(
        `「${label}」을(를) 유찰 처리할까요?\n회원 화면에는 낙찰 결과가 표시되지 않습니다.`
      )
    ) {
      return;
    }
    void patchResult(a.id, { result_status: "unsold" }, "유찰로 처리되었습니다.");
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  return (
    <AppShell title="경매 결과">
      <AdminNav />
      <p className="page-desc">
        종료된 경매의 낙찰자·금액을 확인한 뒤 <strong>낙찰 결과 확정</strong>을
        눌러 주세요. 확정 전까지 회원은 결과를 볼 수 없으며, 확정 후 낙찰자의 My
        wins에 매물이 표시됩니다.
      </p>

      {error && <p className="error">{error}</p>}
      {message && (
        <p style={{ margin: "0 0 12px", color: "var(--accent)" }}>{message}</p>
      )}

      {results.length === 0 ? (
        <div className="empty">종료된 경매가 없습니다.</div>
      ) : (
        <div className="stack">
          {results.map((row) => {
            const a = row.auction;
            const winner = row.winner;
            const pending = a.result_status === "pending";
            const busy = busyId === a.id;
            return (
              <div key={a.id} className="auction-row">
                <div className="auction-list-main">
                  {a.photos?.[0] ? (
                    <img
                      className="list-thumb"
                      src={a.photos[0]}
                      alt={a.vehicle_type}
                    />
                  ) : (
                    <div className="list-thumb list-thumb-empty">사진 없음</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="actions"
                      style={{ justifyContent: "space-between" }}
                    >
                      <h3>{a.title || `${a.year} ${a.vehicle_type}`.trim()}</h3>
                      <span
                        className={`badge ${resultStatusBadge(a.result_status)}`}
                      >
                        {resultStatusLabel(a.result_status)}
                      </span>
                    </div>
                    <div
                      className="detail-price bid-amount"
                      style={{ margin: "8px 0 4px", fontSize: "1.25rem" }}
                    >
                      {winner ? formatWon(winner.amount) : "낙찰자 없음"}
                    </div>
                    <div className="auction-meta">
                      {a.sale_type && <span>{a.sale_type}</span>}
                      <span>{a.fuel_type}</span>
                      <span>입찰 {a.bid_count}건</span>
                      <span>종료 {formatDateTime(a.end_at)}</span>
                    </div>
                    {winner ? (
                      <div className="auction-meta" style={{ marginTop: 6 }}>
                        <span>
                          낙찰자 <strong>{winner.name}</strong> (
                          <span className="bid-user">@{winner.username}</span>)
                        </span>
                        {winner.phone && <span>{winner.phone}</span>}
                      </div>
                    ) : (
                      <p className="field-hint" style={{ marginTop: 6 }}>
                        입찰이 없어 유찰 처리할 수 있습니다.
                      </p>
                    )}
                    {pending && (
                      <p className="field-hint" style={{ marginTop: 6 }}>
                        회원에게는 아직 결과가 공개되지 않았습니다.
                      </p>
                    )}
                    {a.result_memo && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "var(--muted)",
                          fontSize: "0.88rem",
                        }}
                      >
                        메모: {a.result_memo}
                      </p>
                    )}
                  </div>
                </div>
                <div className="actions">
                  {pending && winner && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => confirmWin(row)}
                    >
                      {busy ? "처리 중…" : "낙찰 결과 확정"}
                    </button>
                  )}
                  {pending && (
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => markUnsold(row)}
                    >
                      유찰 처리
                    </button>
                  )}
                  <Link
                    href={`/admin/results/${a.id}`}
                    className={`btn${pending && winner ? "" : " btn-primary"}`}
                  >
                    결과 확인/수정
                  </Link>
                  <Link href={`/admin/products/${a.id}/edit`} className="btn">
                    잔존물 편집
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
