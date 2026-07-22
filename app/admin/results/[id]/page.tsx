"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { formatBidWithCurrency } from "@/lib/currency";
import { formatDateTime, toLocalInputValue } from "@/lib/format";

type Detail = {
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
    winner_bid_id?: number | null;
    closed_at?: string | null;
    photos: string[];
    start_price: number;
    start_at: string;
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
    currency?: string;
    amount_input?: number;
    bid_at: string;
    bid_id?: number;
  } | null;
  bids: {
    id: number;
    amount: number;
    currency?: string;
    amount_input?: number;
    created_at: string;
    username: string;
    name: string;
  }[];
};

export default function AdminResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const id = String(params.id);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [resultStatus, setResultStatus] = useState<"pending" | "confirmed" | "unsold">(
    "pending"
  );
  const [winnerBidId, setWinnerBidId] = useState<number | null>(null);
  const [resultMemo, setResultMemo] = useState("");
  const [notes, setNotes] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/results/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setDetail(data);
    setResultStatus(data.auction.result_status || "pending");
    setResultMemo(data.auction.result_memo || "");
    setNotes(data.auction.notes || "");
    setEndAt(toLocalInputValue(data.auction.end_at));
    const selected =
      data.auction.winner_bid_id ??
      data.winner?.bid_id ??
      data.bids?.[0]?.id ??
      null;
    setWinnerBidId(selected);
  }, [id]);

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
      const res = await fetch(`/api/admin/results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result_status: resultStatus,
          result_memo: resultMemo,
          notes,
          end_at: new Date(endAt).toISOString(),
          winner_bid_id:
            resultStatus === "unsold"
              ? null
              : resultStatus === "confirmed"
                ? winnerBidId
                : winnerBidId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      if (data.reopened) {
        setMessage("경매를 다시 진행 중으로 되돌렸습니다.");
        router.push("/admin/live");
        return;
      }
      setMessage("결과가 저장되었습니다.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onReopen() {
    const label =
      detail?.auction.title ||
      `${detail?.auction.year || ""} ${detail?.auction.vehicle_type || ""}`.trim();
    const chosenEnd = endAt ? new Date(endAt) : null;
    const useFormEnd =
      chosenEnd &&
      !Number.isNaN(chosenEnd.getTime()) &&
      chosenEnd.getTime() > Date.now();
    const newEnd = useFormEnd
      ? chosenEnd!
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (
      !window.confirm(
        `「${label}」을(를) 다시 경매 진행 중으로 되돌릴까요?\n\n낙찰·유찰 결과는 초기화되고, 확정된 My wins에서도 사라집니다.\n종료 시간: ${formatDateTime(newEnd.toISOString())}`
      )
    ) {
      return;
    }
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reopen: true,
          end_at: newEnd.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "경매 재개에 실패했습니다.");
        return;
      }
      setMessage("경매를 다시 진행 중으로 되돌렸습니다.");
      router.push("/admin/live");
    } catch {
      setError("서버에 연결하지 못했습니다.");
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

  if (notFound) {
    return (
      <AppShell title="경매 결과">
        <AdminNav />
        <div className="empty">결과를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell title="경매 결과">
        <AdminNav />
        <p className="page-desc">불러오는 중…</p>
      </AppShell>
    );
  }

  const a = detail.auction;
  const winner = detail.winner;
  const closedLabel = a.closed_at
    ? `조기 종료 ${formatDateTime(a.closed_at)}`
    : `종료 ${formatDateTime(a.end_at)}`;

  return (
    <AppShell title={`결과 #${a.id}`}>
      <AdminNav />
      <div className="actions" style={{ marginBottom: 16 }}>
        <Link href="/admin/results" className="btn btn-ghost">
          ← 결과 목록
        </Link>
        <Link href={`/admin/products/${a.id}/edit`} className="btn">
          잔존물 편집
        </Link>
        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => void onReopen()}
        >
          {saving ? "처리 중…" : "경매 재개"}
        </button>
      </div>

      <div className="auction-row" style={{ marginBottom: 20 }}>
        <div className="auction-list-main">
          {a.photos?.[0] && (
            <img className="list-thumb" src={a.photos[0]} alt={a.vehicle_type} />
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "1.15rem" }}>
              {a.title || `${a.year} ${a.vehicle_type}`.trim()}
            </h2>
            <div className="auction-meta" style={{ marginTop: 8 }}>
              <span>{a.sale_type}</span>
              <span>{a.fuel_type}</span>
              <span>{a.storage_location}</span>
              <span>{closedLabel}</span>
              {a.closed_at && (
                <span className="badge badge-ended">조기 낙찰</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="form" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>낙찰 정보</h2>
        {winner ? (
          <dl className="spec-list" style={{ marginTop: 12 }}>
            <div>
              <dt>낙찰자</dt>
              <dd>
                {winner.name} (<span className="bid-user">@{winner.username}</span>)
              </dd>
            </div>
            <div>
              <dt>낙찰 금액</dt>
              <dd className="bid-amount">{formatBidWithCurrency(winner)}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd>{winner.phone || "-"}</dd>
            </div>
            <div>
              <dt>주소</dt>
              <dd>{winner.address || "-"}</dd>
            </div>
            <div>
              <dt>입찰 시각</dt>
              <dd>{formatDateTime(winner.bid_at)}</dd>
            </div>
            <div>
              <dt>총 입찰</dt>
              <dd>{a.bid_count}건</dd>
            </div>
          </dl>
        ) : (
          <p className="field-hint" style={{ marginTop: 12 }}>
            입찰이 없어 낙찰자가 없습니다. 필요하면 아래에서 유찰로 처리하세요.
          </p>
        )}
      </div>

      <form className="form" onSubmit={onSave} style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>결과 처리</h2>
        <div className="field">
          <label htmlFor="result_status">결과 상태</label>
          <select
            id="result_status"
            value={resultStatus}
            onChange={(e) =>
              setResultStatus(e.target.value as "pending" | "confirmed" | "unsold")
            }
          >
            <option value="pending">결과 대기</option>
            <option value="confirmed">낙찰 확정</option>
            <option value="unsold">유찰</option>
          </select>
        </div>
        {resultStatus !== "unsold" && detail.bids.length > 0 && (
          <div className="field">
            <label htmlFor="winner_bid_id">낙찰자 선택</label>
            <select
              id="winner_bid_id"
              value={winnerBidId ?? ""}
              onChange={(e) =>
                setWinnerBidId(e.target.value ? Number(e.target.value) : null)
              }
            >
              {detail.bids.map((b, idx) => (
                <option key={b.id} value={b.id}>
                  #{idx + 1} {b.name} (@{b.username}) · {formatBidWithCurrency(b)}
                </option>
              ))}
            </select>
            <p className="field-hint">
              최고가가 아니어도 낙찰자로 지정할 수 있습니다.
            </p>
          </div>
        )}
        <div className="field">
          <label htmlFor="end_at">종료 시간 (수정 가능)</label>
          <input
            id="end_at"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
          <p className="field-hint">
            종료 시간을 미래로 바꾸면 조기 종료가 해제되고 다시 진행 중 경매로 돌아갈 수
            있습니다.
          </p>
        </div>
        <div className="field">
          <label htmlFor="result_memo">결과 메모</label>
          <textarea
            id="result_memo"
            rows={3}
            value={resultMemo}
            onChange={(e) => setResultMemo(e.target.value)}
            placeholder="인도, 결제, 특이사항 등"
          />
        </div>
        <div className="field">
          <label htmlFor="notes">상품 특이사항</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        {message && <p style={{ margin: 0, color: "var(--accent)" }}>{message}</p>}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "저장 중…" : "결과 저장"}
        </button>
      </form>

      <section className="bid-list">
        <h2>입찰 내역</h2>
        {detail.bids.length === 0 ? (
          <div className="empty">입찰이 없습니다.</div>
        ) : (
          detail.bids.map((b, idx) => {
            const isWinner = winnerBidId === b.id;
            return (
              <div
                key={b.id}
                className={`bid-item${isWinner ? " bid-item-selected" : ""}`}
              >
                <span>
                  #{idx + 1} {b.name} (<span className="bid-user">@{b.username}</span>) ·{" "}
                  <span className="bid-amount">{formatBidWithCurrency(b)}</span>
                  {isWinner && resultStatus === "confirmed" ? " · 낙찰" : ""}
                </span>
                <span style={{ color: "var(--muted)" }}>
                  {formatDateTime(b.created_at)}
                </span>
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
