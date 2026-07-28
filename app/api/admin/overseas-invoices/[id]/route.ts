import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readStore, writeStore, type OverseasInvoice } from "@/lib/db";
import {
  addDaysIso,
  coerceInvoiceCurrency,
  dateInputToIso,
  normalizeOverseasInvoice,
  normalizeOverseasInvoiceItem,
  normalizeRemittance,
  parseTermsDays,
  type OverseasInvoiceItem,
} from "@/lib/overseasInvoices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseItems(raw: unknown): OverseasInvoiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) =>
      normalizeOverseasInvoiceItem(item as Partial<OverseasInvoiceItem>, i)
    )
    .filter((item) => item.description || item.final_price || item.price_krw);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const invoiceId = Number(id);
  const store = readStore();
  const invoice = store.overseas_invoices.find((i) => i.id === invoiceId);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  return NextResponse.json({ invoice });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const invoiceId = Number(id);
  const body = await req.json().catch(() => ({}));

  const currency = coerceInvoiceCurrency(body.currency);
  const items = parseItems(body.items);
  const consignee = String(body.consignee || "").trim();
  const company = String(body.company || "").trim();
  const businessNo = String(body.business_no || "").trim();
  const finalDestination = String(body.final_destination || "").trim();
  const terms = String(body.terms || "3days").trim() || "3days";
  const paymentNote =
    String(body.payment_note || "100% PREPAID").trim() || "100% PREPAID";
  const issuedRaw = String(body.issued_at || "").trim();
  const issuedAt = issuedRaw.includes("T")
    ? new Date(issuedRaw)
    : new Date(dateInputToIso(issuedRaw || ""));
  const dueRaw = String(body.due_at || "").trim();
  const dueAt = dueRaw
    ? dueRaw.includes("T")
      ? new Date(dueRaw).toISOString()
      : dateInputToIso(dueRaw)
    : addDaysIso(issuedAt.toISOString(), parseTermsDays(terms));

  if (!consignee) {
    return NextResponse.json(
      { error: "Consignee를 입력해 주세요." },
      { status: 400 }
    );
  }
  if (items.length === 0) {
    return NextResponse.json(
      { error: "품목을 1개 이상 입력해 주세요." },
      { status: 400 }
    );
  }
  if (Number.isNaN(issuedAt.getTime())) {
    return NextResponse.json({ error: "Invoice Date가 올바르지 않습니다." }, { status: 400 });
  }

  let updated: OverseasInvoice | null = null;
  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    const idx = store.overseas_invoices.findIndex((i) => i.id === invoiceId);
    if (idx < 0) {
      outcome.error = "Invoice not found.";
      return;
    }
    const prev = store.overseas_invoices[idx];
    const invoice = normalizeOverseasInvoice({
      ...prev,
      issued_at: issuedAt.toISOString(),
      due_at: dueAt,
      terms,
      currency,
      company,
      consignee,
      business_no: businessNo,
      final_destination: finalDestination,
      items,
      remittance: normalizeRemittance(body.remittance ?? prev.remittance),
      payment_note: paymentNote,
      updated_at: new Date().toISOString(),
    });
    store.overseas_invoices[idx] = invoice;
    updated = invoice;
  });

  if (outcome.error || !updated) {
    return NextResponse.json(
      { error: outcome.error || "Update failed." },
      { status: outcome.error === "Invoice not found." ? 404 : 400 }
    );
  }
  return NextResponse.json({ invoice: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const invoiceId = Number(id);
  let removed = false;

  writeStore((store) => {
    const before = store.overseas_invoices.length;
    store.overseas_invoices = store.overseas_invoices.filter(
      (i) => i.id !== invoiceId
    );
    removed = store.overseas_invoices.length < before;
  });

  if (!removed) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
