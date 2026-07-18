import fs from "fs";
import path from "path";

/**
 * Store uploads under `data/` (writable at runtime in production).
 * Served via `/api/photo?p=...` because Next.js does not serve files
 * written into `public/` after `next build`.
 */
const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads", "auctions");
/** Legacy path used before production fix */
const LEGACY_UPLOAD_ROOT = path.join(
  process.cwd(),
  "public",
  "uploads",
  "auctions"
);
const MAX_PHOTOS = 20;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export { MAX_PHOTOS };

export function auctionUploadDir(auctionId: number) {
  return path.join(UPLOAD_ROOT, String(auctionId));
}

export function resolveUploadFile(relativePath: string): string | null {
  const safe = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!safe || safe.includes("..")) return null;

  const candidates = [
    path.join(process.cwd(), "data", "uploads", safe),
    path.join(process.cwd(), "public", "uploads", safe),
  ];

  for (const full of candidates) {
    const rootA = path.join(process.cwd(), "data", "uploads");
    const rootB = path.join(process.cwd(), "public", "uploads");
    const normalized = path.normalize(full);
    const underA =
      normalized === rootA || normalized.startsWith(rootA + path.sep);
    const underB =
      normalized === rootB || normalized.startsWith(rootB + path.sep);
    if (
      (underA || underB) &&
      fs.existsSync(normalized) &&
      fs.statSync(normalized).isFile()
    ) {
      return normalized;
    }
  }
  return null;
}

export function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function photoApiUrl(auctionId: number, filename: string) {
  return `/api/photo?p=${encodeURIComponent(`auctions/${auctionId}/${filename}`)}`;
}

export async function saveAuctionPhotos(
  auctionId: number,
  files: File[]
): Promise<string[]> {
  if (files.length > MAX_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_PHOTOS} photos.`);
  }

  const dir = auctionUploadDir(auctionId);
  fs.mkdirSync(dir, { recursive: true });

  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!ALLOWED.has(file.type)) {
      throw new Error("Only jpg, png, webp, and gif images are allowed.");
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("Each photo must be 8MB or smaller.");
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";

    const filename = `${String(i + 1).padStart(2, "0")}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buffer);
    urls.push(photoApiUrl(auctionId, filename));
  }

  return urls;
}

export function deleteAuctionPhotos(auctionId: number) {
  for (const dir of [
    auctionUploadDir(auctionId),
    path.join(LEGACY_UPLOAD_ROOT, String(auctionId)),
  ]) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

/** Normalize stored photo URLs to the API-served path. */
export function toServablePhotoUrl(url: string) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  if (raw.startsWith("/api/photo?")) return raw;

  // /api/uploads/auctions/1/file.jpg  or  /uploads/auctions/1/file.jpg
  const m = raw.match(/^(?:\/api)?\/uploads\/(auctions\/\d+\/[^/?#]+)$/i);
  if (m) {
    return `/api/photo?p=${encodeURIComponent(m[1])}`;
  }
  return raw;
}

/** Relative path inside data/uploads for ZIP etc. */
export function photoUrlToRelativePath(url: string): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;

  if (raw.startsWith("/api/photo?")) {
    try {
      const u = new URL(raw, "http://local");
      const p = u.searchParams.get("p");
      return p ? p.replace(/^\/+/, "") : null;
    } catch {
      return null;
    }
  }

  const m = raw.match(/^(?:\/api)?\/uploads\/(auctions\/\d+\/[^/?#]+)$/i);
  return m ? m[1] : null;
}
