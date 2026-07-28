"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { StatementRecipientContact } from "@/lib/statements";

type Props = {
  value: string;
  recipients: StatementRecipientContact[];
  onChange: (company: string) => void;
  onSelect: (recipient: StatementRecipientContact) => void;
  onRecipientsChange?: (recipients: StatementRecipientContact[]) => void;
  required?: boolean;
  placeholder?: string;
};

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm18-11.5a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75L21 5.75Z"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"
      />
    </svg>
  );
}

export function RecipientAutocomplete({
  value,
  recipients,
  onChange,
  onSelect,
  onRecipientsChange,
  required,
  placeholder,
}: Props) {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [editing, setEditing] = useState<StatementRecipientContact | null>(null);
  const [editForm, setEditForm] = useState({
    company: "",
    contact_person: "",
    contact_phone: "",
    address: "",
  });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

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
    const t = window.setTimeout(() => {
      if (!editing) searchRef.current?.focus();
    }, 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editing) {
          setEditing(null);
          setError("");
        } else {
          setOpen(false);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, editing]);

  function openPicker() {
    setQuery(value.trim());
    setEditing(null);
    setError("");
    setOpen(true);
  }

  function pick(recipient: StatementRecipientContact) {
    onSelect(recipient);
    setOpen(false);
    setQuery("");
    setEditing(null);
  }

  function startEdit(recipient: StatementRecipientContact) {
    setEditing(recipient);
    setEditForm({
      company: recipient.company,
      contact_person: recipient.contact_person,
      contact_phone: recipient.contact_phone,
      address: recipient.address,
    });
    setError("");
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    setBusyId(editing.id);
    try {
      const res = await fetch(`/api/admin/statement-recipients/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "수정에 실패했습니다.");
        return;
      }
      onRecipientsChange?.(data.recipients || []);
      if (data.recipient && value === editing.company) {
        onSelect(data.recipient);
      }
      setEditing(null);
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeRecipient(recipient: StatementRecipientContact) {
    if (
      !window.confirm(
        `「${recipient.company}」 거래처를 삭제할까요?\n이미 작성된 명세서에는 영향이 없습니다.`
      )
    ) {
      return;
    }
    setError("");
    setBusyId(recipient.id);
    try {
      const res = await fetch(`/api/admin/statement-recipients/${recipient.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "삭제에 실패했습니다.");
        return;
      }
      onRecipientsChange?.(data.recipients || []);
      if (editing?.id === recipient.id) setEditing(null);
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
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
            if (e.target === e.currentTarget && !busyId) setOpen(false);
          }}
        >
          <div
            className="ts-ac-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="ts-ac-dialog-head">
              <h3 id={titleId}>{editing ? "거래처 수정" : "거래처 선택"}</h3>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!!busyId}
                onClick={() => {
                  if (editing) {
                    setEditing(null);
                    setError("");
                  } else {
                    setOpen(false);
                  }
                }}
              >
                {editing ? "목록" : "닫기"}
              </button>
            </div>

            {editing ? (
              <form className="ts-ac-edit" onSubmit={(e) => void saveEdit(e)}>
                <div className="field">
                  <label htmlFor="edit_company">상호 *</label>
                  <input
                    id="edit_company"
                    required
                    value={editForm.company}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, company: e.target.value }))
                    }
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="edit_person">담당자</label>
                    <input
                      id="edit_person"
                      value={editForm.contact_person}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          contact_person: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="edit_phone">연락처</label>
                    <input
                      id="edit_phone"
                      value={editForm.contact_phone}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          contact_phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="edit_address">주소</label>
                  <input
                    id="edit_address"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>
                {error && <p className="error">{error}</p>}
                <div className="actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={busyId === editing.id}
                  >
                    {busyId === editing.id ? "저장 중…" : "수정 저장"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={!!busyId}
                    onClick={() => {
                      setEditing(null);
                      setError("");
                    }}
                  >
                    취소
                  </button>
                </div>
              </form>
            ) : (
              <>
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
                  {error && <p className="error">{error}</p>}
                  {matches.length === 0 ? (
                    <div className="ts-ac-empty">검색 결과가 없습니다.</div>
                  ) : (
                    <ul className="ts-ac-dialog-list" role="listbox">
                      {matches.map((r, idx) => (
                        <li
                          key={r.id}
                          role="option"
                          aria-selected={idx === activeIndex}
                          className={`ts-ac-item${idx === activeIndex ? " is-active" : ""}`}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <button
                            type="button"
                            className="ts-ac-option"
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
                          <div className="ts-ac-item-actions">
                            <button
                              type="button"
                              className="ts-ac-icon-btn"
                              title="수정"
                              aria-label={`${r.company} 수정`}
                              disabled={busyId === r.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(r);
                              }}
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              className="ts-ac-icon-btn is-danger"
                              title="삭제"
                              aria-label={`${r.company} 삭제`}
                              disabled={busyId === r.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeRecipient(r);
                              }}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
