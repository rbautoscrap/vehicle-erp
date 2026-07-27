import { DEFAULT_STATEMENT_NOTE } from "@/lib/statements";

export type StatementLocale = "ko" | "en";

export const DEFAULT_STATEMENT_NOTE_EN = `Please coordinate with the storage facility before moving the vehicle.

Please arrange the move.
Documents will be handled by RB Auto.

※ After vehicle arrival
1. Front and rear photos of the vehicle
2. Registration certificate photo
3. Instrument cluster photo
4. License plate disposal photo (if either plate is missing, VIN photo)
5. Arrival date (e.g., 1/23 arrival)
- Please send via KakaoTalk.`;

export type StatementLabels = {
  title: string;
  subtitle: string;
  number: string;
  issuedAt: string;
  supplier: string;
  recipient: string;
  tradeName: string;
  businessName: string;
  name: string;
  representativePhone: string;
  contactPerson: string;
  contact: string;
  address: string;
  item: string;
  details: string;
  quantity: string;
  supplyAmount: string;
  supplyTotal: string;
  vat: string;
  grandTotal: string;
  bankAccount: string;
  bank: string;
  accountNumber: string;
  holder: string;
  noAccount: string;
};

const KO: StatementLabels = {
  title: "거래명세서",
  subtitle: "TRANSACTION STATEMENT",
  number: "명세서 번호",
  issuedAt: "발행일",
  supplier: "공급자",
  recipient: "공급받는자",
  tradeName: "상호",
  businessName: "상호명",
  name: "성명",
  representativePhone: "대표번호",
  contactPerson: "담당자",
  contact: "연락처",
  address: "주소",
  item: "품목",
  details: "상세",
  quantity: "수량",
  supplyAmount: "공급가액",
  supplyTotal: "공급가액",
  vat: "부가세 (10%)",
  grandTotal: "합계",
  bankAccount: "입금 계좌",
  bank: "은행",
  accountNumber: "계좌번호",
  holder: "예금주",
  noAccount: "선택된 입금 계좌가 없습니다.",
};

const EN: StatementLabels = {
  title: "Transaction Statement",
  subtitle: "TRANSACTION STATEMENT",
  number: "Statement No.",
  issuedAt: "Issue Date",
  supplier: "Supplier",
  recipient: "Recipient",
  tradeName: "Company",
  businessName: "Business Name",
  name: "Name",
  representativePhone: "Main Phone",
  contactPerson: "Contact Person",
  contact: "Contact",
  address: "Address",
  item: "Item",
  details: "Details",
  quantity: "Qty",
  supplyAmount: "Amount",
  supplyTotal: "Supply Amount",
  vat: "VAT (10%)",
  grandTotal: "Total",
  bankAccount: "Bank Account",
  bank: "Bank",
  accountNumber: "Account No.",
  holder: "Account Holder",
  noAccount: "No bank account selected.",
};

export function getStatementLabels(locale: StatementLocale): StatementLabels {
  return locale === "en" ? EN : KO;
}

function normalizeNote(note: string) {
  return note.replace(/\r\n/g, "\n").trim();
}

/** Resolve footer text for the active locale (defaults switch with language). */
export function resolveStatementNote(
  note: string | undefined,
  locale: StatementLocale
): string {
  const trimmed = normalizeNote(note || "");
  const koDefault = normalizeNote(DEFAULT_STATEMENT_NOTE);
  const enDefault = normalizeNote(DEFAULT_STATEMENT_NOTE_EN);
  const isDefault =
    !trimmed || trimmed === koDefault || trimmed === enDefault;
  if (isDefault) {
    return locale === "en" ? DEFAULT_STATEMENT_NOTE_EN : DEFAULT_STATEMENT_NOTE;
  }
  return note || "";
}
