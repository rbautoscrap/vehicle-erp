import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { getDataPaths, readStore } from "@/lib/db";

export const BACKUP_FORMAT = "korea-auto-aution-backup-v1";

export type BackupManifest = {
  format: typeof BACKUP_FORMAT;
  created_at: string;
  app: string;
  counts: {
    users: number;
    auctions: number;
    bids: number;
    photo_files: number;
  };
};

export type BackupInfo = {
  store_exists: boolean;
  store_updated_at: string | null;
  users: number;
  auctions: number;
  bids: number;
  photo_files: number;
  approx_bytes: number;
  approx_size_label: string;
};

function walkFiles(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      out.push(...walkFiles(full, base));
    } else if (st.isFile()) {
      out.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) total += dirSizeBytes(full);
    else total += st.size;
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getBackupInfo(): BackupInfo {
  const { dbPath, uploadsDir } = getDataPaths();
  const store = readStore();
  const photoFiles = walkFiles(uploadsDir).length;
  let storeBytes = 0;
  let storeUpdated: string | null = null;
  if (fs.existsSync(dbPath)) {
    const st = fs.statSync(dbPath);
    storeBytes = st.size;
    storeUpdated = st.mtime.toISOString();
  }
  const approx = storeBytes + dirSizeBytes(uploadsDir);
  return {
    store_exists: fs.existsSync(dbPath),
    store_updated_at: storeUpdated,
    users: store.users.length,
    auctions: store.auctions.length,
    bids: store.bids.length,
    photo_files: photoFiles,
    approx_bytes: approx,
    approx_size_label: formatBytes(approx),
  };
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function createBackupZip(): Promise<{
  buffer: Buffer;
  filename: string;
  manifest: BackupManifest;
}> {
  const { dbPath, uploadsDir } = getDataPaths();
  const store = readStore();
  const photoRels = walkFiles(uploadsDir);

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    created_at: new Date().toISOString(),
    app: "KOREA AUTO AUTION",
    counts: {
      users: store.users.length,
      auctions: store.auctions.length,
      bids: store.bids.length,
      photo_files: photoRels.length,
    },
  };

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "store.json",
    fs.existsSync(dbPath)
      ? fs.readFileSync(dbPath, "utf8")
      : JSON.stringify(store, null, 2)
  );

  for (const rel of photoRels) {
    zip.file(`uploads/${rel}`, fs.readFileSync(path.join(uploadsDir, rel)));
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    buffer,
    filename: `korea-auto-backup-${stamp()}.zip`,
    manifest,
  };
}

