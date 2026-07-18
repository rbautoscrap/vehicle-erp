import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  readStore,
  writeStore,
  withAuctionMeta,
  sealAuctionForUser,
  type Auction,
} from "@/lib/db";
import {
  deleteAuctionPhotos,
  MAX_PHOTOS,
  saveAuctionPhotos,
} from "@/lib/uploads";
import { isSaleType } from "@/lib/saleTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const store = readStore();
  const auction = store.auctions.find((a) => a.id === Number(id));

  if (!auction) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  const meta = withAuctionMeta(auction, store);
  if (meta.status === "ended" && session.role !== "admin") {
    return NextResponse.json({ error: "This auction has ended." }, { status: 404 });
  }
  if (meta.status === "upcoming" && session.role !== "admin") {
    return NextResponse.json(
      { error: "This auction has not started yet." },
      { status: 404 }
    );
  }

  const isAdmin = session.role === "admin";

  const bids = isAdmin
    ? store.bids
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
        .sort((a, b) => b.amount - a.amount || a.created_at.localeCompare(b.created_at))
    : [];

  const myBidRow = store.bids
    .filter((b) => b.auction_id === auction.id && b.user_id === session.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const my_bid = myBidRow
    ? {
        id: myBidRow.id,
        amount: myBidRow.amount,
        currency: myBidRow.currency || "KRW",
        amount_input: myBidRow.amount_input ?? myBidRow.amount,
        created_at: myBidRow.created_at,
      }
    : null;

  return NextResponse.json({
    auction: isAdmin ? meta : sealAuctionForUser(meta),
    bids,
    my_bid,
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const auctionId = Number(id);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const vehicleType = String(form.get("vehicle_type") || "").trim();
  const year = String(form.get("year") || "").trim();
  const fuelType = String(form.get("fuel_type") || "").trim();
  const storageLocation = String(form.get("storage_location") || "").trim();
  const saleType = String(form.get("sale_type") || "").trim();
  const notes = String(form.get("notes") || "").trim();
  const startPrice = Number(form.get("start_price"));
  const startAt = String(form.get("start_at") || "");
  const endAt = String(form.get("end_at") || "");
  const replacePhotos = String(form.get("replace_photos") || "") === "1";

  const photoFiles = form
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (!vehicleType || !year || !fuelType || !storageLocation) {
    return NextResponse.json(
      { error: "Vehicle, year, fuel, and storage location are required." },
      { status: 400 }
    );
  }

  if (!isSaleType(saleType)) {
    return NextResponse.json(
      { error: "매각 타입을 선택하세요. (폐차/이전매각/단품)" },
      { status: 400 }
    );
  }

  if (!startAt || !endAt || Number.isNaN(startPrice) || startPrice < 0) {
    return NextResponse.json(
      { error: "Enter a valid starting price and schedule." },
      { status: 400 }
    );
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Invalid schedule." }, { status: 400 });
  }

  const store = readStore();
  const existing = store.auctions.find((a) => a.id === auctionId);
  if (!existing) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  const currentPhotos = existing.photos || [];
  if (!replacePhotos && currentPhotos.length + photoFiles.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `You can have up to ${MAX_PHOTOS} photos total.` },
      { status: 400 }
    );
  }
  if (replacePhotos && photoFiles.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `You can upload up to ${MAX_PHOTOS} photos.` },
      { status: 400 }
    );
  }

  let newPhotoUrls: string[] = [];
  try {
    if (photoFiles.length > 0) {
      if (replacePhotos) {
        deleteAuctionPhotos(auctionId);
      }
      newPhotoUrls = await saveAuctionPhotos(auctionId, photoFiles);
    } else if (replacePhotos) {
      deleteAuctionPhotos(auctionId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Photo upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let updated: Auction | null = null;
  writeStore((s) => {
    const auction = s.auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    auction.vehicle_type = vehicleType;
    // Keep original title from first registration; do not overwrite on edit.
    if (!auction.title?.trim()) {
      auction.title = vehicleType;
    }
    auction.year = year;
    auction.fuel_type = fuelType;
    auction.storage_location = storageLocation;
    auction.sale_type = saleType;
    auction.notes = notes;
    auction.description = notes;
    auction.start_price = startPrice;
    auction.start_at = start.toISOString();
    auction.end_at = end.toISOString();

    if (replacePhotos) {
      auction.photos = newPhotoUrls;
    } else if (newPhotoUrls.length > 0) {
      auction.photos = [...(auction.photos || []), ...newPhotoUrls].slice(0, MAX_PHOTOS);
    }

    updated = auction;
  });

  if (!updated) {
    return NextResponse.json({ error: "Failed to update auction." }, { status: 500 });
  }

  return NextResponse.json({
    auction: withAuctionMeta(updated, readStore()),
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const auctionId = Number(id);
  let found = false;

  writeStore((store) => {
    const idx = store.auctions.findIndex((a) => a.id === auctionId);
    if (idx === -1) return;
    found = true;
    store.auctions.splice(idx, 1);
    store.bids = store.bids.filter((b) => b.auction_id !== auctionId);
  });

  if (!found) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  deleteAuctionPhotos(auctionId);
  return NextResponse.json({ ok: true });
}
