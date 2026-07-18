import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { contentTypeFor, resolveUploadFile } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve runtime-uploaded auction photos.
 * Example: /api/photo?p=auctions/1/01-123.jpg
 */
export async function GET(req: NextRequest) {
  const raw = String(req.nextUrl.searchParams.get("p") || "").trim();
  if (!raw) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const relative = raw.replace(/^\/+/, "").replace(/\\/g, "/");
  const filePath = resolveUploadFile(relative);
  if (!filePath) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(buffer.length),
    },
  });
}
