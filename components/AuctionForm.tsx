"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SALE_TYPES } from "@/lib/saleTypes";
import {
  AuctionFormState,
  FUEL_OPTIONS,
  MAX_PHOTOS,
  emptyAuctionForm,
  defaultAuctionTimes,
} from "@/lib/admin";
import {
  atLocalTime,
  nextBusinessDayAt13,
  nextKoreaBusinessDay,
  toLocalInputValue,
} from "@/lib/koreaHolidays";
import { formatDateTime } from "@/lib/format";

type Props = {
  mode: "create" | "edit";
  auctionId?: number;
  initialForm?: AuctionFormState;
  initialPhotos?: string[];
  onSuccessHref?: string;
};

export function AuctionForm({
  mode,
  auctionId,
  initialForm,
  initialPhotos,
  onSuccessHref = "/admin/products",
}: Props) {
  const router = useRouter();

  // Initialize once from props. For edit, remount with a new `key` when data loads.
  const [form, setForm] = useState<AuctionFormState>(() => {
    if (initialForm) return initialForm;
    return { ...emptyAuctionForm, ...defaultAuctionTimes() };
  });
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    () => initialPhotos ?? []
  );
  const [replacePhotos, setReplacePhotos] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const previews = useMemo(
    () => photos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [photos]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  function setMainExisting(src: string) {
    setExistingPhotos((prev) => [src, ...prev.filter((p) => p !== src)]);
  }

  function setMainNew(index: number) {
    setPhotos((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
  }

  function onPhotosChange(files: FileList | null) {
    if (!files) return;
    const baseCount = replacePhotos || mode === "create" ? 0 : existingPhotos.length;
    const next = [...photos, ...Array.from(files)].slice(
      0,
      Math.max(0, MAX_PHOTOS - baseCount)
    );
    setPhotos(next);
    if (baseCount + photos.length + files.length > MAX_PHOTOS) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지 선택할 수 있습니다.`);
    } else {
      setError("");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const body = new FormData();
      body.set("vehicle_type", form.vehicle_type);
      body.set("year", form.year);
      body.set("fuel_type", form.fuel_type);
      body.set("storage_location", form.storage_location);
      body.set("sale_type", form.sale_type);
      body.set("notes", form.notes);
      body.set("start_price", form.start_price);
      body.set("start_at", new Date(form.start_at).toISOString());
      body.set("end_at", new Date(form.end_at).toISOString());
      if (mode === "edit" && replacePhotos) {
        body.set("replace_photos", "1");
      }
      if (mode === "edit" && !replacePhotos && existingPhotos.length > 0) {
        body.set("photo_order", JSON.stringify(existingPhotos));
      }
      photos.forEach((file) => body.append("photos", file));

      const res = await fetch(
        mode === "edit" && auctionId ? `/api/auctions/${auctionId}` : "/api/auctions",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          body,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage(mode === "edit" ? "저장되었습니다." : "잔존물이 등록되었습니다.");
      router.push(onSuccessHref);
      router.refresh();
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {mode === "edit" && (
        <p className="field-hint">
          최초 등록 시 상품명은 유지되며, 진행 중인 경매도 수정할 수 있습니다.
        </p>
      )}

      <div className="field">
        <label htmlFor="vehicle_type">차종</label>
        <input
          id="vehicle_type"
          value={form.vehicle_type}
          onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
          placeholder="예: 현대 쏘나타"
          required
        />
      </div>

      <div className="field-row field-row-3">
        <div className="field">
          <label htmlFor="year">연식</label>
          <input
            id="year"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="예: 2019"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="fuel_type">유종</label>
          <select
            id="fuel_type"
            value={form.fuel_type}
            onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
            required
          >
            {FUEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sale_type">매각 타입</label>
          <select
            id="sale_type"
            value={form.sale_type}
            onChange={(e) => setForm({ ...form, sale_type: e.target.value })}
            required
          >
            {SALE_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="storage_location">보관장소</label>
        <input
          id="storage_location"
          value={form.storage_location}
          onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="notes">특이사항</label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <div className="field photo-editor">
        <label htmlFor="photos">
          사진 ({(replacePhotos ? 0 : existingPhotos.length) + photos.length}/
          {MAX_PHOTOS})
        </label>
        <p className="field-hint" style={{ marginTop: 0 }}>
          사진을 클릭하면 <strong>대표(메인) 이미지</strong>로 지정됩니다. 목록·미리보기에
          맨 앞 사진이 표시됩니다.
        </p>

        {mode === "edit" && existingPhotos.length > 0 && !replacePhotos && (
          <div className="photo-grid preview-grid" role="list">
            {existingPhotos.map((src, i) => (
              <button
                key={src}
                type="button"
                role="listitem"
                className={`photo-thumb${i === 0 ? " is-cover" : ""}`}
                onClick={() => setMainExisting(src)}
                title={i === 0 ? "대표 이미지" : "대표로 지정"}
              >
                <img src={src} alt="" />
                {i === 0 && <span className="photo-cover-badge">대표</span>}
              </button>
            ))}
          </div>
        )}

        {mode === "edit" && (
          <label className="photo-replace-toggle">
            <input
              type="checkbox"
              checked={replacePhotos}
              onChange={(e) => {
                setReplacePhotos(e.target.checked);
                setPhotos([]);
              }}
            />
            <span>기존 사진을 모두 새 업로드로 교체</span>
          </label>
        )}

        <div className="photo-file-row">
          <input
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => {
              onPhotosChange(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {previews.length > 0 && (
          <div className="photo-grid preview-grid" role="list">
            {previews.map((p, i) => (
              <div
                key={p.url}
                role="listitem"
                className={`photo-thumb${i === 0 ? " is-cover" : ""}`}
              >
                <button
                  type="button"
                  className="photo-thumb-pick"
                  onClick={() => setMainNew(i)}
                  title={i === 0 ? "대표 이미지" : "대표로 지정"}
                >
                  <img src={p.url} alt={p.name} />
                  {i === 0 && <span className="photo-cover-badge">대표</span>}
                </button>
                <button
                  type="button"
                  className="photo-remove"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  aria-label="사진 제거"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="schedule-block">
        <div className="field">
          <label htmlFor="start_at">시작 시간</label>
          <div className="time-presets" role="group" aria-label="시작 시간 빠른 설정">
            <button
              type="button"
              className="btn time-preset-btn"
              onClick={() =>
                setForm((f) => ({ ...f, start_at: toLocalInputValue(new Date()) }))
              }
            >
              지금 시작
            </button>
            <button
              type="button"
              className="btn time-preset-btn"
              onClick={() => {
                const d = new Date();
                d.setHours(d.getHours() + 1, 0, 0, 0);
                setForm((f) => ({ ...f, start_at: toLocalInputValue(d) }));
              }}
            >
              1시간 후
            </button>
            <button
              type="button"
              className="btn time-preset-btn"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                setForm((f) => ({
                  ...f,
                  start_at: toLocalInputValue(atLocalTime(d, 9, 0)),
                }));
              }}
            >
              내일 오전 9시
            </button>
          </div>
          <input
            id="start_at"
            type="datetime-local"
            value={form.start_at}
            onChange={(e) => setForm({ ...form, start_at: e.target.value })}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="end_at">종료 시간</label>
          <div className="time-presets" role="group" aria-label="종료 시간 빠른 설정">
            <button
              type="button"
              className="btn time-preset-btn time-preset-primary"
              onClick={() => {
                const base = form.start_at ? new Date(form.start_at) : new Date();
                let end = nextBusinessDayAt13(base);
                if (end.getTime() <= base.getTime()) {
                  end = nextBusinessDayAt13(end);
                }
                setForm((f) => ({ ...f, end_at: toLocalInputValue(end) }));
              }}
            >
              다음 영업일 오후 1시
            </button>
            <button
              type="button"
              className="btn time-preset-btn"
              onClick={() => {
                const base = form.start_at ? new Date(form.start_at) : new Date();
                const end = atLocalTime(base, 13, 0);
                if (end.getTime() <= base.getTime()) {
                  const next = new Date(base);
                  next.setDate(next.getDate() + 1);
                  setForm((f) => ({
                    ...f,
                    end_at: toLocalInputValue(atLocalTime(next, 13, 0)),
                  }));
                  return;
                }
                setForm((f) => ({ ...f, end_at: toLocalInputValue(end) }));
              }}
            >
              오늘 오후 1시
            </button>
            <button
              type="button"
              className="btn time-preset-btn"
              onClick={() => {
                const base = form.start_at ? new Date(form.start_at) : new Date();
                const day = nextKoreaBusinessDay(base);
                setForm((f) => ({
                  ...f,
                  end_at: toLocalInputValue(atLocalTime(day, 13, 0)),
                }));
              }}
            >
              내일(영업일) 오후 1시
            </button>
            <button
              type="button"
              className="btn time-preset-btn"
              onClick={() => {
                const base = form.start_at ? new Date(form.start_at) : new Date();
                const end = new Date(base.getTime() + 24 * 60 * 60 * 1000);
                setForm((f) => ({ ...f, end_at: toLocalInputValue(end) }));
              }}
            >
              시작 + 24시간
            </button>
          </div>
          <input
            id="end_at"
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => setForm({ ...form, end_at: e.target.value })}
            required
          />
          <p className="field-hint">
            기본값은 주말·공휴일을 제외한 <strong>다음 영업일 오후 1시</strong>입니다.
            {form.end_at
              ? ` 현재 선택: ${formatDateTime(new Date(form.end_at).toISOString())}`
              : ""}
          </p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p style={{ margin: 0, color: "var(--accent)" }}>{message}</p>}

      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving
            ? "저장 중…"
            : mode === "edit"
              ? "수정 저장"
              : "잔존물등록"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => router.push("/admin/products")}
        >
          취소
        </button>
      </div>
    </form>
  );
}
