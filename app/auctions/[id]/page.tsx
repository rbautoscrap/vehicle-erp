"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import {
  BID_INCREMENT,
  formatDateTime,
  formatWon,
  minSealedBid,
} from "@/lib/format";
import { fuelTypeLabelEn, saleTypeLabelEn } from "@/lib/labels";
import {
  CURRENCIES,
  defaultFxTable,
  formatBidWithCurrency,
  formatMoney,
  formatMoneyInput,
  fromKrw,
  getCurrencyMeta,
  isBidCurrency,
  parseMoneyInput,
  toKrwBid,
  type BidCurrency,
  type FxRateTable,
} from "@/lib/currency";

type Auction = {
  id: number;
  title: string;
  vehicle_type: string;
  year: string;
  fuel_type: string;
  storage_location: string;
  sale_type: string;
  notes: string;
  photos: string[];
  start_price: number;
  start_at: string;
  end_at: string;
  highest_bid: number | null;
  bid_count?: number;
  status: "upcoming" | "live" | "ended";
};

type Bid = {
  id: number;
  amount: number;
  currency?: BidCurrency;
  amount_input?: number;
  created_at: string;
  username: string;
};

type MyBid = {
  id: number;
  amount: number;
  currency?: BidCurrency;
  amount_input?: number;
  created_at: string;
};

