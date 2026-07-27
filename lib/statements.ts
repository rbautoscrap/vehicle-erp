import type { BidCurrency } from "@/lib/currency";
import { isBidCurrency } from "@/lib/currency";

export type BankAccount = {
  id: number;
  bank: string;
  account_number: string;
  holder: string;
  /** Shown first in selectors when true */
  is_default: boolean;
  created_at: string;
};

export type StatementItem = {
  id: string;
  name: string;
  details: string;
  quantity: number;
  amount: number;
};

export type StatementParty = {
  /** Brand / display name (header) */
  name: string;
  /** 상호명 */
  company: string;
  /** 대표번호 */
  phone: string;
  /** @deprecated Prefer contact_phone; kept for older statements */
  whatsapp: string;
  /** 담당자 */
  contact_person: string;
  /** 연락처 */
  contact_phone: string;
  /** 주소 */
  address: string;
};

export type TransactionStatement = {
  id: number;
  number: string;
  issued_at: string;
  currency: BidCurrency;
  supplier: StatementParty;
  recipient: StatementParty;
  items: StatementItem[];
  bank_account_id: number | null;
  /** Optional note under totals */
  note: string;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_SUPPLIER_ADDRESS =
  "충남 천안시 동남구 청수5로 4 더다움 트윈브릿지 A동 7층";

export const FIXED_SUPPLIER_PHONE = "041-522-7327";

export const DEFAULT_SUPPLIER: StatementParty = {
  name: "RBAUTO Co., Ltd.",
  company: "주식회사 알비오토",
  phone: FIXED_SUPPLIER_PHONE,
  whatsapp: "",
  contact_person: "",
  contact_phone: "",
  address: DEFAULT_SUPPLIER_ADDRESS,
};

export const DEFAULT_BANK_ACCOUNTS: Omit<BankAccount, "id" | "created_at">[] = [
  {
    bank: "농협",
    account_number: "351-1093-4618-73",
    holder: "(주)알비오토",
    is_default: true,
  },
];

export function emptyParty(): StatementParty {
  return {
    name: "",
    company: "",
    phone: "",
    whatsapp: "",
    contact_person: "",
    contact_phone: "",
    address: "",
  };
}

export function normalizeParty(raw?: Partial<StatementParty> | null): StatementParty {
  const whatsapp = String(raw?.whatsapp || "").trim();
  const contactPhone = String(raw?.contact_phone || "").trim() || whatsapp;
  return {
    name: String(raw?.name || "").trim(),
    company: String(raw?.company || "").trim(),
    phone: String(raw?.phone || "").trim(),
    whatsapp,
    contact_person: String(raw?.contact_person || "").trim(),
    contact_phone: contactPhone,
    address: String(raw?.address || "").trim(),
  };
}

export function normalizeBankAccount(
  raw: Partial<BankAccount> & { id: number }
): BankAccount {
  return {
    id: raw.id,
    bank: String(raw.bank || "").trim(),
    account_number: String(raw.account_number || "").trim(),
    holder: String(raw.holder || "").trim(),
    is_default: Boolean(raw.is_default),
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

export function normalizeStatementItem(
  raw: Partial<StatementItem>,
  index: number
): StatementItem {
  const qty = Number(raw.quantity);
  const amount = Number(raw.amount);
  return {
    id: String(raw.id || `item-${index + 1}`),
    name: String(raw.name || "").trim(),
    details: String(raw.details || "").trim(),
    quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    amount: Number.isFinite(amount) ? amount : 0,
  };
}

export function normalizeStatement(
  raw: Partial<TransactionStatement> & { id: number }
): TransactionStatement {
  const currency: BidCurrency = isBidCurrency(raw.currency) ? raw.currency : "KRW";
  const bankId = Number(raw.bank_account_id);
  return {
    id: raw.id,
    number: String(raw.number || "").trim(),
    issued_at: String(raw.issued_at || new Date().toISOString()),
    currency,
    supplier: normalizeParty(raw.supplier || DEFAULT_SUPPLIER),
    recipient: normalizeParty(raw.recipient),
    items: Array.isArray(raw.items)
      ? raw.items.map((item, i) => normalizeStatementItem(item, i))
      : [],
    bank_account_id:
      Number.isFinite(bankId) && bankId > 0 ? bankId : null,
    note: String(raw.note || "").trim(),
    created_at: String(raw.created_at || new Date().toISOString()),
    updated_at: String(raw.updated_at || raw.created_at || new Date().toISOString()),
  };
}

export function statementSupplyTotal(items: StatementItem[]): number {
  return items.reduce((sum, item) => {
    const line = (Number(item.amount) || 0) * (Number(item.quantity) || 0);
    return sum + line;
  }, 0);
}

/** Default VAT rate (10%). */
export const STATEMENT_VAT_RATE = 0.1;

export function statementVatAmount(
  items: StatementItem[],
  currency: BidCurrency
): number {
  return roundMoney(statementSupplyTotal(items) * STATEMENT_VAT_RATE, currency);
}

export function statementGrandTotal(
  items: StatementItem[],
  currency: BidCurrency
): number {
  const supply = roundMoney(statementSupplyTotal(items), currency);
  return roundMoney(supply + statementVatAmount(items, currency), currency);
}

export const DEFAULT_STATEMENT_NOTE = `이동전 보관소 측과 소통 후 진행 부탁드립니다.

이동 부탁드립니다.
서류는 알비오토 진행입니다

※ 차량 입고 후
1.차량 앞,뒤사진
2.등록증사진
3.계기판사진
4.번호판폐기사진 (번호판 2개 중 하나라도 없을 시 차대번호 사진)
5. 입고 날짜(예:1/23 입고)
-카카오톡 발송 바랍니다.`;

/** Round money for display/storage by currency decimals. */
export function roundMoney(amount: number, currency: BidCurrency): number {
  if (!Number.isFinite(amount)) return 0;
  if (currency === "KRW") return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

export function formatStatementMoney(
  amount: number,
  currency: BidCurrency
): string {
  const n = roundMoney(amount, currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "KRW" ? 0 : 2,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(n);
  if (currency === "EUR") return `€${formatted}`;
  if (currency === "USD") return `$${formatted}`;
  return `₩${formatted}`;
}

export function formatStatementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateInputToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

export function bankAccountLabel(account: BankAccount): string {
  return `${account.bank} ${account.account_number} ${account.holder}`.trim();
}

export function newStatementItem(index = 0): StatementItem {
  return {
    id: `tmp-${Date.now()}-${index}`,
    name: "",
    details: "",
    quantity: 1,
    amount: 0,
  };
}
