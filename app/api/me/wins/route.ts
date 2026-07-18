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

/** Ended auctions won by the current user, only after admin confirmation. */
export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const wins = store.auctions
    .filter(
      (a) =>
        resolveAuctionStatus(a) === "ended" && a.result_status === "confirmed"
    )
    .map((a) => {
      const winner = getWinningBid(a.id, store);
      if (!winner || winner.user_id !== session.id) return null;
      const meta = withAuctionMeta(a, store);
      return {
        auction: meta,
        win_amount: winner.amount,
        won_at: auctionClosedAt(a),
        bid_at: winner.created_at,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => b.won_at.localeCompare(a.won_at));

  return NextResponse.json({ wins });
}
