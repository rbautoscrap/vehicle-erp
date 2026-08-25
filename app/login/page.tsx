"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState({
    kind: "폐차·잔존물",
    plate: "",
    phone: "",
    location: "",
    remain: "",
    note: "",
  });
  const [quoteDone, setQuoteDone] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(d.user.role === "admin" ? "/admin" : "/");
      })
      .catch(() => {});
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }
      router.replace(data.user?.role === "admin" ? "/admin" : "/");
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function onQuote(e: FormEvent) {
    e.preventDefault();
    const body = [
      "폐차 및 잔존물 감정 문의",
      `구분: ${quote.kind}`,
      `차량번호: ${quote.plate}`,
      `연락처: ${quote.phone}`,
      `차량위치: ${quote.location}`,
      `잔존물: ${quote.remain || "-"}`,
      `특이사항: ${quote.note || "-"}`,
    ].join("\n");
    window.location.href = `mailto:rbautoscrap@naver.com?subject=${encodeURIComponent(
      "폐차 및 잔존물 감정 문의"
    )}&body=${encodeURIComponent(body)}`;
    setQuoteDone(true);
  }

  return (
    <div className="site-page">
      <PublicHeader />

      <section className="site-section site-main-only" id="scrap">
        <div className="site-section-inner">
          <p className="site-kicker">정부정식 관허폐차사업소</p>
          <h1 className="site-heading site-heading-lg">폐차 및 잔존물 감정</h1>
          <p className="site-lead">
            차량번호, 연락처, 위치와 잔존물 내용을 남겨 주시면 감정 금액을
            안내해 드립니다.
          </p>

          <div className="site-split">
            <div className="site-table-wrap">
              <table className="site-table">
                <tbody>
                  <tr>
                    <th>문의전화</th>
                    <td>
                      <a href="tel:0415227327">041-522-7327</a>
                    </td>
                  </tr>
                  <tr>
                    <th>이메일</th>
                    <td>
                      <a href="mailto:rbautoscrap@naver.com">rbautoscrap@naver.com</a>
                    </td>
                  </tr>
                  <tr>
                    <th>안내</th>
                    <td>
                      폐차 말소와 잔존물 감정을 함께 접수합니다. 압류·저당 등
                      특이사항이 있으면 함께 적어 주세요.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {quoteDone ? (
              <p className="site-quote-ok">
                정상적으로 접수되었습니다. 메일 창이 열리면 전송해 주세요.
              </p>
            ) : (
              <form className="site-quote" onSubmit={onQuote}>
                <table className="site-table site-form-table">
                  <tbody>
                    <tr>
                      <th>
                        <label htmlFor="quote-kind">구분 *</label>
                      </th>
                      <td>
                        <select
                          id="quote-kind"
                          required
                          value={quote.kind}
                          onChange={(e) => setQuote({ ...quote, kind: e.target.value })}
                        >
                          <option value="폐차·잔존물">폐차·잔존물</option>
                          <option value="폐차감정">폐차감정</option>
                          <option value="잔존물 감정">잔존물 감정</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <th>
                        <label htmlFor="quote-plate">차량번호 *</label>
                      </th>
                      <td>
                        <input
                          id="quote-plate"
                          required
                          value={quote.plate}
                          onChange={(e) => setQuote({ ...quote, plate: e.target.value })}
                        />
                      </td>
                    </tr>
                    <tr>
                      <th>
                        <label htmlFor="quote-phone">연락처 *</label>
                      </th>
                      <td>
                        <input
                          id="quote-phone"
                          required
                          value={quote.phone}
                          onChange={(e) => setQuote({ ...quote, phone: e.target.value })}
                        />
                      </td>
                    </tr>
                    <tr>
                      <th>
                        <label htmlFor="quote-location">차량위치 *</label>
                      </th>
                      <td>
                        <input
                          id="quote-location"
                          required
                          value={quote.location}
                          onChange={(e) => setQuote({ ...quote, location: e.target.value })}
                        />
                      </td>
                    </tr>
                    <tr>
                      <th>
                        <label htmlFor="quote-remain">잔존물 내용</label>
                      </th>
                      <td>
                        <textarea
                          id="quote-remain"
                          rows={3}
                          value={quote.remain}
                          onChange={(e) => setQuote({ ...quote, remain: e.target.value })}
                        />
                      </td>
                    </tr>
                    <tr>
                      <th>
                        <label htmlFor="quote-note">특이사항</label>
                      </th>
                      <td>
                        <textarea
                          id="quote-note"
                          rows={3}
                          value={quote.note}
                          onChange={(e) => setQuote({ ...quote, note: e.target.value })}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button className="site-quote-submit" type="submit">
                  감정 문의
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section id="login-panel" className="site-login-target">
        <div className="site-section-inner">
          <form className="login-hero-panel form" onSubmit={onSubmit}>
            <h2>로그인</h2>
            <p className="login-hero-panel-desc">
              수출 경매 입찰 및 관리자 페이지 접속
            </p>
            <div className="field">
              <label htmlFor="username">아이디</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">비밀번호</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "로그인 중…" : "로그인"}
            </button>
            <p className="auth-switch">
              계정이 없으신가요? <Link href="/signup">회원가입</Link>
            </p>
            <p className="auth-contact">
              <a href="mailto:rbautoscrap@naver.com">rbautoscrap@naver.com</a>
            </p>
          </form>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
