"use client";

import { useEffect, useCallback } from "react";

type Props = {
  photos: string[];
  index: number;
  alt?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function PhotoLightbox({
  photos,
  index,
  alt = "Photo",
  onClose,
  onIndexChange,
}: Props) {
  const total = photos.length;
  const current = photos[index] || photos[0];

  const goPrev = useCallback(() => {
    if (total <= 1) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [goNext, goPrev, onClose]);

  if (!current) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged photo"
      onClick={onClose}
    >
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-prev"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}

      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="lightbox-image-btn"
          onClick={goNext}
          aria-label={total > 1 ? "Show next photo" : "Enlarged photo"}
        >
          <img className="lightbox-image" src={current} alt={`${alt} ${index + 1}`} />
        </button>
        {total > 1 && (
          <p className="lightbox-meta">
            {index + 1} / {total} · Click photo for next
          </p>
        )}
      </div>

      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-next"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next photo"
        >
          ›
        </button>
      )}
    </div>
  );
}
