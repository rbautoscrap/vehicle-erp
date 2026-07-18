import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import {
  isBidCurrency,
  normalizeFxRates,
  type BidCurrency,
  type FxRates,
} from "@/lib/currency";
import { normalizeSaleType } from "@/lib/saleTypes";
import { toServablePhotoUrl } from "@/lib/uploads";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "store.json");

/** Absolute paths for backup/restore and other data tools. */
export function getDataPaths() {
  return {
    dataDir,
    dbPath,
    uploadsDir: path.join(dataDir, "uploads"),
  };
}

export type Role = "admin" | "user";
export type UserStatus = "pending" | "active" | "suspended";

export type User = {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  created_at: string;
};

export type PublicUser = {
  id: number;
  username: string;
  role: Role;
  status: UserStatus;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
};

export type Auction = {
  id: number;
  title: string;
  vehicle_type: string;
  year: string;
  fuel_type: string;
  storage_location: string;
  sale_type: string;
  notes: string;
  result_memo: string;
  result_status: "pending" | "confirmed" | "unsold";
  /** Admin-selected winning bid; null = use highest bid */
  winner_bid_id: number | null;
  /** When set, auction is closed early (before end_at) */
  closed_at: string | null;
  photos: string[];
  description: string;
  start_price: number;
  start_at: string;
  end_at: string;
  created_by: number;
  created_at: string;
};

export type { BidCurrency };

export type Bid = {
  id: number;
  auction_id: number;
  user_id: number;
  /** Always stored in KRW for fair ranking */
  amount: number;
  /** Currency the bidder selected when entering the amount */
  currency: BidCurrency;
  /** Amount as entered in `currency` (before KRW conversion) */
  amount_input: number;
  created_at: string;
};

function normalizeBid(raw: Partial<Bid> & { id: number }): Bid {
  const amount = Number(raw.amount) || 0;
  const currency: BidCurrency = isBidCurrency(raw.currency)
    ? raw.currency
    : "KRW";
  const amountInput = Number(raw.amount_input);
  return {
    id: raw.id,
    auction_id: Number(raw.auction_id) || 0,
    user_id: Number(raw.user_id) || 0,
    amount,
    currency,
    // Drop foreign amount_input when currency was removed (e.g. legacy JPY/CNY)
    amount_input:
      isBidCurrency(raw.currency) &&
      Number.isFinite(amountInput) &&
      amountInput > 0
        ? amountInput
        : amount,
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

export type AuctionWithMeta = Auction & {
  highest_bid: number | null;
  bid_count: number;
  status: "upcoming" | "live" | "ended";
};

type Store = {
  users: User[];
  auctions: Auction[];
  bids: Bid[];
  fx_rates: FxRates;
  nextUserId: number;
  nextAuctionId: number;
  nextBidId: number;
};

function defaultStore(): Store {
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: 1,
        username: "admin",
        password_hash: bcrypt.hashSync("admin123", 10),
        role: "admin",
        status: "active",
        name: "Administrator",
        email: "admin@example.com",
        phone: "",
        address: "",
        company: "KOREA AUTO AUTION",
        created_at: now,
      },
    ],
    auctions: [],
    bids: [],
    fx_rates: normalizeFxRates(null),
    nextUserId: 2,
    nextAuctionId: 1,
    nextBidId: 1,
  };
}

