"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { formatDateTime, formatWon } from "@/lib/format";
import { fuelTypeLabelEn, saleTypeLabelEn } from "@/lib/labels";

type WinRow = {
  win_amount: number;
  won_at: string;
  bid_at: string;
  auction: {
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
  };
};

export default function MyWinsPage() {
  const [wins, setWins] = useState<WinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [lightbox, setLightbox] = useState<{
    photos: string[];
    index: number;
    alt: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/me/wins");
    if (res.ok) {
      const data = await res.json();
      setWins(data.wins || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadPhotos(auctionId: number) {
    setDownloadError("");
    setDownloadingId(auctionId);
    try {
      const res = await fetch(`/api/me/wins/${auctionId}/photos`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError(data.error || "Download failed.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `auction-${auctionId}-photos.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not download photos. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AppShell title="My winning bids">
      <p className="page-desc">
        Vehicles appear here only after an administrator confirms the winning
        result. Pending auctions stay hidden until confirmation.
      </p>

      {downloadError && <p className="error">{downloadError}</p>}

      {loading ? (
        <p className="page-desc">Loading…</p>
      ) : wins.length === 0 ? (
        <div className="empty">
          No winning bids yet.{" "}
          <Link href="/" style={{ color: "var(--accent)" }}>
            Browse live auctions
          </Link>
        </div>
      ) : (
        <div className="stack">
          {wins.map((w) => {
            const a = w.auction;
            const photoCount = a.photos?.length || 0;
            return (
              <div key={a.id} className="auction-row auction-row-bid">
                <div className="auction-list-main">
                  {a.photos?.[0] ? (
                    <button
                      type="button"
                      className="list-thumb-btn"
                      onClick={() =>
                        setLightbox({
                          photos: a.photos,
                          index: 0,
                          alt: a.vehicle_type || a.title,
                        })
                      }
                      aria-label="View enlarged photo"
                    >
                      <img className="list-thumb" src={a.photos[0]} alt={a.vehicle_type} />
                    </button>
                  ) : (
                    <div className="list-thumb list-thumb-empty">No photo</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="actions" style={{ justifyContent: "space-between" }}>
                      <h3>
                        {a.year} {a.vehicle_type || a.title}
                      </h3>
                      <span className="badge badge-bid">Won</span>
                    </div>
                    <div className="detail-price" style={{ margin: "8px 0 4px" }}>
                      {formatWon(w.win_amount)}
                    </div>
                    <div className="auction-meta">
                      {a.sale_type && <span>{saleTypeLabelEn(a.sale_type)}</span>}
                      <span>{fuelTypeLabelEn(a.fuel_type)}</span>
                      <span>{a.storage_location}</span>
                      <span>Ended {formatDateTime(w.won_at)}</span>
                    </div>
                    {a.notes && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "var(--muted)",
                          fontSize: "0.88rem",
                        }}
                      >
                        {a.notes}
                      </p>
                    )}
                    {photoCount > 0 && (
                      <div className="actions" style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={downloadingId === a.id}
                          onClick={() => downloadPhotos(a.id)}
                        >
                          {downloadingId === a.id
                            ? "Preparing ZIP…"
                            : `Download all photos (${photoCount})`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
        />
      )}
    </AppShell>
  );
}
