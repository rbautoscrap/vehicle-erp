"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { PhoneInput } from "@/components/PhoneInput";
import { digitsOnly } from "@/lib/phone";
import { formatDateTime } from "@/lib/format";

type AdminUser = {
  id: number;
  username: string;
  role: "admin" | "user";
  status: "pending" | "active" | "suspended";
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  created_at: string;
};

type EditForm = {
  username: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  new_password: string;
};

type UserFilter = "all" | "pending" | "active" | "suspended" | "admin" | "member";

function statusLabel(status: AdminUser["status"]) {
  if (status === "pending") return "승인 대기";
  if (status === "active") return "활성";
  return "정지";
}

function statusBadge(status: AdminUser["status"]) {
  if (status === "pending") return "badge-upcoming";
  if (status === "active") return "badge-live";
  return "badge-ended";
}

function matchesFilter(u: AdminUser, filter: UserFilter) {
  if (filter === "all") return true;
  if (filter === "admin") return u.role === "admin";
  if (filter === "member") return u.role === "user";
  return u.status === filter;
}

function emptyEditForm(): EditForm {
  return {
    username: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    new_password: "",
  };
}

function toEditForm(u: AdminUser): EditForm {
  return {
    username: u.username || "",
    name: u.name || "",
    email: u.email || "",
    phone: digitsOnly(u.phone || ""),
    company: u.company || "",
    address: u.address || "",
    new_password: "",
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm());
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const backdropCloseReady = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      const rows = (data.users || []).map(
        (u: Partial<AdminUser> & { id: number }): AdminUser => ({
          id: u.id,
          username: String(u.username || ""),
          role: u.role === "admin" ? "admin" : "user",
          status:
            u.status === "pending" || u.status === "suspended"
              ? u.status
              : "active",
          name: String(u.name || ""),
          email: String(u.email || ""),
          phone: String(u.phone || ""),
          address: String(u.address || ""),
          company: String(u.company || ""),
          created_at: String(u.created_at || ""),
        })
      );
      setUsers(rows);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    load();
    // Avoid refreshing while the edit dialog is open (focus/selection stability).
    if (editing) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [user, load, editing]);

  function openEdit(u: AdminUser) {
    setEditing(u);
    setEditForm(toEditForm(u));
    setEditError("");
    setMessage("");
  }

  function closeEdit() {
    setEditing(null);
    setEditForm(emptyEditForm());
    setEditError("");
    setSavingEdit(false);
  }

  async function patchUser(
    id: number,
    body: Record<string, unknown>
  ) {
    setError("");
    setMessage("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "수정에 실패했습니다.");
        return false;
      }
      await load();
      return true;
    } finally {
      setBusyId(null);
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError("");
    setSavingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        username: editForm.username.trim(),
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: digitsOnly(editForm.phone),
        company: editForm.company.trim(),
        address: editForm.address.trim(),
      };
      if (editForm.new_password.trim()) {
        payload.new_password = editForm.new_password;
      }
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage(`@${data.user?.username || editForm.username} 정보가 저장되었습니다.`);
      closeEdit();
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteUser(id: number, username: string) {
    if (
      !confirm(
        `@${username} 회원을 삭제할까요?\n삭제하면 해당 회원의 입찰 기록도 함께 제거되며 복구할 수 없습니다.`
      )
    ) {
      return;
    }
    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "삭제에 실패했습니다.");
        return;
      }
      if (editing?.id === id) closeEdit();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(
    () => ({
      all: users.length,
      pending: users.filter((u) => u.status === "pending").length,
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      admin: users.filter((u) => u.role === "admin").length,
      member: users.filter((u) => u.role === "user").length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => matchesFilter(u, filter))
      .filter((u) => {
        if (!q) return true;
        return (
          u.username.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          (u.company || "").toLowerCase().includes(q) ||
          (u.address || "").toLowerCase().includes(q)
        );
      });
  }, [users, filter, query]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  const tabs: { key: UserFilter; label: string; count: number }[] = [
    { key: "all", label: "전체", count: counts.all },
    { key: "pending", label: "승인 대기", count: counts.pending },
    { key: "active", label: "활성", count: counts.active },
    { key: "suspended", label: "정지", count: counts.suspended },
    { key: "admin", label: "관리자", count: counts.admin },
    { key: "member", label: "일반회원", count: counts.member },
  ];

  return (
    <AppShell title="회원 관리">
      <AdminNav />
      <p className="page-desc">
        종류별 요약으로 회원을 확인하고, 정보 수정·가입 승인·정지·권한을 관리합니다.
      </p>

      <div className="user-summary" aria-label="회원 종류별 요약">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`user-summary-chip${filter === tab.key ? " is-active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            <span className="user-summary-label">{tab.label}</span>
            <strong className="user-summary-count">{tab.count}</strong>
          </button>
        ))}
      </div>

      <div className="user-toolbar">
        <input
          className="user-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름, 아이디, 이메일, 연락처, 회사, 주소 검색"
          aria-label="회원 검색"
        />
        <span className="user-toolbar-meta">
          표시 {filtered.length}명 / 전체 {counts.all}명
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="bid-success">{message}</p>}

      {filtered.length === 0 ? (
        <div className="empty">
          {users.length === 0
            ? "회원이 없습니다."
            : "해당 조건의 회원이 없습니다."}
        </div>
      ) : (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th className="col-member">회원</th>
                <th className="col-kind">종류</th>
                <th className="col-status">상태</th>
                <th className="col-contact">연락</th>
                <th className="col-date">가입일</th>
                <th className="col-actions">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.id === user.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id}>
                    <td className="col-member">
                      <div className="user-cell-name">
                        <strong>{u.name || u.username}</strong>
                        <span>@{u.username}</span>
                        {u.company ? <span>{u.company}</span> : null}
                        {isSelf && <span className="badge">본인</span>}
                      </div>
                    </td>
                    <td className="col-kind">
                      <span className={`badge ${u.role === "admin" ? "badge-live" : ""}`}>
                        {u.role === "admin" ? "관리자" : "일반"}
                      </span>
                    </td>
                    <td className="col-status">
                      <span className={`badge ${statusBadge(u.status)}`}>
                        {statusLabel(u.status)}
                      </span>
                    </td>
                    <td className="col-contact">
                      <div className="user-cell-contact">
                        <div className="user-contact-line" title={u.phone || undefined}>
                          <span className="user-contact-label">전화</span>
                          <span className="user-contact-value">
                            {u.phone?.trim() ? u.phone : "—"}
                          </span>
                        </div>
                        <div className="user-contact-line" title={u.email || undefined}>
                          <span className="user-contact-label">메일</span>
                          <span className="user-contact-value">
                            {u.email?.trim() ? u.email : "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-date">
                      <span className="user-cell-date">
                        {formatDateTime(u.created_at)}
                      </span>
                    </td>
                    <td className="col-actions">
                      <div className="user-actions">
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => openEdit(u)}
                        >
                          정보 수정
                        </button>

                        {u.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() => patchUser(u.id, { status: "active" })}
                            >
                              승인
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={busy}
                              onClick={() => {
                                if (confirm(`@${u.username} 가입을 거절(정지)할까요?`)) {
                                  patchUser(u.id, { status: "suspended" });
                                }
                              }}
                            >
                              거절
                            </button>
                          </>
                        )}

                        {u.status === "active" && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={busy || isSelf}
                            onClick={() => {
                              if (
                                confirm(
                                  `@${u.username} 계정을 정지할까요? 로그인할 수 없게 됩니다.`
                                )
                              ) {
                                patchUser(u.id, { status: "suspended" });
                              }
                            }}
                          >
                            정지
                          </button>
                        )}

                        {u.status === "suspended" && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busy}
                            onClick={() => patchUser(u.id, { status: "active" })}
                          >
                            복구
                          </button>
                        )}

                        {u.role === "user" ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={busy || u.status !== "active"}
                            onClick={() => {
                              if (confirm(`@${u.username}에게 관리자 권한을 부여할까요?`)) {
                                patchUser(u.id, { role: "admin" });
                              }
                            }}
                          >
                            →관리자
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn"
                            disabled={busy || isSelf}
                            onClick={() => {
                              if (confirm(`@${u.username}의 관리자 권한을 해제할까요?`)) {
                                patchUser(u.id, { role: "user" });
                              }
                            }}
                          >
                            →일반
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={busy || isSelf}
                          onClick={() => deleteUser(u.id, u.username)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div
          className="user-edit-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            // Only close when both press and release happen on the backdrop
            // (prevents close while drag-selecting text or pasting in inputs).
            backdropCloseReady.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (
              backdropCloseReady.current &&
              e.target === e.currentTarget &&
              !savingEdit
            ) {
              closeEdit();
            }
            backdropCloseReady.current = false;
          }}
        >
          <div
            className="user-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-edit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="actions" style={{ justifyContent: "space-between" }}>
              <h2 id="user-edit-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                회원 정보 수정
              </h2>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                닫기
              </button>
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>
              @{editing.username}
              {editing.role === "admin" ? " · 관리자" : " · 일반회원"} ·{" "}
              {statusLabel(editing.status)}
            </p>

            <form className="form" onSubmit={onSaveEdit} style={{ marginTop: 16 }}>
              <div className="field">
                <label htmlFor="edit_username">아이디</label>
                <input
                  id="edit_username"
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm({ ...editForm, username: e.target.value })
                  }
                  required
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="edit_name">이름</label>
                <input
                  id="edit_name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="edit_email">이메일</label>
                  <input
                    id="edit_email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit_phone">연락처</label>
                  <PhoneInput
                    id="edit_phone"
                    value={editForm.phone}
                    onChange={(phone) =>
                      setEditForm((prev) => ({ ...prev, phone }))
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="edit_company">회사/운영명</label>
                <input
                  id="edit_company"
                  value={editForm.company}
                  onChange={(e) =>
                    setEditForm({ ...editForm, company: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit_address">주소</label>
                <input
                  id="edit_address"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit_password">새 비밀번호 (선택)</label>
                <input
                  id="edit_password"
                  type="password"
                  value={editForm.new_password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, new_password: e.target.value })
                  }
                  placeholder="변경할 때만 입력 (6자 이상)"
                  autoComplete="new-password"
                />
              </div>
              {editError && <p className="error">{editError}</p>}
              <div className="actions">
                <button className="btn btn-primary" type="submit" disabled={savingEdit}>
                  {savingEdit ? "저장 중…" : "저장"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={closeEdit}
                  disabled={savingEdit}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
