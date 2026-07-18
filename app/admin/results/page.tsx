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
        종료된 경매의 낙찰자·금액·처리 상태를 확인하고 수정할 수 있습니다.
      </p>

      {results.length === 0 ? (
        <div className="empty">종료된 경매가 없습니다.</div>
      ) : (
        <div className="stack">
          {results.map(({ auction: a, winner }) => (
            <div key={a.id} className="auction-row">
              <div className="auction-list-main">
                {a.photos?.[0] ? (
                  <img className="list-thumb" src={a.photos[0]} alt={a.vehicle_type} />
                ) : (
                  <div className="list-thumb list-thumb-empty">사진 없음</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="actions" style={{ justifyContent: "space-between" }}>
                    <h3>
                      {a.title || `${a.year} ${a.vehicle_type}`.trim()}
                    </h3>
                    <span className={`badge ${resultStatusBadge(a.result_status)}`}>
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
                      입찰이 없어 유찰 상태입니다.
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
                <Link href={`/admin/results/${a.id}`} className="btn btn-primary">
                  결과 확인/수정
                </Link>
                <Link href={`/admin/products/${a.id}/edit`} className="btn">
                  잔존물 편집
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
