import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { requireSession } from "@/lib/auth";
import { resolveAuctionStatus, getWinningBid, readStore } from "@/lib/db";
import { photoUrlToRelativePath, resolveUploadFile } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ZIP of product photos — only for the winning bidder of an ended auction. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id: idParam } = await params;
  const auctionId = Number(idParam);
  if (!Number.isInteger(auctionId) || auctionId <= 0) {
    return NextResponse.json({ error: "Invalid auction." }, { status: 400 });
  }

  const store = readStore();
  const auction = store.auctions.find((a) => a.id === auctionId);
  if (!auction) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  if (resolveAuctionStatus(auction) !== "ended") {
    return NextResponse.json(
      { error: "Photos can be downloaded after the auction ends." },
      { status: 403 }
    );
  }

  if (auction.result_status !== "confirmed") {
    return NextResponse.json(
      { error: "Photos are available after the administrator confirms the result." },
      { status: 403 }
    );
  }

  const winner = getWinningBid(auctionId, store);
  if (!winner || winner.user_id !== session.id) {
    return NextResponse.json(
      { error: "Only the winning bidder can download these photos." },
      { status: 403 }
    );
  }

  const photos = auction.photos || [];
  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos available." }, { status: 404 });
  }

  const zip = new JSZip();
  let added = 0;

  for (const photoUrl of photos) {
    const relative = photoUrlToRelativePath(photoUrl);
    if (!relative) continue;
    const resolved = resolveUploadFile(relative);
    if (!resolved) continue;

    const base = path.basename(resolved);
    zip.file(`${String(added + 1).padStart(2, "0")}-${base}`, fs.readFileSync(resolved));
    added += 1;
  }

  if (added === 0) {
    return NextResponse.json({ error: "Photo files were not found." }, { status: 404 });
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const label = (auction.vehicle_type || auction.title || "auction")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const filename = `${label || "auction"}-${auctionId}-photos.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
