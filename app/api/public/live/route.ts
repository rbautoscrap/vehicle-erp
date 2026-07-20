import { NextResponse } from "next/server";
import { readStore, resolveAuctionStatus } from "@/lib/db";
import { toServablePhotoUrl } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_LIVE_LIMIT = 6;

/** Brief live auction teaser for the login page (no bids / no detail). */
export async function GET() {
  const store = readStore();
  const allLive = store.auctions.filter(
    (a) => resolveAuctionStatus(a) === "live"
  );

  const auctions = allLive
    .sort(
      (a, b) => new Date(a.end_at).getTime() - new Date(b.end_at).getTime()
    )
    .slice(0, PUBLIC_LIVE_LIMIT)
    .map((a) => {
      const photos = Array.isArray(a.photos) ? a.photos : [];
      const thumb = photos[0] ? toServablePhotoUrl(String(photos[0])) : null;
      return {
        id: a.id,
        year: a.year || "",
        vehicle_type: a.vehicle_type || a.title || "Vehicle",
        fuel_type: a.fuel_type || "",
        sale_type: a.sale_type || "",
        end_at: a.end_at,
        thumb,
      };
    });

  return NextResponse.json(
    {
      auctions,
      total_live: allLive.length,
      limit: PUBLIC_LIVE_LIMIT,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
