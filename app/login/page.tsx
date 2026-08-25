"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import { fuelTypeLabelEn, saleTypeLabelEn } from "@/lib/labels";

type LiveTeaser = {
  id: number;
  year: string;
  vehicle_type: string;
  fuel_type: string;
  sale_type: string;
  end_at: string;
};

const FAQS = [
  {
    q: "폐차 신청 시 기간은 얼마나 걸리나요?",
    a: "압류 및 저당 사항이 없고 기타 특이사항이 없는 경우 1~2일 내로 폐차가 가능합니다. 압류·저당이 있는 경우에도 연식 조건에 맞으면 관련 행정기관 심사 후 말소가 가능하며, 심사기간은 신청일로부터 대략 45일 정도 소요됩니다. 폐차비용 지급은 동일하게 이루어집니다.",
  },
  {
    q: "폐차 신청 시 필요한 서류가 있나요?",
    a: "개인: 자동차등록증, 신분증, 폐차비 환급 통장사본. 법인: 자동차등록증, 신분증, 법인인감증명서, 사업자등록증, 법인등기부등본, 폐차비 환급 통장사본.",
  },
  {
    q: "폐차 신청 시 절차가 궁금하신가요?",
    a: "서류 구비 후 폐차의뢰 → 폐차비 감정 → 픽업/탁송 → 차량입고 → 폐차등록 → 국토교통부 온라인 말소. 말소 완료 후 ‘폐차량 입고 증명서’와 ‘자동차말소등록사실증명서’ 스캔본을 문자로 발송해 드립니다.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<LiveTeaser[]>([]);
  const [totalLive, setTotalLive] = useState(0);
  const [liveLoading, setLiveLoading] = useState(true);
  const [gateHint, setGateHint] = useState("");
  const [quote, setQuote] = useState({
    plate: "",
    phone: "",
    location: "",
    note: "",
  });
  const [quoteDone, setQuoteDone] = useState(false);

  const loadLive = useCallback(async () => {
    try {
      const res = await fetch("/api/public/live");
      if (!res.ok) return;
      const data = await res.json();
      setLive(Array.isArray(data.auctions) ? data.auctions : []);
      setTotalLive(Number(data.total_live) || 0);
    } catch {
      // keep previous list
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(d.user.role === "admin" ? "/admin" : "/");
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    loadLive();
    const id = setInterval(loadLive, 5000);
    return () => clearInterval(id);
  }, [loadLive]);

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

  function requireLogin() {
    setGateHint("상세 확인과 입찰을 위해 로그인해 주세요.");
    document.getElementById("login-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function onQuote(e: FormEvent) {
    e.preventDefault();
    const body = [
      "폐차 견적 문의",
      `차량번호: ${quote.plate}`,
      `연락처: ${quote.phone}`,
      `차량위치: ${quote.location}`,
      `특이사항: ${quote.note || "-"}`,
    ].join("\n");
    window.location.href = `mailto:rbautoscrap@naver.com?subject=${encodeURIComponent(
      "폐차 견적 문의"
    )}&body=${encodeURIComponent(body)}`;
    setQuoteDone(true);
  }

  return (
    <div className="site-page">
      <PublicHeader />

      <section className="site-hero" id="home">
        <div className="site-section-inner">
          <p className="site-kicker">정부정식 관허폐차사업소</p>
          <h1 className="site-hero-title">RBAUTO ONE STOP SERVICE</h1>
          <p className="site-hero-lead">
            알비오토 리싸이클링 · 폐차 · 직영중고차 · 친환경중고부품 · 수출
          </p>
        </div>
      </section>

      <section className="site-section">
        <div className="site-section-inner">
          <h2 className="site-heading">원스톱 서비스</h2>
          <div className="site-table-wrap">
            <table className="site-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>내용</th>
                  <th>바로가기</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>폐차</th>
                  <td>관허 폐차 · 감정 · 말소 대행</td>
                  <td>
                    <a href="#scrap">견적문의</a>
                  </td>
                </tr>
                <tr>
                  <th>직영중고차</th>
                  <td>신뢰와 품질의 직영 매매</td>
                  <td>
                    <a href="#usedcar">안내</a>
                  </td>
                </tr>
                <tr>
                  <th>친환경중고부품몰</th>
                  <td>전 차종 재활용 부품</td>
                  <td>
                    <a href="http://rbauto.co.kr" target="_blank" rel="noopener noreferrer">
                      rbauto.co.kr
                    </a>
                  </td>
                </tr>
                <tr>
                  <th>쇼링수출</th>
                  <td>Only for export buyer</td>
                  <td>
                    <a href="https://rbautotrade.com/" target="_blank" rel="noopener noreferrer">
                      rbautotrade.com
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="site-section site-section-alt" id="scrap">
        <div className="site-section-inner">
          <h2 className="site-heading">폐차감정</h2>
          <p className="site-lead">
            온라인으로 간편하게 폐차 문의를 해보세요. 전국에서 가장 높은 금액으로
            안내받으실 수 있습니다.
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
                    <td>차량번호, 연락처, 위치를 남겨 주시면 견적을 안내합니다.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {quoteDone ? (
              <p className="site-quote-ok">정상적으로 접수되었습니다. 메일 창이 열리면 전송해 주세요.</p>
            ) : (
              <form className="site-quote" onSubmit={onQuote}>
                <table className="site-table site-form-table">
                  <tbody>
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
                        <label htmlFor="quote-note">차량 특이사항</label>
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
                  견적문의
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="site-section">
        <div className="site-section-inner">
          <h2 className="site-heading">자주 묻는 질문</h2>
          <div className="site-table-wrap">
            <table className="site-table site-faq-table">
              <thead>
                <tr>
                  <th>질문</th>
                  <th>답변</th>
                </tr>
              </thead>
              <tbody>
                {FAQS.map((item) => (
                  <tr key={item.q}>
                    <th>{item.q}</th>
                    <td>{item.a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="site-section site-section-alt" id="usedcar">
        <div className="site-section-inner">
          <h2 className="site-heading">사업 안내</h2>
          <div className="site-table-wrap">
            <table className="site-table">
              <thead>
                <tr>
                  <th>사업</th>
                  <th>안내</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr id="parts">
                  <th>친환경중고부품몰</th>
                  <td>
                    전 차종을 아우르는 중고부품 쇼핑몰에서 합리적인 가격으로
                    부품을 확인하실 수 있습니다.
                  </td>
                  <td>
                    <a href="http://rbauto.co.kr" target="_blank" rel="noopener noreferrer">
                      바로가기
                    </a>
                  </td>
                </tr>
                <tr>
                  <th>직영중고차몰</th>
                  <td>
                    직영중고차 전문 RBAUTO와 함께 다음 차량을 선택하실 수 있습니다.
                  </td>
                  <td>준비중</td>
                </tr>
                <tr>
                  <th>쇼링수출</th>
                  <td>Our platform facilitates the export of cars from Korea.</td>
                  <td>
                    <a href="https://rbautotrade.com/" target="_blank" rel="noopener noreferrer">
                      바로가기
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="site-section" id="export">
        <div className="site-section-inner site-split">
          <div>
            <h2 className="site-heading">수출경매</h2>
            <p className="site-export-lead">
              Only for Export buyer. You can bid at auctions you wanted to export.
            </p>
            <p className="login-live-note">미리보기 · 상세·입찰은 로그인 후 이용</p>
            {liveLoading && live.length === 0 ? (
              <p className="login-live-empty">불러오는 중…</p>
            ) : live.length === 0 ? (
              <p className="login-live-empty">현재 진행 중인 경매가 없습니다.</p>
            ) : (
              <div className="site-table-wrap">
                <table className="site-table">
                  <thead>
                    <tr>
                      <th>차량</th>
                      <th>판매</th>
                      <th>연료</th>
                      <th>마감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.map((a) => (
                      <tr key={a.id}>
                        <th>
                          <button
                            type="button"
                            className="site-row-link"
                            onClick={requireLogin}
                          >
                            {a.year} {a.vehicle_type}
                          </button>
                        </th>
                        <td>{a.sale_type ? saleTypeLabelEn(a.sale_type) : "—"}</td>
                        <td>{fuelTypeLabelEn(a.fuel_type)}</td>
                        <td>
                          <Countdown endAt={a.end_at} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="login-live-count">
              {liveLoading && live.length === 0 ? "…" : `Live ${totalLive}`}
            </p>
          </div>

          <form
            id="login-panel"
            className="login-hero-panel form"
            onSubmit={onSubmit}
          >
            <h2>로그인</h2>
            <p className="login-hero-panel-desc">
              수출 경매 입찰 및 관리자 페이지 접속
            </p>
            {gateHint && <p className="login-gate-hint">{gateHint}</p>}
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
