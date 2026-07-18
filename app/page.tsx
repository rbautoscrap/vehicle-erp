"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, useAuth } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { formatBidWithCurrency } from "@/lib/currency";
import { formatWon } from "@/lib/format";
import { fuelTypeLabelEn, saleTypeLabelEn } from "@/lib/labels";

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
  end_at: string;
  highest_bid: number | null;
  bid_count?: number;
  status: "upcoming" | "live" | "ended";
  has_my_bid?: boolean;
  my_bid?: {
    id: number;
    amount: number;
    currency?: string;
    amount_input?: number;
    created_at: string;
  } | null;
};

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{
    photos: string[];
    index: number;
    alt: string;
  } | null>(null);

  const load = useCallback(async (pageNum: number) => {
    const res = await fetch(`/api/auctions?page=${pageNum}`);
    if (res.ok) {
      const data = await res.json();
      const nextTotalPages = Math.max(1, Number(data.total_pages) || 1);
      let nextPage = Number(data.page) || pageNum;
      if (nextPage > nextTotalPages) nextPage = nextTotalPages;
      setAuctions(data.auctions || []);
      setPage(nextPage);
      setPageSize(Number(data.page_size) || 7);
      setTotalPages(nextTotalPages);
      setTotal(Number(data.total) || 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load(page);
    const id = setInterval(() => load(page), 5000);
    return () => clearInterval(id);
  }, [load, page]);

  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) return;
    setLoading(true);
    setPage(next);
  }

  return (
    <AppShell title="Live auctions">
      <p className="page-desc">
        Only auctions that have not ended are shown. Items you have bid on are outlined in
        blue. Click a photo to enlarge. Up to 7 live items are shown per page.
      </p>

      {loading && auctions.length === 0 ? (
        <p className="page-desc">Loading…</p>
      ) : auctions.length === 0 ? (
        <div className="empty">There are no live auctions right now.</div>
      ) : (
        <>
          <div className="list-meta">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {(page - 1) * pageSize + auctions.length} of {total}
            </span>
            <span>
              Page {page} / {totalPages}
            </span>
          </div>

          <div className="stack">
            {auctions.map((a) => {
              const hasBid = Boolean(a.has_my_bid && a.my_bid);
              const photos = a.photos || [];
              return (
                <div
                  key={a.id}
                  className={`auction-row${hasBid ? " auction-row-bid" : ""}`}
                >
                  <div className="auction-list-main">
                    {photos[0] ? (
                      <button
                        type="button"
                        className="list-thumb-btn"
                        onClick={() =>
                          setLightbox({
                            photos,
                            index: 0,
                            alt: a.vehicle_type || a.title,
                          })
                        }
                        aria-label="View enlarged photo"
                      >
                        <img
                          className="list-thumb"
                          src={photos[0]}
                          alt={a.vehicle_type}
                        />
                      </button>
                    ) : (
                      <div className="list-thumb list-thumb-empty">No photo</div>
                    )}
                    <Link href={`/auctions/${a.id}`} style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="actions"
                        style={{ justifyContent: "space-between" }}
                      >
                        <h3>
                          {a.year} {a.vehicle_type || a.title}
                        </h3>
                        <div className="actions">
                          {hasBid && <span className="badge badge-bid">Your bid</span>}
                          <span className="badge badge-live">Live</span>
                        </div>
                      </div>
                      <div className="auction-meta">
                        {a.sale_type && (
                          <span className="badge">{saleTypeLabelEn(a.sale_type)}</span>
                        )}
                        <span>{fuelTypeLabelEn(a.fuel_type)}</span>
                        <span>{a.storage_location}</span>
                        {hasBid && a.my_bid && (
                          <span className="my-bid-amount">
                            Your bid{" "}
                            <strong>{formatBidWithCurrency(a.my_bid)}</strong>
                          </span>
                        )}
                        {isAdmin && (
                          <>
                            <span>
                              Current{" "}
                              <strong style={{ color: "var(--ink)" }}>
                                {formatWon(a.highest_bid ?? a.start_price)}
                              </strong>
                            </span>
                            {typeof a.bid_count === "number" && (
                              <span>
                                {a.bid_count} bid{a.bid_count === 1 ? "" : "s"}
                              </span>
                            )}
                          </>
                        )}
                        <span>
                          Time left <Countdown endAt={a.end_at} />
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Auction pages">
              <button
                type="button"
                className="btn"
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </button>
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`btn${n === page ? " pagination-active" : ""}`}
                    disabled={loading || n === page}
                    onClick={() => goToPage(n)}
                    aria-current={n === page ? "page" : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn"
                disabled={page >= totalPages || loading}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) =>
            setLightbox((prev) => (prev ? { ...prev, index } : prev))
          }
        />
      )}
    </AppShell>
  );
}
