"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { Countdown } from "@/components/Countdown";
import { formatDateTime, formatWon } from "@/lib/format";
import { formatBidWithCurrency } from "@/lib/currency";
import type { AdminAuction } from "@/lib/admin";

type LiveBid = {
  id: number;
  amount: number;
  currency?: string;
  amount_input?: number;
  created_at: string;
  username: string;
  name: string;
};

type LiveItem = {
  auction: AdminAuction;
  bids: LiveBid[];
};

export default function AdminLivePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [items, setItems] = useState<LiveItem[]>([]);
  const [selectedBid, setSelectedBid] = useState<Record<number, number>>({});
  const [memo, setMemo] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/live");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [user, load]);

  // Default-select highest bid when a live auction first appears
  useEffect(() => {
    setSelectedBid((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const { auction, bids } of items) {
        if (auction.status !== "live" || bids.length === 0) continue;
        if (next[auction.id] == null) {
          next[auction.id] = bids[0].id;
          changed = true;
        } else if (!bids.some((b) => b.id === next[auction.id])) {
          next[auction.id] = bids[0].id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  async function finalize(
    auctionId: number,
    resultStatus: "confirmed" | "unsold"
  ) {
    setError("");
    setMessage("");

    const item = items.find((i) => i.auction.id === auctionId);
    if (!item || item.auction.status !== "live") return;

    const winnerBidId =
      resultStatus === "confirmed" ? selectedBid[auctionId] : null;

    if (resultStatus === "confirmed") {
      if (!winnerBidId) {
        setError("낙찰자를 선택하세요.");
        return;
      }
      const bid = item.bids.find((b) => b.id === winnerBidId);
      const label = bid
        ? `${bid.name} (@${bid.username}) · ${formatBidWithCurrency(bid)}`
        : "";
      if (
        !window.confirm(
          `선택 입찰자를 낙찰 확정하고 경매를 즉시 종료할까요?\n\n${label}`
        )
      ) {
        return;
      }
    } else if (
      !window.confirm("유찰로 처리하고 경매를 즉시 종료할까요?")
    ) {
      return;
    }

    setBusyId(auctionId);
    try {
      const res = await fetch(`/api/admin/live/${auctionId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result_status: resultStatus,
          winner_bid_id: winnerBidId,
          result_memo: memo[auctionId] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "처리에 실패했습니다.");
        return;
      }
      setMessage(data.message || "처리되었습니다.");
      await load();
      router.push(`/admin/results/${auctionId}`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  const liveCount = items.filter((i) => i.auction.status === "live").length;

  return (
    <AppShell title="진행 중 경매">
      <AdminNav />
      <div className="actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <p className="page-desc" style={{ margin: 0 }}>
          실시간 입찰 현황입니다. 종료 전이라도 낙찰자를 선택해 확정·종료할 수 있습니다.
        </p>
        <span className="badge badge-live">진행중 {liveCount}건</span>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="bid-success">{message}</p>}

      {items.length === 0 ? (
        <div className="empty">진행 중이거나 대기 중인 경매가 없습니다.</div>
      ) : (
        <div className="stack">
          {items.map(({ auction: a, bids }) => (
            <div key={a.id} className="auction-row live-card">
              <div className="actions" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {a.year} {a.vehicle_type || a.title}
                  </h3>
                  <div className="auction-meta" style={{ marginTop: 6 }}>
                    <span
                      className={`badge ${
                        a.status === "live" ? "badge-live" : "badge-upcoming"
                      }`}
                    >
                      {a.status === "live" ? "진행중" : "대기"}
                    </span>
                    <span>{a.sale_type}</span>
                    <span>
                      최고가{" "}
                      <span className="bid-amount">
                        {formatWon(a.highest_bid ?? a.start_price)}
                      </span>
                    </span>
                    <span>입찰 {a.bid_count}건</span>
                    {a.status === "live" && (
                      <span>
                        남은 시간 <Countdown endAt={a.end_at} />
                      </span>
                    )}
                  </div>
                </div>
                <div className="actions">
                  <Link href={`/admin/products/${a.id}/edit`} className="btn">
                    수정
                  </Link>
                  <Link href={`/auctions/${a.id}`} className="btn">
                    열기
                  </Link>
                </div>
              </div>

              <div className="live-bids">
                {bids.length === 0 ? (
                  <p className="field-hint" style={{ margin: 0 }}>
                    아직 입찰이 없습니다.
                  </p>
                ) : (
                  bids.slice(0, 10).map((b, idx) => {
                    const isSelected =
                      a.status === "live" && selectedBid[a.id] === b.id;
                    return (
                      <label
                        key={b.id}
                        className={`bid-item${isSelected ? " bid-item-selected" : ""}`}
                        style={{
                          cursor: a.status === "live" ? "pointer" : "default",
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        {a.status === "live" && (
                          <input
                            type="radio"
                            name={`winner-${a.id}`}
                            checked={selectedBid[a.id] === b.id}
                            onChange={() =>
                              setSelectedBid((prev) => ({
                                ...prev,
                                [a.id]: b.id,
                              }))
                            }
                            disabled={busyId === a.id}
                          />
                        )}
                        <span style={{ flex: 1 }}>
                          #{idx + 1} {b.name} (
                          <span className="bid-user">@{b.username}</span>) ·{" "}
                          <span className="bid-amount">
                            {formatBidWithCurrency(b)}
                          </span>
                        </span>
                        <span style={{ color: "var(--muted)" }}>
                          {formatDateTime(b.created_at)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              {a.status === "live" && (
                <div className="live-finalize" style={{ marginTop: 14 }}>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label htmlFor={`memo-${a.id}`}>결과 메모 (선택)</label>
                    <input
                      id={`memo-${a.id}`}
                      type="text"
                      value={memo[a.id] || ""}
                      onChange={(e) =>
                        setMemo((prev) => ({ ...prev, [a.id]: e.target.value }))
                      }
                      placeholder="조기 낙찰 사유, 인도 메모 등"
                      disabled={busyId === a.id}
                    />
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busyId === a.id || bids.length === 0}
                      onClick={() => finalize(a.id, "confirmed")}
                    >
                      {busyId === a.id ? "처리 중…" : "낙찰 확정·종료"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={busyId === a.id}
                      onClick={() => finalize(a.id, "unsold")}
                    >
                      유찰·종료
                    </button>
                    <p className="field-hint" style={{ margin: 0 }}>
                      확정 시 즉시 입찰이 마감되며 경매 결과로 이동합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