export default function AuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const id = String(params.id);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBid, setMyBid] = useState<MyBid | null>(null);
  const [currency, setCurrency] = useState<BidCurrency>("KRW");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [fxTable, setFxTable] = useState<FxRateTable>(() => defaultFxTable());
  const amountSeeded = useRef(false);
  const fxTableRef = useRef(fxTable);
  fxTableRef.current = fxTable;

  const loadFx = useCallback(async () => {
    const res = await fetch("/api/fx");
    if (!res.ok) return;
    const data = await res.json();
    if (data.table) setFxTable(data.table as FxRateTable);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/auctions/${id}`);
    if (res.status === 404) {
      setAuction(null);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setAuction(data.auction);
    setBids(data.bids || []);
    setMyBid(data.my_bid || null);
    if (data.my_bid && !amountSeeded.current) {
      const c = isBidCurrency(data.my_bid.currency) ? data.my_bid.currency : "KRW";
      const input =
        data.my_bid.amount_input != null && data.my_bid.amount_input > 0
          ? data.my_bid.amount_input
          : fromKrw(data.my_bid.amount, c, fxTableRef.current);
      setCurrency(c);
      setAmount(formatMoneyInput(input, c));
      amountSeeded.current = true;
    }
  }, [id]);

  useEffect(() => {
    amountSeeded.current = false;
    setAmount("");
    setCurrency("KRW");
    setMyBid(null);
  }, [id]);

  useEffect(() => {
    loadFx();
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load, loadFx]);

  useEffect(() => {
    setActivePhoto(0);
  }, [auction?.id]);

  const currencyMeta = getCurrencyMeta(currency);
  const parsedInput = parseMoneyInput(amount, currency);
  const parsedKrw = useMemo(() => {
    if (Number.isNaN(parsedInput) || parsedInput <= 0) return NaN;
    return toKrwBid(parsedInput, currency, fxTable);
  }, [parsedInput, currency, fxTable]);

  function onCurrencyChange(next: BidCurrency) {
    const prevValue = parseMoneyInput(amount, currency);
    setCurrency(next);
    if (!Number.isNaN(prevValue) && prevValue > 0) {
      // Keep KRW value stable when switching currency
      const krw = toKrwBid(prevValue, currency, fxTable);
      const converted = fromKrw(krw, next, fxTable);
      setAmount(formatMoneyInput(converted, next));
    } else {
      setAmount("");
    }
  }

  async function onBid(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!auction) return;
    const value = parseMoneyInput(amount, currency);
    const krw = toKrwBid(value, currency, fxTable);
    const minBid = minSealedBid(auction.start_price);

    if (Number.isNaN(value) || value <= 0 || Number.isNaN(krw)) {
      setError("Enter a valid bid amount.");
      return;
    }
    if (krw < auction.start_price || krw < minBid) {
      setError(
        `Minimum bid is ${formatWon(minBid)}. Your entry converts to ${formatWon(krw)}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auctions/${id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bid failed");
        return;
      }
      if (data.my_bid) {
        setMyBid(data.my_bid);
        const c = isBidCurrency(data.my_bid.currency) ? data.my_bid.currency : "KRW";
        setCurrency(c);
        setAmount(
          formatMoneyInput(
            data.my_bid.amount_input ?? fromKrw(data.my_bid.amount, c, fxTable),
            c
          )
        );
      }
      setMessage(
        data.updated ? "Your bid has been updated." : "Your bid has been placed."
      );
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (!auction) {
    return (
      <AppShell>
        <div className="empty">
          Auction not found or it has ended and is hidden.
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => router.push("/")}>
              Back to list
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const minBid = minSealedBid(auction.start_price);
  const photos = auction.photos || [];
  const hasMyBid = myBid != null;
  const minInCurrency = fromKrw(minBid, currency, fxTable);

  return (
    <AppShell>
      <button type="button" className="btn btn-ghost" onClick={() => router.push("/")}>
        ← List
      </button>

      <div className="actions" style={{ marginTop: 8, marginBottom: 8 }}>
        <span className="badge badge-live">Live</span>
        <span className="badge">Multi-currency</span>
      </div>
      <h1 className="page-title" style={{ marginTop: 4 }}>
        {auction.year} {auction.vehicle_type || auction.title}
      </h1>
      <div className="auction-meta" style={{ marginBottom: 14 }}>
        <span>
          Time left <Countdown endAt={auction.end_at} />
        </span>
      </div>

      {!isAdmin && (
        <section className="bid-panel" aria-label="Place bid">
          <div className="bid-panel-head">
            <div>
              <h2>Your bid</h2>
              <p>
                Choose KRW / USD / EUR (and more), then enter the amount. Ranking uses KRW
                conversion. Minimum {formatWon(minBid)} · steps {formatWon(BID_INCREMENT)}.
              </p>
            </div>
            {hasMyBid && (
              <div className="bid-panel-current">
                <span>Current</span>
                <strong>{formatBidWithCurrency(myBid, fxTable)}</strong>
              </div>
            )}
          </div>

          <form className="bid-panel-form" onSubmit={onBid}>
            <div className="bid-currency-row">
              <label htmlFor="bid_currency" className="bid-panel-label">
                Currency
              </label>
              <select
                id="bid_currency"
                className="bid-currency-select"
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value as BidCurrency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <label htmlFor="bid" className="bid-panel-label">
              Bid amount ({currencyMeta.shortLabel})
            </label>
            <div className="bid-form bid-form-krw">
              <span className="bid-currency" aria-hidden="true">
                {currencyMeta.shortLabel}
              </span>
              <input
                id="bid"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(formatMoneyInput(e.target.value, currency))}
                placeholder={formatMoneyInput(minInCurrency, currency)}
                required
              />
              <span className="bid-unit" aria-hidden="true">
                {currencyMeta.symbol}
              </span>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting
                  ? "Saving…"
                  : hasMyBid
                    ? "Update bid"
                    : "Place bid"}
              </button>
            </div>
            {!Number.isNaN(parsedInput) && parsedInput > 0 && (
              <p className="bid-preview">
                {formatMoney(parsedInput, currency)}
                {currency !== "KRW" && !Number.isNaN(parsedKrw)
                  ? ` ≈ ${formatWon(parsedKrw)} · rate 1 ${currency} = ${formatWon(
                      fxTable[currency]
                    )}`
                  : ""}
              </p>
            )}
            {error && <p className="error">{error}</p>}
            {message && <p className="bid-success">{message}</p>}
            <p className="field-hint">
              Sealed bidding — other users cannot see your amount. All bids are compared in
              KRW after conversion.
            </p>
          </form>
        </section>
      )}

      <div className="detail-header">
        {photos.length > 0 && (
          <div className="photo-viewer">
            <button
              type="button"
              className="photo-main-btn"
              onClick={() => setLightboxOpen(true)}
              aria-label="View enlarged photo"
            >
              <img
                className="photo-main"
                src={photos[activePhoto] || photos[0]}
                alt={`${auction.vehicle_type} photo`}
              />
            </button>
            <div className="photo-grid">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={`photo-thumb ${i === activePhoto ? "is-active" : ""}`}
                  onClick={() => {
                    setActivePhoto(i);
                    setLightboxOpen(true);
                  }}
                >
                  <img src={src} alt={`Photo ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {lightboxOpen && photos.length > 0 && (
          <PhotoLightbox
            photos={photos}
            index={activePhoto}
            alt={auction.vehicle_type || auction.title}
            onClose={() => setLightboxOpen(false)}
            onIndexChange={setActivePhoto}
          />
        )}

        <dl className="spec-list">
          <div>
            <dt>Vehicle</dt>
            <dd>{auction.vehicle_type || "-"}</dd>
          </div>
          <div>
            <dt>Year</dt>
            <dd>{auction.year || "-"}</dd>
          </div>
          <div>
            <dt>Fuel</dt>
            <dd>{fuelTypeLabelEn(auction.fuel_type)}</dd>
          </div>
          <div>
            <dt>Sale type</dt>
            <dd>{saleTypeLabelEn(auction.sale_type)}</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>{auction.storage_location || "-"}</dd>
          </div>
        </dl>

        {auction.notes && (
          <div className="notes-box">
            <strong>Notes</strong>
            <p>{auction.notes}</p>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="detail-price">
              {formatWon(auction.highest_bid ?? auction.start_price)}
            </div>
            <div className="auction-meta">
              {typeof auction.bid_count === "number" && (
                <span>
                  {auction.bid_count} bid{auction.bid_count === 1 ? "" : "s"}
                </span>
              )}
              <span>Ends {formatDateTime(auction.end_at)}</span>
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <section className="bid-list">
          <h2>Live bids (admin) · ranked in KRW</h2>
          <p className="field-hint">Updates every 3 seconds. Shows entered currency too.</p>
          {bids.length === 0 ? (
            <div className="empty">No bids yet.</div>
          ) : (
            bids.map((b, idx) => (
              <div key={b.id} className="bid-item">
                <span>
                  #{idx + 1} <span className="bid-user">@{b.username}</span> ·{" "}
                  <span className="bid-amount">{formatBidWithCurrency(b, fxTable)}</span>
                </span>
                <span style={{ color: "var(--muted)" }}>{formatDateTime(b.created_at)}</span>
              </div>
            ))
          )}
        </section>
      )}
    </AppShell>
  );
}
