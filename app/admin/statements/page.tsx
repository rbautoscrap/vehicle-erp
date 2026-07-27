"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";

export default function AdminStatementsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

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
        낙찰·매각 건에 대한 거래명세서를 작성하고 관리합니다.
      </p>

      <div className="actions" style={{ marginBottom: 16 }}>
        <Link href="/admin/statements/new" className="btn btn-primary">
          새 거래명세서 작성
        </Link>
      </div>

      <div className="empty">등록된 거래명세서가 없습니다.</div>
    </AppShell>
  );
}
