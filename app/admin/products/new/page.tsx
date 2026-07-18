"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { AuctionForm } from "@/components/AuctionForm";

export default function NewProductPage() {
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
    <AppShell title="잔존물등록">
      <AdminNav />
      <p className="page-desc">
        차량 정보, 사진, 경매 일정을 입력한 뒤 잔존물을 등록하세요.
      </p>
      <AuctionForm key="create" mode="create" onSuccessHref="/admin/products" />
    </AppShell>
  );
}
