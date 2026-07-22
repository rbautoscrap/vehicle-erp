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

function winnerPayload(
  auctionId: number,
  store: ReturnType<typeof readStore>
) {
  const winning = getWinningBid(auctionId, store);
  const winnerUser = winning
    ? store.users.find((u) => u.id === winning.user_id)
    : null;
  if (!winning) return null;
  return {
    user_id: winning.user_id,
    username: winnerUser?.username ?? "unknown",
    name: winnerUser?.name || winnerUser?.username || "unknown",
    phone: winnerUser?.phone || "",
    address: winnerUser?.address || "",
    amount: winning.amount,
    currency: winning.currency || "KRW",
    amount_input: winning.amount_input ?? winning.amount,
    bid_at: winning.created_at,
    bid_id: winning.id,
  };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const auctionId = Number(id);
  const store = readStore();
  const auction = store.auctions.find((a) => a.id === auctionId);

  if (!auction) {
    return NextResponse.json({ error: "경매를 찾을 수 없습니다." }, { status: 404 });
  }

  const meta = withAuctionMeta(auction, store);
  if (meta.status !== "ended") {
    return NextResponse.json(
      { error: "아직 종료되지 않은 경매입니다." },
      { status: 400 }
    );
  }

  const bids = store.bids
    .filter((b) => b.auction_id === auction.id)
    .map((b) => {
      const u = store.users.find((x) => x.id === b.user_id);
      return {
        id: b.id,
        amount: b.amount,
        currency: b.currency || "KRW",
        amount_input: b.amount_input ?? b.amount,
        created_at: b.created_at,
        username: u?.username ?? "unknown",
        name: u?.name || u?.username || "unknown",
      };
    })
    .sort((a, b) => b.amount - a.amount || a.created_at.localeCompare(b.created_at));

  return NextResponse.json({
    auction: meta,
    winner: winnerPayload(auction.id, store),
    bids,
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const auctionId = Number(id);
  const body = await req.json();

  const reopen = body.reopen === true;
  const resultStatusRaw = body.result_status;
  const resultMemo = body.result_memo != null ? String(body.result_memo) : undefined;
  const notes = body.notes != null ? String(body.notes) : undefined;
  const endAt = body.end_at != null ? String(body.end_at) : undefined;
  const winnerBidIdProvided = Object.prototype.hasOwnProperty.call(
    body,
    "winner_bid_id"
  );
  const winnerBidIdRaw = body.winner_bid_id;
  const winnerBidId =
    winnerBidIdRaw == null || winnerBidIdRaw === ""
      ? null
      : Number(winnerBidIdRaw);

  const resultStatus =
    resultStatusRaw === "pending" ||
    resultStatusRaw === "confirmed" ||
    resultStatusRaw === "unsold"
      ? resultStatusRaw
      : undefined;

  if (resultStatusRaw != null && resultStatusRaw !== "" && !resultStatus) {
    return NextResponse.json({ error: "잘못된 결과 상태입니다." }, { status: 400 });
  }
  if (
    winnerBidIdProvided &&
    winnerBidId != null &&
    (!Number.isFinite(winnerBidId) || winnerBidId <= 0)
  ) {
    return NextResponse.json(
      { error: "낙찰 입찰 ID가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const outcome: {
    error: string | null;
    auctionId: number | null;
    reopened: boolean;
  } = {
    error: null,
    auctionId: null,
    reopened: false,
  };

  writeStore((store) => {
    const auction = store.auctions.find((a) => a.id === auctionId);
    if (!auction) {
      outcome.error = "경매를 찾을 수 없습니다.";
      return;
    }
    if (resolveAuctionStatus(auction) !== "ended") {
      outcome.error = "종료된 경매만 결과를 수정할 수 있습니다.";
      return;
    }

    if (reopen) {
      const end = endAt
        ? new Date(endAt)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (Number.isNaN(end.getTime())) {
        outcome.error = "종료 시간이 올바르지 않습니다.";
        return;
      }
      if (end.getTime() <= Date.now()) {
        outcome.error = "경매 재개 시 종료 시간은 현재보다 이후여야 합니다.";
        return;
      }
      if (end <= new Date(auction.start_at)) {
        outcome.error = "종료 시간은 시작 시간보다 이후여야 합니다.";
        return;
      }
      // Ensure bidding can start immediately if start was somehow in the future
      if (new Date(auction.start_at).getTime() > Date.now()) {
        auction.start_at = new Date().toISOString();
      }
      auction.end_at = end.toISOString();
      auction.closed_at = null;
      auction.winner_bid_id = null;
      auction.result_status = "pending";
      outcome.reopened = true;
      outcome.auctionId = auction.id;
      return;
    }

    if (resultStatus) {
      auction.result_status = resultStatus;
      if (resultStatus === "unsold") {
        auction.winner_bid_id = null;
      }
    }

    if (winnerBidIdProvided) {
      if (winnerBidId == null) {
        auction.winner_bid_id = null;
      } else {
        const bid = store.bids.find(
          (b) => b.id === winnerBidId && b.auction_id === auction.id
        );
        if (!bid) {
          outcome.error = "선택한 입찰을 찾을 수 없습니다.";
          return;
        }
        auction.winner_bid_id = bid.id;
      }
    }

    if (resultStatus === "confirmed" && auction.winner_bid_id == null) {
      const auto = getWinningBid(auction.id, store);
      if (auto) auction.winner_bid_id = auto.id;
    }

    if (resultMemo !== undefined) {
      auction.result_memo = resultMemo.trim();
    }
    if (notes !== undefined) {
      auction.notes = notes.trim();
      auction.description = auction.notes;
    }
    if (endAt) {
      const end = new Date(endAt);
      if (Number.isNaN(end.getTime())) {
        outcome.error = "종료 시간이 올바르지 않습니다.";
        return;
      }
      if (end <= new Date(auction.start_at)) {
        outcome.error = "종료 시간은 시작 시간보다 이후여야 합니다.";
        return;
      }
      auction.end_at = end.toISOString();
      // Reopen: clear early-close so bidding can resume if still before end_at
      if (end.getTime() > Date.now()) {
        auction.closed_at = null;
        auction.winner_bid_id = null;
        auction.result_status = "pending";
        outcome.reopened = true;
      }
    }

    outcome.auctionId = auction.id;
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  const store = readStore();
  const auction = store.auctions.find((a) => a.id === outcome.auctionId)!;
  const meta = withAuctionMeta(auction, store);

  return NextResponse.json({
    auction: meta,
    winner: winnerPayload(auction.id, store),
    reopened: outcome.reopened,
    message: outcome.reopened
      ? "경매를 다시 진행 중으로 되돌렸습니다."
      : undefined,
  });
}
