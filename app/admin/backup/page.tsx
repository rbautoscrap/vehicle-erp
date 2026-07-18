"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";

type BackupInfo = {
  store_exists: boolean;
  store_updated_at: string | null;
  users: number;
  auctions: number;
  bids: number;
  photo_files: number;
  approx_bytes: number;
  approx_size_label: string;
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminBackupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fetching, setFetching] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [fileName, setFileName] = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/admin/backup");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "현황을 불러오지 못했습니다.");
        return;
      }
      setInfo(data);
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  async function onDownload() {
    setError("");
    setMessage("");
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/backup?download=1");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "백업 다운로드에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const m = disp.match(/filename="([^"]+)"/);
      const name = m?.[1] || `korea-auto-backup-${Date.now()}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(
        `백업 파일을 저장했습니다 (${name}). 재배포 전에 안전한 곳에 보관하세요.`
      );
      await load();
    } catch {
      setError("백업 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  async function onRestore(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("복원할 ZIP 파일을 선택해 주세요.");
      return;
    }
    if (!confirm) {
      setError("복원하면 현재 데이터가 덮어써집니다. 확인에 체크해 주세요.");
      return;
    }
    if (
      !window.confirm(
        "지금 서버의 회원·경매·사진 데이터를 선택한 백업으로 바꿀까요?\n\n복원 직전에 서버에 안전 스냅샷이 자동으로 남습니다."
      )
    ) {
      return;
    }

    setRestoring(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("confirm", "yes");
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "복원에 실패했습니다.");
        return;
      }
      setMessage(
        `${data.message}\n회원 ${data.users}명 · 경매 ${data.auctions}건 · 입찰 ${data.bids}건 · 사진 ${data.photo_files}개`
      );
      setConfirm(false);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch {
      setError("복원 요청 중 오류가 발생했습니다.");
    } finally {
      setRestoring(false);
    }
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  return (
    <AppShell title="백업 / 복원">
      <AdminNav />
      <p className="page-desc">
        Cloudtype 재배포 전에 <strong>백업 받기</strong>를 눌러 ZIP을 PC에
        저장하세요. 배포 후 같은 파일로 <strong>복원</strong>하면 회원·경매·사진이
        돌아옵니다.
      </p>

      <div className="backup-grid">
        <section className="backup-panel">
          <h2>현재 서버 데이터</h2>
          {fetching && !info ? (
            <p className="field-hint">불러오는 중…</p>
          ) : info ? (
            <ul className="backup-stats">
              <li>
                <span>회원</span>
                <strong>{info.users}명</strong>
              </li>
              <li>
                <span>경매(잔존물)</span>
                <strong>{info.auctions}건</strong>
              </li>
              <li>
                <span>입찰</span>
                <strong>{info.bids}건</strong>
              </li>
              <li>
                <span>사진 파일</span>
                <strong>{info.photo_files}개</strong>
              </li>
              <li>
                <span>예상 용량</span>
                <strong>{info.approx_size_label}</strong>
              </li>
              <li>
                <span>데이터 갱신</span>
                <strong>{formatWhen(info.store_updated_at)}</strong>
              </li>
            </ul>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            onClick={onDownload}
            disabled={downloading || fetching}
            style={{ width: "100%", marginTop: 12 }}
          >
            {downloading ? "백업 만드는 중…" : "백업 받기 (ZIP 다운로드)"}
          </button>
          <p className="field-hint" style={{ marginTop: 10 }}>
            추천: 코드를 고치기 전·재배포 직전에 한 번씩 받아 두세요.
          </p>
        </section>

        <section className="backup-panel">
          <h2>백업으로 복원</h2>
          <p className="field-hint" style={{ marginTop: 0 }}>
            이 사이트에서 받은 ZIP만 사용하세요. 복원 직전 서버에 안전 스냅샷이
            자동 저장됩니다.
          </p>

          <form className="form" onSubmit={onRestore} style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="backup_file">백업 ZIP 파일</label>
              <input
                id="backup_file"
                ref={fileRef}
                type="file"
                accept=".zip,application/zip"
                disabled={restoring}
                onChange={(e) =>
                  setFileName(e.target.files?.[0]?.name || "")
                }
              />
              {fileName ? (
                <p className="field-hint" style={{ marginTop: 6 }}>
                  선택됨: {fileName}
                </p>
              ) : null}
            </div>

            <label className="backup-confirm">
              <input
                type="checkbox"
                checked={confirm}
                disabled={restoring}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              <span>현재 서버 데이터를 덮어쓰는 것에 동의합니다.</span>
            </label>

            <button
              type="submit"
              className="btn"
              disabled={restoring || !fileName || !confirm}
              style={{ width: "100%" }}
            >
              {restoring ? "복원 중…" : "복원 실행"}
            </button>
          </form>
        </section>
      </div>

      {error && (
        <p className="error" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
          {error}
        </p>
      )}
      {message && (
        <p
          style={{
            marginTop: 16,
            color: "var(--accent)",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </p>
      )}

      <ol className="backup-steps">
        <li>수정·재배포 전에 「백업 받기」로 ZIP을 PC에 저장</li>
        <li>Cloudtype에서 재배포</li>
        <li>관리자 로그인 → 백업/복원 → ZIP 선택 후 「복원 실행」</li>
      </ol>
    </AppShell>
  );
}
