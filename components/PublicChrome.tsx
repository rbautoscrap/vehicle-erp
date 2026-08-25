"use client";

import { useState } from "react";
import Link from "next/link";

const NAV = [
  { href: "/login#home", label: "HOME" },
  { href: "/login#about", label: "회사소개" },
  { href: "/login#scrap", label: "폐차감정" },
  {
    href: "http://rbauto.co.kr",
    label: "친환경중고부품몰",
    external: true,
  },
  { href: "/login#usedcar", label: "직영중고차몰" },
  { href: "/login#export", label: "수출경매" },
  { href: "/login#recruit", label: "인재채용" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/login" className="site-logo" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rbauto-logo.png" alt="RBAUTO" />
        </Link>
        <button
          type="button"
          className="site-menu-toggle"
          aria-expanded={open}
          aria-label="메뉴"
          onClick={() => setOpen((v) => !v)}
        >
          MENU
        </button>
        <nav className={`site-nav${open ? " is-open" : ""}`} aria-label="사이트 메뉴">
          {NAV.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            )
          )}
          <Link
            href="/login#login-panel"
            className="site-nav-login"
            onClick={() => setOpen(false)}
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer" id="recruit">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rbauto-logo.png" alt="RBAUTO" />
          <div>
            <strong>주식회사 알비오토</strong>
            <p>정부정식 관허폐차사업소 · RBAUTO ONE STOP SERVICE</p>
          </div>
        </div>
        <div className="site-footer-links">
          <a href="http://rbauto.co.kr" target="_blank" rel="noopener noreferrer">
            친환경중고부품몰
          </a>
          <a href="https://smartstore.naver.com/rbauto" target="_blank" rel="noopener noreferrer">
            중고부품 스토어
          </a>
          <a href="http://rbauto.kr" target="_blank" rel="noopener noreferrer">
            수출경공매
          </a>
          <a href="https://rbautotrade.com/" target="_blank" rel="noopener noreferrer">
            쇼링수출
          </a>
        </div>
        <address>
          본사 : 31214 충남 천안시 동남구 청수5로 4, 더다움 트윈브릿지 A동 7층
          <br />
          지점 : 27471 충북 충주시 대소원면 산정독정길 143 폐차사업부
          <br />
          지점 : 27829 충북 진천군 문진로 1308 수출사업부
          <br />
          지점 : 27479 충북 충주시 풍동길 68 부품사업부
          <br />
          Tel. 041-522-7327 / Fax. 041-522-7326 / E-mail. rbautoscrap@naver.com
        </address>
        <p className="site-copy">COPYRIGHT © RBAUTO. ALL RIGHTS RESERVED</p>
      </div>
    </footer>
  );
}
