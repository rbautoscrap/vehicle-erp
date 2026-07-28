"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import {
  StatementForm,
  type StatementFormValues,
} from "@/components/StatementForm";
import type {
  BankAccount,
  StatementRecipientContact,
  TransactionStatement,
} from "@/lib/statements";

export default function AdminStatementEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const id = String(params.id);
  const [statement, setStatement] = useState<TransactionStatement | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recipients, setRecipients] = useState<StatementRecipientContact[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/statements/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setStatement(data.statement);
    setAccounts(data.accounts || []);
    setRecipients(data.recipients || []);
  }, [id]);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  async function onSubmit(values: StatementFormValues) {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/statements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      setStatement(data.statement);
      setMessage("저장되었습니다.");
      await load();
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
      <AppShell title="거래명세서">
        <AdminNav />
        <div className="empty">거래명세서를 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  if (!statement) {
    return (
      <AppShell title="거래명세서">
        <AdminNav />
        <p className="page-desc">불러오는 중…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={`명세서 ${statement.number}`}>
      <AdminNav />
      <div className="actions" style={{ marginBottom: 16 }}>
        <Link href="/admin/statements" className="btn btn-ghost">
          ← 거래명세서 목록
        </Link>
      </div>
      {message && (
        <p style={{ margin: "0 0 12px", color: "var(--accent)" }}>{message}</p>
      )}
      <StatementForm
        key={`${statement.id}-${statement.updated_at}`}
        mode="edit"
        initial={statement}
        accounts={accounts}
        recipients={recipients}
        saving={saving}
        error={error}
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
