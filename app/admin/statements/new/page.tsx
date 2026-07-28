"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import {
  StatementForm,
  type StatementFormValues,
} from "@/components/StatementForm";
import type { BankAccount, StatementRecipientContact } from "@/lib/statements";

export default function AdminStatementNewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recipients, setRecipients] = useState<StatementRecipientContact[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [accRes, recRes] = await Promise.all([
      fetch("/api/admin/bank-accounts"),
      fetch("/api/admin/statement-recipients"),
    ]);
    if (accRes.ok) {
      const data = await accRes.json();
      setAccounts(data.accounts || []);
    }
    if (recRes.ok) {
      const data = await recRes.json();
      setRecipients(data.recipients || []);
    }
    setReady(true);
  }, []);

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
    setSaving(true);
    try {
      const res = await fetch("/api/admin/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      router.push(`/admin/statements/${data.statement.id}`);
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || user.role !== "admin" || !ready) {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  return (
    <AppShell title="거래명세서 작성">
      <AdminNav />
      <div className="actions" style={{ marginBottom: 16 }}>
        <Link href="/admin/statements" className="btn btn-ghost">
          ← 거래명세서 목록
        </Link>
      </div>
      <p className="page-desc">
        거래처·품목·입금 계좌를 입력한 뒤 저장하세요. 공급받는자는 저장 시
        자주 쓰는 거래처로 등록되어 다음부터 자동완성됩니다.
      </p>
      <StatementForm
        mode="create"
        accounts={accounts}
        recipients={recipients}
        saving={saving}
        error={error}
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
