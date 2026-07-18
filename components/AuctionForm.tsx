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
  const [existingPhotos] = useState<string[]>(() => initialPhotos ?? []);
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

  function onPhotosChange(files: FileList | null) {
    if (!files) return;
    const baseCount = replacePhotos || mode === "create" ? 0 : existingPhotos.length;
    const next = [...photos, ...Array.from(files)].slice(0, Math.max(0, MAX_PHOTOS - baseCount));
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

      <div className="field">
        <label htmlFor="photos">
          사진 ({(replacePhotos ? 0 : existingPhotos.length) + photos.length}/
          {MAX_PHOTOS})
        </label>
        {mode === "edit" && existingPhotos.length > 0 && !replacePhotos && (
          <div className="photo-grid preview-grid">
            {existingPhotos.map((src) => (
              <div key={src} className="photo-thumb">
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        )}
        {mode === "edit" && (
          <label
            className="field-hint"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={replacePhotos}
              onChange={(e) => {
                setReplacePhotos(e.target.checked);
                setPhotos([]);
              }}
            />
            기존 사진을 모두 새 업로드로 교체
          </label>
        )}
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
        {previews.length > 0 && (
          <div className="photo-grid preview-grid">
            {previews.map((p, i) => (
              <div key={p.url} className="photo-thumb">
                <img src={p.url} alt={p.name} />
                <button
                  type="button"
                  className="photo-remove"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="사진 제거"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="start_at">시작 시간</label>
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
          <input
            id="end_at"
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => setForm({ ...form, end_at: e.target.value })}
            required
          />
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
