"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { AuctionForm } from "@/components/AuctionForm";
import {
  type AdminAuction,
  type AuctionFormState,
  auctionToForm,
} from "@/lib/admin";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const id = Number(params.id);
  const [auction, setAuction] = useState<AdminAuction | null>(null);
  const [form, setForm] = useState<AuctionFormState | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/auctions/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setAuction(data.auction);
    setForm(auctionToForm(data.auction));
  }, [id]);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin" && Number.isFinite(id)) {
      load();
    }
  }, [user, id, load]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <AppShell title="잔존물관리">
        <AdminNav />
        <div className="empty">잔존물을 찾을 수 없습니다.</div>
      </AppShell>
    );
  }

  if (!auction || !form) {
    return (
      <AppShell title="잔존물관리">
        <AdminNav />
        <p className="page-desc">불러오는 중…</p>
      </AppShell>
    );
  }

  const productName =
    auction.title?.trim() ||
    `${auction.year} ${auction.vehicle_type}`.trim() ||
    `잔존물 #${auction.id}`;

  return (
    <AppShell title={productName}>
      <AdminNav />
      <AuctionForm
        key={auction.id}
        mode="edit"
        auctionId={auction.id}
        initialForm={form}
        initialPhotos={auction.photos}
        onSuccessHref="/admin/products"
      />
    </AppShell>
  );
}
