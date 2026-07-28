"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import type { OverseasInvoice } from "@/lib/overseasInvoices";
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  invoiceItemsTotal,
} from "@/lib/overseasInvoices";

const PAGE_SIZE = 15;

export default function OverseasInvoicesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [invoices, setInvoices] = useState<OverseasInvoice[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overseas-invoices");
    if (!res.ok) return;
    const data = await res.json();
    setInvoices(data.invoices || []);
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return invoices.slice(start, start + PAGE_SIZE);
  }, [invoices, page]);

  async function deleteInvoice(id: number, number: string) {
    if (!window.confirm(`「${number}」 인보이스를 삭제할까요?`)) return;
    setError("");
    setMessage("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/overseas-invoices/${id}`, {
        method: "DELETE",
      });
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

  return (
    <AppShell title="해외 인보이스">
      <AdminNav />
      <div className="ts-list-head">
        <p className="page-desc">해외 거래용 Commercial Invoice를 작성·관리합니다.</p>
        <Link href="/admin/overseas-invoices/new" className="btn btn-primary">
          새 인보이스
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      <div className="card ts-list-card">
        <table className="ts-list-table">
          <thead>
            <tr>
              <th className="ts-list-no">Invoice#</th>
              <th>Date</th>
              <th>Consignee</th>
              <th>Destination</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="ts-list-empty">
                  등록된 인보이스가 없습니다.
                </td>
              </tr>
            ) : (
              pageItems.map((inv) => (
                <tr key={inv.id}>
                  <td className="ts-list-no">
                    <Link href={`/admin/overseas-invoices/${inv.id}`}>
                      {inv.number}
                    </Link>
                  </td>
                  <td>{formatInvoiceDate(inv.issued_at)}</td>
                  <td className="ts-list-name" title={inv.consignee}>
                    {inv.consignee || "—"}
                  </td>
                  <td>{inv.final_destination || "—"}</td>
                  <td>
                    {formatInvoiceMoney(
                      invoiceItemsTotal(inv.items),
                      inv.currency
                    )}
                  </td>
                  <td className="ts-list-actions">
                    <Link
                      href={`/admin/overseas-invoices/${inv.id}`}
                      className="btn"
                    >
                      수정
                    </Link>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={busyId === inv.id}
                      onClick={() => void deleteInvoice(inv.id, inv.number)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="ts-pager">
          <button
            type="button"
            className="btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            다음
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