function normalizeUser(raw: Partial<User> & { id: number }): User {
  return {
    id: raw.id,
    username: String(raw.username || "").trim(),
    password_hash: String(raw.password_hash || ""),
    role: raw.role === "admin" ? "admin" : "user",
    status:
      raw.status === "suspended"
        ? "suspended"
        : raw.status === "pending"
          ? "pending"
          : "active",
    name: String(raw.name || raw.username || "").trim(),
    email: String(raw.email || "").trim(),
    phone: String(raw.phone || "").trim(),
    address: String(raw.address || "").trim(),
    company: String(raw.company || "").trim(),
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

function normalizeAuction(raw: Partial<Auction> & { id: number }): Auction {
  const vehicleType = String(raw.vehicle_type || raw.title || "").trim();
  const notes = String(raw.notes || raw.description || "").trim();
  const originalTitle = String(raw.title || "").trim();
  return {
    id: raw.id,
    // Keep the first-registered product name; fall back to vehicle type only if missing.
    title: originalTitle || vehicleType || "Vehicle",
    vehicle_type: vehicleType || originalTitle,
    year: String(raw.year || "").trim(),
    fuel_type: (() => {
      const rawFuel = String(raw.fuel_type || "").trim();
      const map: Record<string, string> = {
        Gasoline: "가솔린",
        Diesel: "디젤",
        Hybrid: "하이브리드",
        Electric: "전기",
        Other: "기타",
      };
      return map[rawFuel] || rawFuel;
    })(),
    storage_location: String(raw.storage_location || "").trim(),
    sale_type: normalizeSaleType(String(raw.sale_type || "")),
    notes,
    result_memo: String(raw.result_memo || "").trim(),
    result_status:
      raw.result_status === "confirmed" || raw.result_status === "unsold"
        ? raw.result_status
        : "pending",
    winner_bid_id: (() => {
      const n = Number(raw.winner_bid_id);
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
    closed_at: raw.closed_at ? String(raw.closed_at) : null,
    photos: Array.isArray(raw.photos)
      ? raw.photos.map((p) => toServablePhotoUrl(String(p)))
      : [],
    description: notes,
    start_price: Number(raw.start_price) || 0,
    start_at: String(raw.start_at || ""),
    end_at: String(raw.end_at || ""),
    created_by: Number(raw.created_by) || 0,
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

function ensureStore(): Store {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    const store = defaultStore();
    fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), "utf8");
    return store;
  }

  let parsed: Store;
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    parsed = JSON.parse(raw) as Store;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Store root is not an object");
    }
  } catch (err) {
    const backup = `${dbPath}.corrupt-${Date.now()}.bak`;
    try {
      fs.copyFileSync(dbPath, backup);
    } catch {
      /* ignore backup failure */
    }
    console.error("[db] Corrupt store.json — restored defaults. Backup:", backup, err);
    const store = defaultStore();
    fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), "utf8");
    return store;
  }

  parsed.users = (parsed.users || []).map((u) => normalizeUser(u));
  parsed.auctions = (parsed.auctions || []).map((a) => normalizeAuction(a));
  parsed.bids = Array.isArray(parsed.bids)
    ? parsed.bids.map((b) => normalizeBid(b as Partial<Bid> & { id: number }))
    : [];
  parsed.fx_rates = normalizeFxRates(
    (parsed as Store & { fx_rates?: Partial<FxRates> }).fx_rates
  );
  parsed.nextUserId = Number(parsed.nextUserId) || parsed.users.length + 1;
  parsed.nextAuctionId = Number(parsed.nextAuctionId) || 1;
  parsed.nextBidId = Number(parsed.nextBidId) || 1;

  if (!parsed.users.some((u) => u.role === "admin")) {
    parsed.users.push({
      id: parsed.nextUserId++,
      username: "admin",
      password_hash: bcrypt.hashSync("admin123", 10),
      role: "admin",
      status: "active",
      name: "Administrator",
      email: "admin@example.com",
      phone: "",
      address: "",
      company: "KOREA AUTO AUTION",
      created_at: new Date().toISOString(),
    });
    saveStore(parsed);
  }

  return parsed;
}

function saveStore(store: Store) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), "utf8");
}

export function readStore() {
  return ensureStore();
}

export function writeStore(mutator: (store: Store) => void) {
  const store = ensureStore();
  mutator(store);
  saveStore(store);
  return store;
}

export function getFxRates(): FxRates {
  return normalizeFxRates(ensureStore().fx_rates);
}

export function updateFxRates(input: Partial<FxRates>): FxRates {
  let next = normalizeFxRates(null);
  writeStore((store) => {
    next = normalizeFxRates({
      usd_krw: input.usd_krw ?? store.fx_rates?.usd_krw,
      eur_krw: input.eur_krw ?? store.fx_rates?.eur_krw,
    });
    store.fx_rates = next;
  });
  return next;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    company: user.company,
  };
}

export type AdminUserView = PublicUser & {
  created_at: string;
};

export function toAdminUserView(user: User): AdminUserView {
  return {
    ...toPublicUser(user),
    created_at: user.created_at,
  };
}

export function auctionStatus(
  startAt: string,
  endAt: string,
  now = new Date()
): "upcoming" | "live" | "ended" {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t >= end) return "ended";
  return "live";
}

/** Prefer early close (`closed_at`) over scheduled `end_at`. */
export function resolveAuctionStatus(
  auction: Pick<Auction, "start_at" | "end_at" | "closed_at">,
  now = new Date()
): "upcoming" | "live" | "ended" {
  if (auction.closed_at) return "ended";
  return auctionStatus(auction.start_at, auction.end_at, now);
}

export function auctionClosedAt(
  auction: Pick<Auction, "end_at" | "closed_at">
): string {
  return auction.closed_at || auction.end_at;
}

export function withAuctionMeta(auction: Auction, store = readStore()): AuctionWithMeta {
  const normalized = normalizeAuction(auction);
  const bids = store.bids.filter((b) => b.auction_id === auction.id);
  const highest = bids.reduce<number | null>(
    (max, b) => (max == null || b.amount > max ? b.amount : max),
    null
  );
  return {
    ...normalized,
    highest_bid: highest,
    bid_count: bids.length,
    status: resolveAuctionStatus(normalized),
  };
}

/** Strip bid amounts/counts for sealed bidding (non-admin clients). */
export function sealAuctionForUser(meta: AuctionWithMeta) {
  const { bid_count: _bidCount, ...rest } = meta;
  return {
    ...rest,
    highest_bid: null as null,
  };
}

function highestBid(bids: Bid[]): Bid | null {
  if (bids.length === 0) return null;
  return bids.reduce((best, b) => {
    if (b.amount > best.amount) return b;
    if (b.amount === best.amount && b.created_at < best.created_at) return b;
    return best;
  });
}

export function getWinningBid(auctionId: number, store = readStore()) {
  const auction = store.auctions.find((a) => a.id === auctionId);
  const bids = store.bids.filter((b) => b.auction_id === auctionId);
  if (auction?.winner_bid_id != null) {
    const chosen = bids.find((b) => b.id === auction.winner_bid_id);
    if (chosen) return chosen;
  }
  return highestBid(bids);
}
