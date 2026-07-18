import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readStore, withAuctionMeta } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real-time bidding board for admins (live + upcoming auctions with bid feed). */
export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const now = Date.now();

  const auctions = store.auctions
    .map((a) => withAuctionMeta(a, store))
    .filter((a) => a.status === "live" || a.status === "upcoming")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      return new Date(a.end_at).getTime() - new Date(b.end_at).getTime();
    });

  const items = auctions.map((auction) => {
    const bids = store.bids
      .filter((b) => b.auction_id === auction.id)
      .map((b) => {
        const user = store.users.find((u) => u.id === b.user_id);
        return {
          id: b.id,
          amount: b.amount,
          currency: b.currency || "KRW",
          amount_input: b.amount_input ?? b.amount,
          created_at: b.created_at,
          username: user?.username ?? "unknown",
          name: user?.name || user?.username || "unknown",
        };
      })
      .sort(
        (a, b) =>
          b.amount - a.amount || a.created_at.localeCompare(b.created_at)
      );

    return {
      auction,
      bids,
      latest_bid_at: bids.reduce<string | null>((latest, b) => {
        if (!latest || b.created_at > latest) return b.created_at;
        return latest;
      }, null),
      server_time: new Date(now).toISOString(),
    };
  });

  return NextResponse.json({
    items,
    server_time: new Date(now).toISOString(),
  });
}
