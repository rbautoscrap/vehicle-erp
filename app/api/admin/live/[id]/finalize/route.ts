import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  readStore,
  writeStore,
  withAuctionMeta,
  resolveAuctionStatus,
  getWinningBid,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Early-close a live auction: pick a winner (or unsold) and confirm.
 * Sets closed_at so bidding stops immediately.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const auctionId = Number(id);
  if (!Number.isInteger(auctionId) || auctionId <= 0) {
    return NextResponse.json({ error: "잘못된 경매 ID입니다." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const resultStatusRaw = body.result_status;
  const resultStatus =
    resultStatusRaw === "confirmed" || resultStatusRaw === "unsold"
      ? resultStatusRaw
      : null;
  const resultMemo =
    body.result_memo != null ? String(body.result_memo).trim() : undefined;
  const winnerBidIdRaw = body.winner_bid_id;
  const winnerBidId =
    winnerBidIdRaw == null || winnerBidIdRaw === ""
      ? null
      : Number(winnerBidIdRaw);

  if (!resultStatus) {
    return NextResponse.json(
      { error: "결과 상태는 낙찰 확정 또는 유찰이어야 합니다." },
      { status: 400 }
    );
  }
  if (
    winnerBidId != null &&
    (!Number.isFinite(winnerBidId) || winnerBidId <= 0)
  ) {
    return NextResponse.json(
      { error: "낙찰 입찰 ID가 올바르지 않습니다." },
      { status: 400 }
    );
  }
  if (resultStatus === "confirmed" && winnerBidId == null) {
    return NextResponse.json(
      { error: "낙찰 확정 시 낙찰자를 선택하세요." },
      { status: 400 }
    );
  }
  if (resultStatus === "unsold" && winnerBidId != null) {
    return NextResponse.json(
      { error: "유찰 처리 시 낙찰자를 선택할 수 없습니다." },
      { status: 400 }
    );
  }

  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    const auction = store.auctions.find((a) => a.id === auctionId);
    if (!auction) {
      outcome.error = "경매를 찾을 수 없습니다.";
      return;
    }

    const status = resolveAuctionStatus(auction);
    if (status === "upcoming") {
      outcome.error = "아직 시작되지 않은 경매입니다.";
      return;
    }
    if (status === "ended") {
      outcome.error =
        "이미 종료된 경매입니다. 경매 결과 페이지에서 처리하세요.";
      return;
    }

    if (resultStatus === "confirmed") {
      const bid = store.bids.find(
        (b) => b.id === winnerBidId && b.auction_id === auction.id
      );
      if (!bid) {
        outcome.error = "선택한 입찰을 찾을 수 없습니다.";
        return;
      }
      auction.winner_bid_id = bid.id;
    } else {
      auction.winner_bid_id = null;
    }

    auction.result_status = resultStatus;
    auction.closed_at = new Date().toISOString();
    if (resultMemo !== undefined) {
      auction.result_memo = resultMemo;
    }
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  const store = readStore();
  const auction = store.auctions.find((a) => a.id === auctionId)!;
  const meta = withAuctionMeta(auction, store);
  const winning = getWinningBid(auction.id, store);
  const winnerUser = winning
    ? store.users.find((u) => u.id === winning.user_id)
    : null;

  return NextResponse.json({
    auction: meta,
    winner:
      auction.result_status === "confirmed" && winning
        ? {
            user_id: winning.user_id,
            username: winnerUser?.username ?? "unknown",
            name: winnerUser?.name || winnerUser?.username || "unknown",
            amount: winning.amount,
            currency: winning.currency || "KRW",
            amount_input: winning.amount_input ?? winning.amount,
            bid_at: winning.created_at,
            bid_id: winning.id,
          }
        : null,
    message:
      auction.result_status === "confirmed"
        ? "낙찰자를 확정하고 경매를 종료했습니다."
        : "유찰로 처리하고 경매를 종료했습니다.",
  });
}