function rmrf(target: string) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const st = fs.statSync(from);
    if (st.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

/** Keep a few local safety snapshots so a bad restore can be undone on the server. */
function pruneSafetyBackups(dataDir: string, keep = 3) {
  const prefix = "safety-";
  const entries = fs
    .readdirSync(dataDir)
    .filter((n) => n.startsWith(prefix))
    .map((n) => ({
      name: n,
      full: path.join(dataDir, n),
      mtime: fs.statSync(path.join(dataDir, n)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const old of entries.slice(keep)) {
    rmrf(old.full);
  }
}

function findStoreEntry(zip: JSZip): JSZip.JSZipObject | null {
  const direct = zip.file("store.json");
  if (direct) return direct;

  const keys = Object.keys(zip.files).filter(
    (k) => !zip.files[k].dir && /(^|\/)store\.json$/i.test(k)
  );
  if (keys.length === 0) return null;
  keys.sort((a, b) => a.split("/").length - b.split("/").length);
  return zip.file(keys[0]) || null;
}

function validateStoreJson(raw: string): {
  ok: true;
  users: number;
  auctions: number;
  bids: number;
} | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "백업의 store.json이 올바른 JSON이 아닙니다." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "백업 store.json 형식이 올바르지 않습니다." };
  }
  const store = parsed as {
    users?: unknown;
    auctions?: unknown;
    bids?: unknown;
  };
  if (!Array.isArray(store.users) || store.users.length === 0) {
    return { ok: false, error: "백업에 회원 데이터가 없습니다." };
  }
  const hasAdmin = store.users.some(
    (u) => u && typeof u === "object" && (u as { role?: string }).role === "admin"
  );
  if (!hasAdmin) {
    return {
      ok: false,
      error: "백업에 관리자 계정이 없어 복원할 수 없습니다.",
    };
  }
  return {
    ok: true,
    users: store.users.length,
    auctions: Array.isArray(store.auctions) ? store.auctions.length : 0,
    bids: Array.isArray(store.bids) ? store.bids.length : 0,
  };
}

export type RestoreResult = {
  users: number;
  auctions: number;
  bids: number;
  photo_files: number;
  safety_backup: string;
};

export async function restoreFromBackupZip(
  zipBuffer: Buffer
): Promise<RestoreResult | { error: string }> {
  const { dataDir, dbPath, uploadsDir } = getDataPaths();
  fs.mkdirSync(dataDir, { recursive: true });

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    return { error: "ZIP 파일을 읽을 수 없습니다. 백업 파일인지 확인해 주세요." };
  }

  const storeEntry = findStoreEntry(zip);
  if (!storeEntry) {
    return {
      error:
        "ZIP 안에 store.json이 없습니다. 이 사이트에서 받은 백업 파일을 사용해 주세요.",
    };
  }

  const storeText = await storeEntry.async("string");
  const validated = validateStoreJson(storeText);
  if (!validated.ok) return { error: validated.error };

  const uploadEntries = Object.keys(zip.files).filter((k) => {
    const f = zip.files[k];
    if (f.dir) return false;
    const norm = k.replace(/\\/g, "/");
    return /(^|\/)uploads\//i.test(norm) && !norm.endsWith("/");
  });

  const safetyName = `safety-${stamp()}`;
  const safetyDir = path.join(dataDir, safetyName);
  fs.mkdirSync(safetyDir, { recursive: true });

  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(safetyDir, "store.json"));
    }
    if (fs.existsSync(uploadsDir)) {
      copyDir(uploadsDir, path.join(safetyDir, "uploads"));
    }
    fs.writeFileSync(
      path.join(safetyDir, "README.txt"),
      "자동 안전 백업 (복원 직전 스냅샷). 필요 시 관리자에게 문의하세요.\n",
      "utf8"
    );
  } catch (err) {
    console.error("[backup] safety snapshot failed", err);
    rmrf(safetyDir);
    return { error: "복원 전 안전 백업을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const staging = path.join(dataDir, `.restore-staging-${Date.now()}`);
  const stagingUploads = path.join(staging, "uploads");
  fs.mkdirSync(stagingUploads, { recursive: true });

  try {
    fs.writeFileSync(path.join(staging, "store.json"), storeText, "utf8");

    for (const key of uploadEntries) {
      const norm = key.replace(/\\/g, "/");
      const idx = norm.toLowerCase().lastIndexOf("uploads/");
      if (idx < 0) continue;
      let rel = norm.slice(idx + "uploads/".length);
      if (!rel || rel.includes("..")) continue;
      const dest = path.join(stagingUploads, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const data = await zip.files[key].async("nodebuffer");
      fs.writeFileSync(dest, data);
    }

    // Swap in place
    fs.copyFileSync(path.join(staging, "store.json"), dbPath);

    const uploadsTmp = path.join(dataDir, `.uploads-old-${Date.now()}`);
    if (fs.existsSync(uploadsDir)) {
      fs.renameSync(uploadsDir, uploadsTmp);
    }
    try {
      fs.renameSync(stagingUploads, uploadsDir);
    } catch {
      copyDir(stagingUploads, uploadsDir);
    }
    rmrf(uploadsTmp);
    rmrf(staging);
    pruneSafetyBackups(dataDir, 3);

    // Force normalize via readStore
    readStore();

    return {
      users: validated.users,
      auctions: validated.auctions,
      bids: validated.bids,
      photo_files: walkFiles(uploadsDir).length,
      safety_backup: safetyName,
    };
  } catch (err) {
    console.error("[backup] restore failed", err);
    // Best-effort rollback from safety snapshot
    try {
      const safeStore = path.join(safetyDir, "store.json");
      if (fs.existsSync(safeStore)) {
        fs.copyFileSync(safeStore, dbPath);
      }
      const safeUploads = path.join(safetyDir, "uploads");
      if (fs.existsSync(safeUploads)) {
        rmrf(uploadsDir);
        copyDir(safeUploads, uploadsDir);
      }
    } catch (rollbackErr) {
      console.error("[backup] rollback failed", rollbackErr);
    }
    rmrf(staging);
    return {
      error: "복원 중 오류가 발생했습니다. 직전 데이터로 되돌리기를 시도했습니다.",
    };
  }
}
