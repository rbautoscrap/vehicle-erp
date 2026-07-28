import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  allocateOverseasInvoiceNumber,
  readStore,
  writeStore,
  type OverseasInvoice,
} from "@/lib/db";
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

function parseItems(raw: unknown): OverseasInvoiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) =>
      normalizeOverseasInvoiceItem(item as Partial<OverseasInvoiceItem>, i)
    )
    .filter((item) => item.description || item.final_price || item.price_krw);
}

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const invoices = [...store.overseas_invoices].sort(
    (a, b) =>
      b.issued_at.localeCompare(a.issued_at) || b.id - a.id
  );
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

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
  let dueAt = dueRaw
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

  let created: OverseasInvoice | null = null;

  writeStore((store) => {
    const now = new Date().toISOString();
    const invoice = normalizeOverseasInvoice({
      id: store.nextOverseasInvoiceId++,
      number: allocateOverseasInvoiceNumber(store, issuedAt),
      issued_at: issuedAt.toISOString(),
      due_at: dueAt,
      terms,
      currency,
      company,
      consignee,
      business_no: businessNo,
      final_destination: finalDestination,
      items,
      remittance: normalizeRemittance(body.remittance),
      payment_note: paymentNote,
      created_at: now,
      updated_at: now,
    });
    store.overseas_invoices.push(invoice);
    created = invoice;
  });

  return NextResponse.json({ invoice: created });
}
