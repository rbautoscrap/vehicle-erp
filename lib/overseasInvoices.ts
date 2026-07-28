import type { BidCurrency } from "@/lib/currency";
import { getCurrencyMeta, isBidCurrency } from "@/lib/currency";

export type OverseasInvoiceCurrency = Extract<BidCurrency, "USD" | "EUR">;

export type OverseasInvoiceItem = {
  id: string;
  description: string;
  reg_no: string;
  vin: string;
  quantity: number;
  /** Unit price in KRW */
  price_krw: number;
  /** FX: KRW per 1 unit of foreign currency (e.g. 1729) */
  rate: number;
  /** Final amount in foreign currency (price_krw / rate) */
  final_price: number;
};

export type OverseasRemittance = {
  beneficiary_name: string;
  account_no: string;
  beneficiary_address: string;
  bank_name: string;
  branch_name: string;
  swift_code: string;
  bank_address: string;
  bank_phone: string;
};

export type OverseasInvoice = {
  id: number;
  number: string;
  issued_at: string;
  due_at: string;
  terms: string;
  currency: OverseasInvoiceCurrency;
  company: string;
  consignee: string;
  business_no: string;
  final_destination: string;
  items: OverseasInvoiceItem[];
  remittance: OverseasRemittance;
  payment_note: string;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_INVOICE_SELLER = {
  brand: "RBAUTO",
  company: "RBAUTO SCRAP",
  address:
    "82, Taehaksan-ro, Pungse-myeon, Dongnam-gu, Cheonan-si, Chungcheongnam-do post. 31214, Republic of Korea",
};

export const DEFAULT_REMITTANCE: OverseasRemittance = {
  beneficiary_name: "RBAUTO",
  account_no: "69191000178338",
  beneficiary_address:
    "4, Cheongsu 5-ro, Dongnam-gu, Cheonan-si, Chungcheongnam-do",
  bank_name: "KEB Hana Bank",
  branch_name: "Chungju",
  swift_code: "KOEXKRSE or KOEXKRSEXXX",
  bank_address:
    "273-47 109, Beonyeong-daero, Chungju-si, Chungcheongbuk-do, South Korea",
  bank_phone: "+82 43 845 1111",
};

export const DEFAULT_INVOICE_NOTICES = [
  "If the deposit deadline is exceeded, The contract will be cancelled.",
  "You can purchase the cancelled vehicle by renewing the contract.",
  "If cancellation is repeated more than three times, Transactions will be difficult in the future.",
  "The down payment will not be refunded after 7 days of the transaction date.",
];

export const DEFAULT_STAMP = {
  registration_no: "436-87-00501",
  company: "주식회사알비오토",
  name: "이 근 배",
  address: "충남 천안시 동남구 청수5로 4 더다움트윈브릿지 A동 7층",
  business:
    "자동차부품 제조·도소매, 무역·수출입, 전자상거래 외",
};

export function isOverseasInvoiceCurrency(
  value: unknown
): value is OverseasInvoiceCurrency {
  return value === "USD" || value === "EUR";
}

export function newOverseasInvoiceItem(index = 0): OverseasInvoiceItem {
  return {
    id: `oi-${Date.now()}-${index}`,
    description: "",
    reg_no: "",
    vin: "",
    quantity: 1,
    price_krw: 0,
    rate: 0,
    final_price: 0,
  };
}

export function calcFinalPrice(priceKrw: number, rate: number): number {
  if (!Number.isFinite(priceKrw) || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  return Math.round((priceKrw / rate) * 100) / 100;
}

export function normalizeRemittance(
  raw?: Partial<OverseasRemittance> | null
): OverseasRemittance {
  return {
    beneficiary_name:
      String(raw?.beneficiary_name || "").trim() ||
      DEFAULT_REMITTANCE.beneficiary_name,
    account_no:
      String(raw?.account_no || "").trim() || DEFAULT_REMITTANCE.account_no,
    beneficiary_address:
      String(raw?.beneficiary_address || "").trim() ||
      DEFAULT_REMITTANCE.beneficiary_address,
    bank_name:
      String(raw?.bank_name || "").trim() || DEFAULT_REMITTANCE.bank_name,
    branch_name:
      String(raw?.branch_name || "").trim() || DEFAULT_REMITTANCE.branch_name,
    swift_code:
      String(raw?.swift_code || "").trim() || DEFAULT_REMITTANCE.swift_code,
    bank_address:
      String(raw?.bank_address || "").trim() || DEFAULT_REMITTANCE.bank_address,
    bank_phone:
      String(raw?.bank_phone || "").trim() || DEFAULT_REMITTANCE.bank_phone,
  };
}

export function normalizeOverseasInvoiceItem(
  raw: Partial<OverseasInvoiceItem>,
  index: number
): OverseasInvoiceItem {
  const priceKrw = Math.max(0, Number(raw.price_krw) || 0);
  const rate = Math.max(0, Number(raw.rate) || 0);
  const quantity = Math.max(0, Number(raw.quantity) || 0);
  const finalRaw = Number(raw.final_price);
  const final_price =
    Number.isFinite(finalRaw) && finalRaw > 0
      ? Math.round(finalRaw * 100) / 100
      : calcFinalPrice(priceKrw, rate);
  return {
    id: String(raw.id || `oi-item-${index}`),
    description: String(raw.description || "").trim(),
    reg_no: String(raw.reg_no || "").trim(),
    vin: String(raw.vin || "").trim(),
    quantity,
    price_krw: Math.round(priceKrw),
    rate: rate > 0 ? Math.round(rate * 1000) / 1000 : 0,
    final_price,
  };
}

export function normalizeOverseasInvoice(
  raw: Partial<OverseasInvoice> & { id: number }
): OverseasInvoice {
  const currency: OverseasInvoiceCurrency = isOverseasInvoiceCurrency(
    raw.currency
  )
    ? raw.currency
    : "EUR";
  const items = Array.isArray(raw.items)
    ? raw.items.map((item, i) =>
        normalizeOverseasInvoiceItem(item as Partial<OverseasInvoiceItem>, i)
      )
    : [];
  return {
    id: raw.id,
    number: String(raw.number || "").trim(),
    issued_at: String(raw.issued_at || new Date().toISOString()),
    due_at: String(raw.due_at || ""),
    terms: String(raw.terms || "3days").trim() || "3days",
    currency,
    company: String(raw.company || "").trim(),
    consignee: String(raw.consignee || "").trim(),
    business_no: String(raw.business_no || "").trim(),
    final_destination: String(raw.final_destination || "").trim(),
    items,
    remittance: normalizeRemittance(raw.remittance),
    payment_note: String(raw.payment_note || "100% PREPAID").trim() || "100% PREPAID",
    created_at: String(raw.created_at || new Date().toISOString()),
    updated_at: String(raw.updated_at || new Date().toISOString()),
  };
}

export function invoiceItemsTotal(items: OverseasInvoiceItem[]): number {
  const sum = items.reduce((acc, item) => acc + (Number(item.final_price) || 0), 0);
  return Math.round(sum * 100) / 100;
}

export function formatInvoiceMoney(
  amount: number,
  currency: OverseasInvoiceCurrency
): string {
  const meta = getCurrencyMeta(currency);
  const n = Number.isFinite(amount) ? amount : 0;
  return `${meta.symbol} ${n.toLocaleString("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })}`;
}

export function formatKrw(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `₩ ${n.toLocaleString("en-US")}`;
}

export function formatInvoiceDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
    return m ? m[1] : iso;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
    return m ? m[1] : "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateInputToIso(dateStr: string): string {
  const s = String(dateStr || "").trim();
  if (!s) return new Date().toISOString();
  if (s.includes("T")) return new Date(s).toISOString();
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function parseTermsDays(terms: string): number {
  const m = /(\d+)/.exec(String(terms || ""));
  return m ? Math.max(0, Number(m[1])) : 3;
}

/** Ensure currency typing for API payloads */
export function coerceInvoiceCurrency(raw: unknown): OverseasInvoiceCurrency {
  if (isOverseasInvoiceCurrency(raw)) return raw;
  if (isBidCurrency(raw) && (raw === "USD" || raw === "EUR")) return raw;
  return "EUR";
}
