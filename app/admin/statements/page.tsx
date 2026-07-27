"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import type { BankAccount, TransactionStatement } from "@/lib/statements";
import {
  bankAccountLabel,
  formatStatementDate,
  formatStatementMoney,
  statementGrandTotal,
} from "@/lib/statements";

const PAGE_SIZE = 15;

export default function AdminStatementsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [statements, setStatements] = useState<TransactionStatement[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/statements");
    if (!res.ok) return;
    const data = await res.json();
    setStatements(data.statements || []);
    setAccounts(data.accounts || []);
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  const totalPages = Math.max(1, Math.ceil(statements.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return statements.slice(start, start + PAGE_SIZE);
  }, [statements, page]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = end - maxButtons + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  async function deleteStatement(id: number, number: string) {
    if (!window.confirm(`「${number}」 거래명세서를 삭제할까요?`)) return;
    setError("");
    setMessage("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/statements/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "삭제에 실패했습니다.");
        return;
      }
      setMessage("삭제되었습니다.");
      await load();
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

  const rangeStart = statements.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, statements.length);

  return (
    <AppShell title="거래명세서">
      <AdminNav />
      <p className="page-desc">
        낙찰·매각 건에 대한 거래명세서를 작성하고 관리합니다. 목록은 페이지당{" "}
        {PAGE_SIZE}건씩 표시됩니다.
      </p>

      {error && <p className="error">{error}</p>}
      {message && (
        <p style={{ margin: "0 0 12px", color: "var(--accent)" }}>{message}</p>
      )}

      <div className="actions" style={{ marginBottom: 16 }}>
        <Link href="/admin/statements/new" className="btn btn-primary">
          새 거래명세서 작성
        </Link>
      </div>

      <h2 className="ts-section-title" style={{ marginTop: 0 }}>
        명세서 목록
      </h2>

      {statements.length === 0 ? (
        <div className="empty">등록된 거래명세서가 없습니다.</div>
      ) : (
        <>
          <p className="field-hint" style={{ marginTop: 0 }}>
            {rangeStart}–{rangeEnd} / 전체 {statements.length}건
          </p>
          <div className="stack">
            {pageItems.map((s) => {
              const account =
                accounts.find((a) => a.id === s.bank_account_id) || null;
              const total = statementGrandTotal(s.items, s.currency);
              const busy = busyId === s.id;
              return (
                <div key={s.id} className="auction-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="actions"
                      style={{ justifyContent: "space-between" }}
                    >
                      <h3 style={{ margin: 0 }}>{s.number}</h3>
                      <span className="badge badge-upcoming">{s.currency}</span>
                    </div>
                    <div
                      className="detail-price bid-amount"
                      style={{ margin: "8px 0 4px", fontSize: "1.15rem" }}
                    >
                      {formatStatementMoney(total, s.currency)}
                    </div>
                    <div className="auction-meta">
                      <span>발행 {formatStatementDate(s.issued_at)}</span>
                      <span>{s.recipient.name}</span>
                      {account && <span>{bankAccountLabel(account)}</span>}
                      <span>품목 {s.items.length}건</span>
                    </div>
                  </div>
                  <div className="actions">
                    <Link
                      href={`/admin/statements/${s.id}`}
                      className="btn btn-primary"
                    >
                      보기/수정
                    </Link>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => void deleteStatement(s.id, s.number)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="pagination" aria-label="명세서 페이지">
              <button
                type="button"
                className="btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                이전
              </button>
              <div className="pagination-pages">
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`btn${n === page ? " pagination-active" : ""}`}
                    onClick={() => setPage(n)}
                    aria-current={n === page ? "page" : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                다음
              </button>
            </nav>
          )}
        </>
      )}
    </AppShell>
  );
}
