import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  createBackupZip,
  getBackupInfo,
  restoreFromBackupZip,
} from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current data summary (for the admin backup page). */
export async function GET(req: NextRequest) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("download") === "1") {
    try {
      const { buffer, filename, manifest } = await createBackupZip();
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "no-store",
          "X-Backup-Users": String(manifest.counts.users),
          "X-Backup-Auctions": String(manifest.counts.auctions),
        },
      });
    } catch (err) {
      console.error("[backup] create failed", err);
      return NextResponse.json(
        { error: "백업 파일을 만들지 못했습니다." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(getBackupInfo());
}

/** Restore from an uploaded backup zip. */
export async function POST(req: NextRequest) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "백업 ZIP 파일을 선택해 주세요." },
        { status: 400 }
      );
    }

    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "ZIP 파일만 복원할 수 있습니다." },
        { status: 400 }
      );
    }

    const maxBytes = 120 * 1024 * 1024; // 120MB
    if (file.size <= 0) {
      return NextResponse.json(
        { error: "빈 파일은 복원할 수 없습니다." },
        { status: 400 }
      );
    }
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "파일이 너무 큽니다. 120MB 이하 ZIP만 업로드해 주세요." },
        { status: 400 }
      );
    }

    const confirm = String(form.get("confirm") || "");
    if (confirm !== "yes") {
      return NextResponse.json(
        { error: "복원 확인이 필요합니다." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await restoreFromBackupZip(buffer);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "복원이 완료되었습니다. 페이지를 새로고침하면 반영됩니다.",
      ...result,
    });
  } catch (err) {
    console.error("[backup] restore request failed", err);
    return NextResponse.json(
      { error: "복원 요청을 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
