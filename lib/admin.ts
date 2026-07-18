export const MAX_PHOTOS = 20;
export const FUEL_OPTIONS = [
  "가솔린",
  "디젤",
  "LPG",
  "하이브리드",
  "전기",
  "기타",
] as const;

export type AdminAuction = {
  id: number;
  title: string;
  vehicle_type: string;
  year: string;
  fuel_type: string;
  storage_location: string;
  sale_type: string;
  notes: string;
  result_memo?: string;
  result_status?: "pending" | "confirmed" | "unsold";
  winner_bid_id?: number | null;
  closed_at?: string | null;
  photos: string[];
  start_price: number;
  start_at: string;
  end_at: string;
  highest_bid: number | null;
  bid_count: number;
  status: "upcoming" | "live" | "ended";
};

export type AuctionFormState = {
  vehicle_type: string;
  year: string;
  fuel_type: string;
  storage_location: string;
  sale_type: string;
  notes: string;
  start_price: string;
  start_at: string;
  end_at: string;
};

export const emptyAuctionForm: AuctionFormState = {
  vehicle_type: "",
  year: "",
  fuel_type: "가솔린",
  storage_location: "",
  sale_type: "폐차",
  notes: "",
  start_price: "10000",
  start_at: "",
  end_at: "",
};

export function defaultAuctionTimes() {
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    start_at: toLocal(start),
    end_at: toLocal(end),
  };
}

export function auctionToForm(a: AdminAuction): AuctionFormState {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return {
    vehicle_type: a.vehicle_type || a.title || "",
    year: a.year || "",
    fuel_type: a.fuel_type || "가솔린",
    storage_location: a.storage_location || "",
    sale_type: a.sale_type || "폐차",
    notes: a.notes || "",
    start_price: String(a.start_price ?? 0),
    start_at: toLocal(a.start_at),
    end_at: toLocal(a.end_at),
  };
}

export function statusBadgeClass(status: AdminAuction["status"]) {
  if (status === "live") return "badge-live";
  if (status === "ended") return "badge-ended";
  return "badge-upcoming";
}

export function statusLabel(status: AdminAuction["status"]) {
  if (status === "live") return "진행중";
  if (status === "ended") return "마감";
  return "대기";
}
