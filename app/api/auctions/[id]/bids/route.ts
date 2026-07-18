import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getFxRates,
  writeStore,
  withAuctionMeta,
  sealAuctionForUser,
} from "@/lib/db";
import {
  formatWon,
  isValidBidAmount,
  minSealedBid,
  BID_INCREMENT,
} from "@/lib/format";
import {
  fxRatesToTable,
  isBidCurrency,
  toKrwBid,
  type BidCurrency,
} from "@/lib/currency";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["user", "admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const body = await req.json();
  const currency: BidCurrency = isBidCurrency(body.currency) ? body.currency : "KRW";
  const amountInput = Number(body.amount);
  const fxTable = fxRatesToTable(getFxRates());
  const amountKrw = toKrwBid(amountInput, currency, fxTable);

  if (Number.isNaN(amountInput) || amountInput <= 0 || Number.isNaN(amountKrw)) {
    return NextResponse.json(
      { error: "Enter a valid bid amount." },
      { status: 400 }
    );
  }

  const result: {
    error: string | null;
    updated: ReturnType<typeof withAuctionMeta> | null;
    my_bid: {
      id: number;
      amount: number;
      currency: BidCurrency;
      amount_input: number;
      created_at: string;
    } | null;
    created: boolean;
  } = { error: null, updated: null, my_bid: null, created: false };

  writeStore((store) => {
    const auction = store.auctions.find((a) => a.id === Number(id));
    if (!auction) {
      result.error = "Auction not found.";
      return;
    }

    const meta = withAuctionMeta(auction, store);
    if (meta.status !== "live") {
      result.error =
        meta.status === "upcoming"
          ? "Bidding has not started yet."
          : "This auction has ended.";
      return;
    }

    const minBid = minSealedBid(auction.start_price);
    if (amountKrw < auction.start_price || amountKrw < minBid) {
      result.error = `Minimum bid is ${formatWon(minBid)}. Your entry converts to ${formatWon(
        amountKrw
      )}.`;
      return;
    }
    if (!isValidBidAmount(amountKrw, auction.start_price)) {
      result.error = `Minimum bid: ${formatWon(minBid)} (multiples of ${formatWon(
        BID_INCREMENT
      )}). Your entry converts to ${formatWon(amountKrw)}.`;
      return;
    }

    const existing = store.bids.find(
      (b) => b.auction_id === auction.id && b.user_id === session.id
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.amount = amountKrw;
      existing.currency = currency;
      existing.amount_input = amountInput;
      existing.created_at = now;
      result.my_bid = {
        id: existing.id,
        amount: existing.amount,
        currency: existing.currency,
        amount_input: existing.amount_input,
        created_at: existing.created_at,
      };
      result.created = false;
    } else {
      const bid = {
        id: store.nextBidId++,
        auction_id: auction.id,
        user_id: session.id,
        amount: amountKrw,
        currency,
        amount_input: amountInput,
        created_at: now,
      };
      store.bids.push(bid);
      result.my_bid = {
        id: bid.id,
        amount: bid.amount,
        currency: bid.currency,
        amount_input: bid.amount_input,
        created_at: bid.created_at,
      };
      result.created = true;
    }

    result.updated = withAuctionMeta(auction, store);
  });

  if (result.error) {
    const status = result.error.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const auction =
    session.role === "admin"
      ? result.updated
      : result.updated
        ? sealAuctionForUser(result.updated)
        : null;

  return NextResponse.json(
    {
      auction,
      my_bid: result.my_bid,
      updated: !result.created,
    },
    { status: result.created ? 201 : 200 }
  );
}
