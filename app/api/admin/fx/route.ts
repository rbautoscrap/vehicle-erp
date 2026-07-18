import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fxRatesToTable, normalizeFxRates } from "@/lib/currency";
import { getFxRates, updateFxRates } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const rates = getFxRates();
  return NextResponse.json({
    usd_krw: rates.usd_krw,
    eur_krw: rates.eur_krw,
    table: fxRatesToTable(rates),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const usd = Number(body.usd_krw);
  const eur = Number(body.eur_krw);

  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(eur) || eur <= 0) {
    return NextResponse.json(
      { error: "USD·EUR 환율은 0보다 큰 숫자여야 합니다." },
      { status: 400 }
    );
  }

  const rates = updateFxRates(
    normalizeFxRates({ usd_krw: usd, eur_krw: eur })
  );

  return NextResponse.json({
    usd_krw: rates.usd_krw,
    eur_krw: rates.eur_krw,
    table: fxRatesToTable(rates),
    message: "환율이 저장되었습니다.",
  });
}
