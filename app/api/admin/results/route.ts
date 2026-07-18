import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  readStore,
  withAuctionMeta,
  resolveAuctionStatus,
  getWinningBid,
  auctionClosedAt,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const results = store.auctions
    .filter((a) => resolveAuctionStatus(a) === "ended")
    .map((a) => {
      const meta = withAuctionMeta(a, store);
      const winning = getWinningBid(a.id, store);
      const winnerUser = winning
        ? store.users.find((u) => u.id === winning.user_id)
        : null;

      return {
        auction: meta,
        winner: winning
          ? {
              user_id: winning.user_id,
              username: winnerUser?.username ?? "unknown",
              name: winnerUser?.name || winnerUser?.username || "unknown",
              phone: winnerUser?.phone || "",
              address: winnerUser?.address || "",
              amount: winning.amount,
              bid_at: winning.created_at,
            }
          : null,
      };
    })
    .sort((a, b) =>
      auctionClosedAt(b.auction).localeCompare(auctionClosedAt(a.auction))
    );

  return NextResponse.json({ results });
}
