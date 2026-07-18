export const BID_INCREMENT = 1000;

/** Format amount in KRW (원). Values are always whole won units. */
export function formatWon(amount: number) {
  const n = Math.round(Number(amount) || 0);
  return `KRW ${new Intl.NumberFormat("en-US").format(n)}`;
}

/** Numeric string with thousand separators for KRW input display. */
export function formatWonInput(amount: number | string) {
  const digits = String(amount ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("en-US").format(Number(digits));
}

/** Parse KRW input (commas / spaces / currency labels allowed) into won integer. */
export function parseWonInput(value: string) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return NaN;
  return Number(digits);
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minimum sealed bid: start_price rounded up to the next multiple of 1000 if needed. */
export function minSealedBid(startPrice: number) {
  if (startPrice <= 0) return BID_INCREMENT;
  return Math.ceil(startPrice / BID_INCREMENT) * BID_INCREMENT;
}

export function isValidBidAmount(amount: number, startPrice: number) {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (amount < startPrice) return false;
  if (amount % BID_INCREMENT !== 0) return false;
  return amount >= minSealedBid(startPrice);
}

export function remainingLabel(endAt: string, now = Date.now()) {
  const diff = new Date(endAt).getTime() - now;
  if (diff <= 0) return "Ended";
  const sec = Math.floor(diff / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
