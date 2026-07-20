import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  readStore,
  writeStore,
  withAuctionMeta,
  resolveAuctionStatus,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Save result memo on a live auction without finalizing. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const auctionId = Number(id);
  if (!Number.isInteger(auctionId) || auctionId <= 0) {
    return NextResponse.json({ error: "잘못된 경매 ID입니다." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const resultMemo = String(body.result_memo ?? "").trim();

  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    const auction = store.auctions.find((a) => a.id === auctionId);
    if (!auction) {
      outcome.error = "경매를 찾을 수 없습니다.";
      return;
    }
    const status = resolveAuctionStatus(auction);
    if (status === "ended") {
      outcome.error =
        "이미 종료된 경매입니다. 경매 결과 페이지에서 메모를 수정하세요.";
      return;
    }
    auction.result_memo = resultMemo;
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  const store = readStore();
  const auction = store.auctions.find((a) => a.id === auctionId)!;

  return NextResponse.json({
    auction: withAuctionMeta(auction, store),
    message: "메모가 저장되었습니다.",
  });
}
