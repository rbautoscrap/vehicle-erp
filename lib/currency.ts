import { BID_INCREMENT } from "@/lib/format";

export const CURRENCY_CODES = ["KRW", "USD", "EUR"] as const;

export type BidCurrency = (typeof CURRENCY_CODES)[number];

export type CurrencyMeta = {
  code: BidCurrency;
  label: string;
  shortLabel: string;
  symbol: string;
  decimals: number;
};

/** Default FX: 1 USD/EUR → KRW (admin can override in store). */
export const DEFAULT_FX_RATES = {
  usd_krw: 1350,
  eur_krw: 1450,
} as const;

export type FxRates = {
  usd_krw: number;
  eur_krw: number;
};

export type FxRateTable = Record<BidCurrency, number>;

export const CURRENCIES: CurrencyMeta[] = [
  { code: "KRW", label: "KRW · Korean Won", shortLabel: "KRW", symbol: "₩", decimals: 0 },
  { code: "USD", label: "USD · US Dollar", shortLabel: "USD", symbol: "$", decimals: 2 },
  { code: "EUR", label: "EUR · Euro", shortLabel: "EUR", symbol: "€", decimals: 2 },
];

export function isBidCurrency(value: unknown): value is BidCurrency {
  return (
    typeof value === "string" &&
    (CURRENCY_CODES as readonly string[]).includes(value)
  );
}

export function getCurrencyMeta(code: BidCurrency): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function normalizeFxRates(raw?: Partial<FxRates> | null): FxRates {
  const usd = Number(raw?.usd_krw);
  const eur = Number(raw?.eur_krw);
  return {
    usd_krw:
      Number.isFinite(usd) && usd > 0 ? Math.round(usd) : DEFAULT_FX_RATES.usd_krw,
    eur_krw:
      Number.isFinite(eur) && eur > 0 ? Math.round(eur) : DEFAULT_FX_RATES.eur_krw,
  };
}

export function fxRatesToTable(rates: FxRates): FxRateTable {
  const n = normalizeFxRates(rates);
  return {
    KRW: 1,
    USD: n.usd_krw,
    EUR: n.eur_krw,
  };
}

export function defaultFxTable(): FxRateTable {
  return fxRatesToTable(DEFAULT_FX_RATES);
}

export function toKrw(
  amount: number,
  currency: BidCurrency,
  rates: FxRateTable = defaultFxTable()
): number {
  if (!Number.isFinite(amount) || amount <= 0) return NaN;
  return Math.round(amount * (rates[currency] || 1));
}

export function toKrwBid(
  amount: number,
  currency: BidCurrency,
  rates: FxRateTable = defaultFxTable()
): number {
  const raw = toKrw(amount, currency, rates);
  if (!Number.isFinite(raw) || raw <= 0) return NaN;
  const snapped = Math.round(raw / BID_INCREMENT) * BID_INCREMENT;
  return Math.max(BID_INCREMENT, snapped);
}

export function fromKrw(
  krw: number,
  currency: BidCurrency,
  rates: FxRateTable = defaultFxTable()
): number {
  if (!Number.isFinite(krw)) return NaN;
  const rate = rates[currency] || 1;
  const decimals = getCurrencyMeta(currency).decimals;
  const raw = krw / rate;
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}

export function formatMoney(amount: number, currency: BidCurrency = "KRW") {
  const meta = getCurrencyMeta(currency);
  const n = Number(amount) || 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(n);
  return `${meta.shortLabel} ${formatted}`;
}

export function formatMoneyInput(value: string | number, currency: BidCurrency) {
  const meta = getCurrencyMeta(currency);
  const raw = String(value ?? "");
  if (meta.decimals === 0) {
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat("en-US").format(Number(digits));
  }

  const cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0] || "";
  const decPart = (parts[1] || "").slice(0, meta.decimals);
  if (!intPart && !decPart && !cleaned.includes(".")) return "";
  const intFormatted = intPart
    ? new Intl.NumberFormat("en-US").format(Number(intPart))
    : "0";
  if (cleaned.endsWith(".") && !decPart) return `${intFormatted}.`;
  if (parts.length > 1) return `${intFormatted}.${decPart}`;
  return intFormatted;
}

export function parseMoneyInput(value: string, currency: BidCurrency) {
  const meta = getCurrencyMeta(currency);
  if (meta.decimals === 0) {
    const digits = String(value ?? "").replace(/[^\d]/g, "");
    if (!digits) return NaN;
    return Number(digits);
  }
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleaned || cleaned === ".") return NaN;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  const factor = 10 ** meta.decimals;
  return Math.round(n * factor) / factor;
}

export function formatBidWithCurrency(
  bid: {
    amount: number;
    currency?: string | null;
    amount_input?: number | null;
  },
  rates: FxRateTable = fxRatesToTable(DEFAULT_FX_RATES)
) {
  const currency = isBidCurrency(bid.currency) ? bid.currency : "KRW";
  const krwLabel = `KRW ${new Intl.NumberFormat("en-US").format(
    Math.round(Number(bid.amount) || 0)
  )}`;
  if (currency === "KRW") return krwLabel;
  const input =
    bid.amount_input != null && Number(bid.amount_input) > 0
      ? Number(bid.amount_input)
      : fromKrw(Number(bid.amount) || 0, currency, rates);
  return `${formatMoney(input, currency)} (≈ ${krwLabel})`;
}
