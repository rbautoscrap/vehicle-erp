"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";

type Props = {
  targetId: string;
  fileName: string;
};

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 16H5V5h14v14Zm-4.5-6.5-2.5 3.01L10 13l-3 4h10l-2.5-4.5Z"
      />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 8H5a3 3 0 0 0-3 3v4h4v5h12v-5h4v-4a3 3 0 0 0-3-3Zm-1 10H6v-4h12v4Zm1-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM17 3H7v4h10V3Z"
      />
    </svg>
  );
}

export function OverseasInvoiceToolbar({ targetId, fileName }: Props) {
  const [savingImage, setSavingImage] = useState(false);
  const busyRef = useRef(false);

  async function saveAsImage() {
    if (busyRef.current) return;
    const node = document.getElementById(targetId);
    if (!node) return;
    busyRef.current = true;
    setSavingImage(true);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${fileName || "invoice"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[overseas-invoice] image export failed", err);
      window.alert("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      busyRef.current = false;
      setSavingImage(false);
    }
  }

  function printInvoice() {
    document.body.classList.add("oi-printing");
    const cleanup = () => {
      document.body.classList.remove("oi-printing");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  return (
    <div className="ts-toolbar" role="toolbar" aria-label="Invoice tools">
      <button
        type="button"
        className="ts-tool-btn"
        title="이미지 저장"
        aria-label="이미지 저장"
        disabled={savingImage}
        onClick={() => void saveAsImage()}
      >
        <IconImage />
        <span>{savingImage ? "저장 중" : "이미지"}</span>
      </button>
      <button
        type="button"
        className="ts-tool-btn"
        title="출력용 인쇄"
        aria-label="출력용 인쇄"
        onClick={printInvoice}
      >
        <IconPrint />
        <span>출력</span>
      </button>
    </div>
  );
}
