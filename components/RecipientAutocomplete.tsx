"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { StatementRecipientContact } from "@/lib/statements";

type Props = {
  value: string;
  recipients: StatementRecipientContact[];
  onChange: (company: string) => void;
  onSelect: (recipient: StatementRecipientContact) => void;
  required?: boolean;
  placeholder?: string;
};

export function RecipientAutocomplete({
  value,
  recipients,
  onChange,
  onSelect,
  required,
  placeholder,
}: Props) {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => {
      const hay = [r.company, r.contact_person, r.contact_phone, r.address]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [recipients, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPicker() {
    setQuery(value.trim());
    setOpen(true);
  }

  function pick(recipient: StatementRecipientContact) {
    onSelect(recipient);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="ts-ac">
      <div className="ts-ac-row">
        <input
          id="recipient_company"
          autoComplete="off"
          required={required}
          value={value}
          placeholder={placeholder || "상호명 직접 입력"}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn"
          onClick={openPicker}
          disabled={recipients.length === 0}
          title={
            recipients.length === 0
              ? "저장된 거래처가 없습니다"
              : "저장된 거래처에서 선택"
          }
        >
          거래처 찾기
        </button>
      </div>
      <p className="field-hint" style={{ margin: "6px 0 0" }}>
        {recipients.length > 0
          ? `저장된 거래처 ${recipients.length}곳 · 찾기에서 검색·선택하세요.`
          : "명세서 저장 시 거래처가 등록됩니다."}
      </p>

      {open && (
        <div
          className="ts-ac-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="ts-ac-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="ts-ac-dialog-head">
              <h3 id={titleId}>거래처 선택</h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                닫기
              </button>
            </div>
            <div className="ts-ac-dialog-search">
              <input
                ref={searchRef}
                type="search"
                value={query}
                placeholder="상호·담당자·연락처·주소 검색"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) =>
                      Math.min(Math.max(matches.length - 1, 0), i + 1)
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter" && matches[activeIndex]) {
                    e.preventDefault();
                    pick(matches[activeIndex]);
                  }
                }}
              />
            </div>
            <div className="ts-ac-dialog-body">
              {matches.length === 0 ? (
                <div className="ts-ac-empty">검색 결과가 없습니다.</div>
              ) : (
                <ul className="ts-ac-dialog-list" role="listbox">
                  {matches.map((r, idx) => (
                    <li
                      key={r.id}
                      role="option"
                      aria-selected={idx === activeIndex}
                    >
                      <button
                        type="button"
                        className={`ts-ac-option${idx === activeIndex ? " is-active" : ""}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => pick(r)}
                      >
                        <strong className="notranslate" translate="no">
                          {r.company}
                        </strong>
                        <span>
                          {[r.contact_person, r.contact_phone, r.address]
                            .filter(Boolean)
                            .join(" · ") || "저장된 거래처"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
