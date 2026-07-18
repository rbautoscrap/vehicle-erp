import { NextResponse } from "next/server";
import { fxRatesToTable } from "@/lib/currency";
import { getFxRates } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rates = getFxRates();
  return NextResponse.json({
    usd_krw: rates.usd_krw,
    eur_krw: rates.eur_krw,
    table: fxRatesToTable(rates),
  });
}
