"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";

export default function AdminStatementNewPage() {
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
    <AppShell title="거래명세서 작성">
      <AdminNav />
      <div className="actions" style={{ marginBottom: 16 }}>
        <Link href="/admin/statements" className="btn btn-ghost">
          ← 거래명세서 목록
        </Link>
      </div>
      <p className="page-desc">
        거래처·차량·금액 등 명세 항목을 입력해 거래명세서를 작성합니다.
      </p>
      <div className="empty">작성 폼을 준비 중입니다.</div>
    </AppShell>
  );
}
