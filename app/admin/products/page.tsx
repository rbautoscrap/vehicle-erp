"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { Countdown } from "@/components/Countdown";
import { formatDateTime, formatWon } from "@/lib/format";
import {
  type AdminAuction,
  statusBadgeClass,
  statusLabel,
} from "@/lib/admin";

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/auctions?scope=all");
    if (res.ok) {
      const data = await res.json();
      setAuctions(data.auctions);
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
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [user, load]);

  async function onDelete(id: number) {
    if (!confirm("이 잔존물을 삭제할까요?")) return;
    await fetch(`/api/auctions/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  return (
    <AppShell title="잔존물관리">
      <AdminNav />
      <div className="actions" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <p className="page-desc" style={{ margin: 0 }}>
          등록된 잔존물을 관리합니다. 진행·대기 건이 위에 보이고, 마감 건은 아래로
          내려가며 최신 등록순으로 정렬됩니다.
        </p>
        <Link href="/admin/products/new" className="btn btn-primary">
          잔존물등록
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="empty">
          등록된 잔존물이 없습니다.{" "}
          <Link href="/admin/products/new" style={{ color: "var(--accent)" }}>
            잔존물등록
          </Link>
        </div>
      ) : (
        <div className="stack">
          {auctions.map((a) => (
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
                    <span className={`badge ${statusBadgeClass(a.status)}`}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                  <div className="auction-meta">
                    {a.sale_type && <span>{a.sale_type}</span>}
                    <span>{a.fuel_type}</span>
                    <span>{a.storage_location}</span>
                    <span>최고가 {formatWon(a.highest_bid ?? a.start_price)}</span>
                    <span>입찰 {a.bid_count}건</span>
                    <span>
                      {formatDateTime(a.start_at)} ~ {formatDateTime(a.end_at)}
                    </span>
                    {a.status === "live" && (
                      <span>
                        남은 시간 <Countdown endAt={a.end_at} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="actions">
                <Link href={`/admin/products/${a.id}/edit`} className="btn">
                  수정
                </Link>
                <Link href={`/auctions/${a.id}`} className="btn">
                  입찰
                </Link>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => onDelete(a.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
