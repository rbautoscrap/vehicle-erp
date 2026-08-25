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
  thumb: string | null;
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

const SERVICES = [
  {
    href: "#scrap",
    icon: "/site/icon-scrap.png",
    label: "폐차",
    external: false,
  },
  {
    href: "#usedcar",
    icon: "/site/icon-usedcar.png",
    label: "직영중고차",
    external: false,
  },
  {
    href: "http://rbauto.co.kr",
    icon: "/site/icon-parts.png",
    label: "친환경중고부품몰",
    external: true,
  },
  {
    href: "https://rbautotrade.com/",
    icon: "/site/icon-export.png",
    label: "쇼링수출",
    external: true,
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
        <div className="site-hero-inner">
          <p className="site-hero-kicker">정부정식 관허폐차사업소 알비오토 리싸이클링</p>
          <h1>RBAUTO ONE STOP SERVICE</h1>
          <ul className="site-hero-cards">
            {SERVICES.map((item) => (
              <li key={item.label}>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.icon} alt="" />
                    <strong>{item.label}</strong>
                  </a>
                ) : (
                  <a href={item.href}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.icon} alt="" />
                    <strong>{item.label}</strong>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="site-section" id="scrap">
        <div className="site-section-inner site-quote-layout">
          <div className="site-quote-brand">
            <p>전국에서 가장 높은 금액으로 안내 받으실 수 있습니다.</p>
            <div className="site-quote-phone">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/rbauto-logo.png" alt="RBAUTO" />
              <a href="tel:0415227327">041-522-7327</a>
            </div>
            <p className="site-quote-lead">
              온라인으로 간편하게 폐차 문의를 해보세요.
            </p>
          </div>
          {quoteDone ? (
            <p className="site-quote-ok">정상적으로 접수되었습니다. 메일 창이 열리면 전송해 주세요.</p>
          ) : (
            <form className="site-quote" onSubmit={onQuote}>
              <label>
                차량번호 <span>*</span>
                <input
                  required
                  value={quote.plate}
                  onChange={(e) => setQuote({ ...quote, plate: e.target.value })}
                />
              </label>
              <label>
                연락처 <span>*</span>
                <input
                  required
                  value={quote.phone}
                  onChange={(e) => setQuote({ ...quote, phone: e.target.value })}
                />
              </label>
              <label>
                차량위치 <span>*</span>
                <input
                  required
                  value={quote.location}
                  onChange={(e) => setQuote({ ...quote, location: e.target.value })}
                />
              </label>
              <label>
                차량 특이사항
                <textarea
                  rows={4}
                  value={quote.note}
                  onChange={(e) => setQuote({ ...quote, note: e.target.value })}
                />
              </label>
              <button className="site-quote-submit" type="submit">
                견적문의
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="site-faq-band">
        <div className="site-section-inner site-faq-layout">
          <div>
            <h2>궁금한 점이 있으신가요?</h2>
            <p>온라인으로 간편하게 자주 묻는 질문을 통해 확인해보세요</p>
          </div>
          <div className="site-faq">
            {FAQS.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section" id="about">
        <div className="site-section-inner site-prose">
          <h2>회사소개</h2>
          <p>
            알비오토는 환경을 생각하는 새로운 패러다임의 친환경 기업입니다. 폐차
            말소된 자동차를 전문적으로 해체하여 재활용하며, 환경보호와 자원 순환을
            최우선 목표로 삼고 있습니다.
          </p>
          <p>
            해체된 자동차에서 얻은 자원을 세계 각지에 공급하며, 매년 수천 톤의 폐차
            해체·재활용을 통해 지속 가능한 자원 순환 경제에 기여합니다.
          </p>
        </div>
      </section>

      <section className="site-section site-section-alt" id="parts">
        <div className="site-section-inner">
          <h2>친환경중고부품몰</h2>
          <a
            className="site-banner"
            href="http://rbauto.co.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/site/banner-parts.jpg" alt="" />
            <div className="site-banner-copy">
              <p>
                전 차종을 아우르는 국내 최대 중고부품 쇼핑몰 알비오토에서 놀라운
                가격으로 누구나 만족할 수 있는 새로운 경험을 제공해 드립니다.
              </p>
              <span>바로가기</span>
            </div>
          </a>
        </div>
      </section>

      <section className="site-section" id="usedcar">
        <div className="site-section-inner">
          <h2>직영중고차몰</h2>
          <div className="site-usedcar-card">
            <p>
              믿을 수 있는 곳을 찾고 계신가요? 직영중고차 전문 RBAUTO와 함께 하세요.
              최고의 조건과 합리적인 가격으로 다음 차량을 선택하실 수 있습니다.
            </p>
            <span>준비중</span>
          </div>
        </div>
      </section>

      <section className="site-section site-section-alt" id="export">
        <div className="site-section-inner site-split">
          <div>
            <h2>수출경매</h2>
            <p className="site-export-lead">
              Only for Export buyer. You can bid at auctions you wanted to export.
              Check crushed cars with our live auction.
            </p>
            <p className="login-live-note">미리보기 · 상세·입찰은 로그인 후 이용</p>
            {liveLoading && live.length === 0 ? (
              <p className="login-live-empty">불러오는 중…</p>
            ) : live.length === 0 ? (
              <p className="login-live-empty">현재 진행 중인 경매가 없습니다.</p>
            ) : (
              <ul className="login-live-list">
                {live.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="login-live-item"
                      onClick={requireLogin}
                    >
                      {a.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="login-live-thumb"
                          src={a.thumb}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="login-live-thumb login-live-thumb-empty">
                          —
                        </div>
                      )}
                      <div className="login-live-text">
                        <strong>
                          {a.year} {a.vehicle_type}
                        </strong>
                        <span className="login-live-meta">
                          {a.sale_type ? saleTypeLabelEn(a.sale_type) : "—"}
                          {" · "}
                          {fuelTypeLabelEn(a.fuel_type)}
                        </span>
                        <span className="login-live-ends">
                          Ends <Countdown endAt={a.end_at} />
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="login-live-count" style={{ marginTop: 10 }}>
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
