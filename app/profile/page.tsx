"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { PhoneInput } from "@/components/PhoneInput";
import { digitsOnly } from "@/lib/phone";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const [form, setForm] = useState({
    username: "",
    address: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    current_password: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      setForm((prev) => ({
        ...prev,
        username: user.username || "",
        address: user.address || "",
        name: user.name || "",
        email: user.email || "",
        phone: digitsOnly(user.phone || ""),
        company: user.company || "",
      }));
    }
  }, [authLoading, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.new_password && form.new_password !== form.new_password_confirm) {
      setError(
        user?.role === "admin"
          ? "새 비밀번호 확인이 일치하지 않습니다."
          : "New password confirmation does not match."
      );
      return;
    }

    setSaving(true);
    try {
      const payload =
        user?.role === "admin"
          ? {
              name: form.name,
              email: form.email,
              phone: digitsOnly(form.phone),
              company: form.company,
              address: form.address,
              current_password: form.current_password,
              new_password: form.new_password,
            }
          : {
              address: form.address,
              current_password: form.current_password,
              new_password: form.new_password,
            };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error ||
            (user?.role === "admin" ? "저장에 실패했습니다." : "Failed to save.")
        );
        return;
      }
      setUser(data.user);
      setForm((prev) => ({
        ...prev,
        username: data.user.username || prev.username,
        address: data.user.address || "",
        current_password: "",
        new_password: "",
        new_password_confirm: "",
      }));
      setMessage(user?.role === "admin" ? "프로필이 저장되었습니다." : "Profile saved.");
    } catch {
      setError(
        user?.role === "admin"
          ? "서버에 연결할 수 없습니다."
          : "Could not connect to the server."
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="app-shell">
        <p className="page-desc">Loading…</p>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  if (isAdmin) {
    return (
      <AppShell title="관리자 프로필">
        <p className="page-desc">계정 정보와 비밀번호를 변경할 수 있습니다.</p>
        <form className="form" onSubmit={onSubmit}>
          <div className="field">
            <label>아이디</label>
            <input value={user.username} disabled />
          </div>
          <div className="field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="company">회사/운영명</label>
            <input
              id="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">연락처</label>
              <PhoneInput
                id="phone"
                value={form.phone}
                onChange={(phone) => setForm((prev) => ({ ...prev, phone }))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">주소</label>
            <input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <h2 style={{ margin: "8px 0 0", fontSize: "1rem" }}>비밀번호 변경</h2>
          <p className="field-hint">변경하지 않으려면 비워 두세요.</p>
          <div className="field">
            <label htmlFor="current_password">현재 비밀번호</label>
            <input
              id="current_password"
              type="password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="new_password">새 비밀번호</label>
              <input
                id="new_password"
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div className="field">
              <label htmlFor="new_password_confirm">새 비밀번호 확인</label>
              <input
                id="new_password_confirm"
                type="password"
                value={form.new_password_confirm}
                onChange={(e) =>
                  setForm({ ...form, new_password_confirm: e.target.value })
                }
                autoComplete="new-password"
                minLength={6}
              />
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          {message && <p style={{ margin: 0, color: "var(--accent)" }}>{message}</p>}

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </button>
            <button type="button" className="btn" onClick={() => router.push("/admin")}>
              돌아가기
            </button>
          </div>
        </form>
      </AppShell>
    );
  }

  return (
    <AppShell title="My profile">
      <p className="page-desc">
        You can change your address and password only. Username cannot be changed.
      </p>

      <form className="form" onSubmit={onSubmit}>
        <div className="field">
          <label>Username</label>
          <input value={user.username} disabled />
          <p className="field-hint">Username cannot be changed.</p>
        </div>
        <div className="field">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Delivery / contact address"
          />
        </div>

        <h2 style={{ margin: "8px 0 0", fontSize: "1rem" }}>Change password</h2>
        <p className="field-hint">Leave blank if you do not want to change it.</p>
        <div className="field">
          <label htmlFor="current_password">Current password</label>
          <input
            id="current_password"
            type="password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            autoComplete="current-password"
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="new_password">New password</label>
            <input
              id="new_password"
              type="password"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div className="field">
            <label htmlFor="new_password_confirm">Confirm new password</label>
            <input
              id="new_password_confirm"
              type="password"
              value={form.new_password_confirm}
              onChange={(e) =>
                setForm({ ...form, new_password_confirm: e.target.value })
              }
              autoComplete="new-password"
              minLength={6}
            />
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p style={{ margin: 0, color: "var(--accent)" }}>{message}</p>}

        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn" onClick={() => router.push("/")}>
            Back
          </button>
        </div>
      </form>
    </AppShell>
  );
}
