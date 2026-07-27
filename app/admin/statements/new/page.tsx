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
import type { BankAccount } from "@/lib/statements";

export default function AdminStatementNewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/admin/bank-accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts || []);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") void loadAccounts();
  }, [user, loadAccounts]);

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
        거래처·품목·입금 계좌를 입력한 뒤 저장하세요. 오른쪽(또는 하단)
        미리보기로 인쇄용 명세서를 확인할 수 있습니다.
      </p>
      <StatementForm
        mode="create"
        accounts={accounts}
        saving={saving}
        error={error}
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
