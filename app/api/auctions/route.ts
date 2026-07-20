import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  readStore,
  writeStore,
  withAuctionMeta,
  sealAuctionForUser,
  resolveAuctionStatus,
} from "@/lib/db";
import { MAX_PHOTOS, saveAuctionPhotos } from "@/lib/uploads";
import { isSaleType } from "@/lib/saleTypes";

export const runtime = "nodejs";

/** Bidder list page size (traffic control). */
const ACTIVE_PAGE_SIZE = 7;

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "active";
  const store = readStore();
  const isAdminAll = session.role === "admin" && scope === "all";

  let auctions = store.auctions.slice();

  if (!isAdminAll) {
    auctions = auctions.filter((a) => resolveAuctionStatus(a) === "live");
  }

  if (isAdminAll) {
    // Products admin: active first, ended last; newest registration first within group.
    const rank = (a: (typeof auctions)[number]) => {
      const s = resolveAuctionStatus(a);
      if (s === "live") return 0;
      if (s === "upcoming") return 1;
      return 2;
    };
    auctions.sort((a, b) => {
      const byStatus = rank(a) - rank(b);
      if (byStatus !== 0) return byStatus;
      const aCreated = new Date(a.created_at || 0).getTime();
      const bCreated = new Date(b.created_at || 0).getTime();
      if (bCreated !== aCreated) return bCreated - aCreated;
      return b.id - a.id;
    });
  } else {
    auctions.sort(
      (a, b) => new Date(a.end_at).getTime() - new Date(b.end_at).getTime()
    );
  }

  const total = auctions.length;
  let page = 1;
  let pageSize = total;
  let totalPages = 1;

  // Paginate bidder-facing active list only (admin product list stays unpaginated).
  if (!isAdminAll) {
    pageSize = ACTIVE_PAGE_SIZE;
    const requested = Number(searchParams.get("page") || "1");
    page = Number.isFinite(requested) && requested >= 1 ? Math.floor(requested) : 1;
    totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    auctions = auctions.slice(start, start + pageSize);
  }

  const isAdmin = session.role === "admin";
  return NextResponse.json({
    auctions: auctions.map((a) => {
      const meta = withAuctionMeta(a, store);
      const sealed = isAdmin ? meta : sealAuctionForUser(meta);
      const myBid = store.bids
        .filter((b) => b.auction_id === a.id && b.user_id === session.id)
        .sort((x, y) => y.created_at.localeCompare(x.created_at))[0];

      return {
        ...sealed,
        my_bid: myBid
          ? {
              id: myBid.id,
              amount: myBid.amount,
              currency: myBid.currency || "KRW",
              amount_input: myBid.amount_input ?? myBid.amount,
              created_at: myBid.created_at,
            }
          : null,
        has_my_bid: Boolean(myBid),
      };
    }),
    page,
    page_size: isAdminAll ? total : pageSize,
    total,
    total_pages: totalPages,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

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

  const photoFiles = form
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (!vehicleType || !year || !fuelType || !storageLocation) {
    return NextResponse.json(
      { error: "Vehicle type, year, fuel type, and storage location are required." },
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
      { error: "Enter a valid start price and times." },
      { status: 400 }
    );
  }

  if (photoFiles.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `You can upload up to ${MAX_PHOTOS} photos.` },
      { status: 400 }
    );
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date/time." }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json(
      { error: "End time must be after start time." },
      { status: 400 }
    );
  }

  let auctionId = 0;
  writeStore((store) => {
    auctionId = store.nextAuctionId++;
    store.auctions.push({
      id: auctionId,
      title: vehicleType,
      vehicle_type: vehicleType,
      year,
      fuel_type: fuelType,
      storage_location: storageLocation,
      sale_type: saleType,
      notes,
      result_memo: "",
      result_status: "pending",
      winner_bid_id: null,
      closed_at: null,
      photos: [],
      description: notes,
      start_price: startPrice,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      created_by: session.id,
      created_at: new Date().toISOString(),
    });
  });

  let photos: string[] = [];
  try {
    if (photoFiles.length > 0) {
      photos = await saveAuctionPhotos(auctionId, photoFiles);
      writeStore((store) => {
        const auction = store.auctions.find((a) => a.id === auctionId);
        if (auction) auction.photos = photos;
      });
    }
  } catch (err) {
    writeStore((store) => {
      store.auctions = store.auctions.filter((a) => a.id !== auctionId);
    });
    const message = err instanceof Error ? err.message : "Photo upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const store = readStore();
  const auction = store.auctions.find((a) => a.id === auctionId);
  return NextResponse.json(
    { auction: auction ? withAuctionMeta(auction, store) : null },
    { status: 201 }
  );
}
