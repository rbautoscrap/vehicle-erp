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
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? recipients.slice(0, 8)
      : recipients
          .filter((r) => {
            const hay = [
              r.company,
              r.contact_person,
              r.contact_phone,
              r.address,
            ]
              .join(" ")
              .toLowerCase();
            return hay.includes(q);
          })
          .slice(0, 8);
    return list;
  }, [recipients, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(recipient: StatementRecipientContact) {
    onSelect(recipient);
    setOpen(false);
  }

  return (
    <div className="ts-ac" ref={rootRef}>
      <input
        id="recipient_company"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(matches.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && matches[activeIndex]) {
            e.preventDefault();
            pick(matches[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <ul id={listId} className="ts-ac-list" role="listbox">
          {matches.map((r, idx) => (
            <li key={r.id} role="option" aria-selected={idx === activeIndex}>
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
      {!open && recipients.length > 0 && (
        <p className="field-hint" style={{ margin: "6px 0 0" }}>
          상호를 입력하면 저장된 거래처가 자동완성됩니다.
        </p>
      )}
    </div>
  );
}
