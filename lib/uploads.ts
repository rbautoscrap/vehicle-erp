import fs from "fs";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "auctions");
const MAX_PHOTOS = 20;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export { MAX_PHOTOS };

export function auctionUploadDir(auctionId: number) {
  return path.join(UPLOAD_ROOT, String(auctionId));
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
    urls.push(`/uploads/auctions/${auctionId}/${filename}`);
  }

  return urls;
}

export function deleteAuctionPhotos(auctionId: number) {
  const dir = auctionUploadDir(auctionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
