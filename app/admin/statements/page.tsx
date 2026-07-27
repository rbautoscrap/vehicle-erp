"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function AdminStatementsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [statements, setStatements] = useState<TransactionStatement[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [accountForm, setAccountForm] = useState({
    bank: "",
    account_number: "",
    holder: "",
  });
  const [accountBusy, setAccountBusy] = useState(false);

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

  async function addAccount() {
    setError("");
    setMessage("");
    setAccountBusy(true);
    try {
      const res = await fetch("/api/admin/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "계좌 추가에 실패했습니다.");
        return;
      }
      setAccountForm({ bank: "", account_number: "", holder: "" });
      setMessage("입금 계좌가 추가되었습니다.");
      await load();
    } finally {
      setAccountBusy(false);
    }
  }

  async function setDefaultAccount(id: number) {
    setError("");
    const res = await fetch(`/api/admin/bank-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "기본 계좌 설정에 실패했습니다.");
      return;
    }
    setMessage("기본 입금 계좌로 설정했습니다.");
    await load();
  }

  async function removeAccount(id: number, label: string) {
    if (!window.confirm(`「${label}」 계좌를 삭제할까요?`)) return;
    setError("");
    const res = await fetch(`/api/admin/bank-accounts/${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "계좌 삭제에 실패했습니다.");
      return;
    }
    setMessage("계좌가 삭제되었습니다.");
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
    <AppShell title="거래명세서">
      <AdminNav />
      <p className="page-desc">
        낙찰·매각 건에 대한 거래명세서를 작성하고 관리합니다. 입금 계좌를 여러 개
        등록해 두고 명세서 작성 시 선택할 수 있습니다.
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

      <section className="form" style={{ marginBottom: 24 }}>
        <h2 className="ts-section-title" style={{ marginTop: 0 }}>
          입금 계좌 관리
        </h2>
        {accounts.length === 0 ? (
          <p className="field-hint">등록된 계좌가 없습니다.</p>
        ) : (
          <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
            {accounts.map((a) => (
              <div
                key={a.id}
                className="auction-row"
                style={{ padding: "10px 12px" }}
              >
                <div style={{ flex: 1 }}>
                  <strong>{bankAccountLabel(a)}</strong>
                  {a.is_default && (
                    <span
                      className="badge badge-live"
                      style={{ marginLeft: 8 }}
                    >
                      기본
                    </span>
                  )}
                </div>
                <div className="actions">
                  {!a.is_default && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void setDefaultAccount(a.id)}
                    >
                      기본으로
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void removeAccount(a.id, bankAccountLabel(a))}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="field-row-3">
          <div className="field">
            <label htmlFor="list_bank">은행</label>
            <input
              id="list_bank"
              value={accountForm.bank}
              onChange={(e) =>
                setAccountForm((f) => ({ ...f, bank: e.target.value }))
              }
              placeholder="농협"
            />
          </div>
          <div className="field">
            <label htmlFor="list_account">계좌번호</label>
            <input
              id="list_account"
              value={accountForm.account_number}
              onChange={(e) =>
                setAccountForm((f) => ({
                  ...f,
                  account_number: e.target.value,
                }))
              }
              placeholder="351-1093-4618-73"
            />
          </div>
          <div className="field">
            <label htmlFor="list_holder">예금주</label>
            <input
              id="list_holder"
              value={accountForm.holder}
              onChange={(e) =>
                setAccountForm((f) => ({ ...f, holder: e.target.value }))
              }
              placeholder="(주)알비오토"
            />
          </div>
        </div>
        <button
          type="button"
          className="btn"
          disabled={
            accountBusy ||
            !accountForm.bank.trim() ||
            !accountForm.account_number.trim() ||
            !accountForm.holder.trim()
          }
          onClick={() => void addAccount()}
        >
          {accountBusy ? "추가 중…" : "계좌 추가"}
        </button>
      </section>

      <h2 className="ts-section-title">명세서 목록</h2>
      {statements.length === 0 ? (
        <div className="empty">등록된 거래명세서가 없습니다.</div>
      ) : (
        <div className="stack">
          {statements.map((s) => {
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
      )}
    </AppShell>
  );
}
