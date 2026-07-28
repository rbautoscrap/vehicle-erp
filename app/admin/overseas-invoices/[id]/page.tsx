"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import {
  OverseasInvoiceForm,
  type OverseasInvoiceFormValues,
} from "@/components/OverseasInvoiceForm";
import type { OverseasInvoice } from "@/lib/overseasInvoices";

export default function EditOverseasInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [invoice, setInvoice] = useState<OverseasInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/overseas-invoices/${params.id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(data.error || "인보이스를 불러오지 못했습니다.");
      return;
    }
    setInvoice(data.invoice);
  }, [params.id]);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user, load]);

  async function onSubmit(values: OverseasInvoiceFormValues) {
    if (!invoice) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/overseas-invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      setInvoice(data.invoice);
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

  if (loadError) {
    return (
      <AppShell title="해외 인보이스">
        <AdminNav />
        <p className="error">{loadError}</p>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell title="해외 인보이스">
        <AdminNav />
        <p className="page-desc">불러오는 중…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Invoice ${invoice.number}`}>
      <AdminNav />
      <OverseasInvoiceForm
        key={`${invoice.id}-${invoice.updated_at}`}
        mode="edit"
        initial={invoice}
        saving={saving}
        error={error}
        onSubmit={onSubmit}
      />
    </AppShell>
  );
}
