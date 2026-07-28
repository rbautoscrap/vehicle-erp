"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import {
  OverseasInvoiceForm,
  type OverseasInvoiceFormValues,
} from "@/components/OverseasInvoiceForm";

export default function NewOverseasInvoicePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function onSubmit(values: OverseasInvoiceFormValues) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overseas-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      router.push(`/admin/overseas-invoices/${data.invoice.id}`);
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

  return (
    <AppShell title="해외 인보이스 작성">
      <AdminNav />
      <OverseasInvoiceForm
        mode="create"
        saving={saving}
        error={error}
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
