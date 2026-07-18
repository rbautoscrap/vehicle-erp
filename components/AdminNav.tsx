"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "홈", exact: true },
  { href: "/admin/live", label: "진행 중 경매" },
  { href: "/admin/results", label: "경매 결과" },
  { href: "/admin/products", label: "잔존물관리" },
  { href: "/admin/products/new", label: "잔존물등록" },
  { href: "/admin/users", label: "회원 관리" },
  { href: "/admin/analytics", label: "회원 분석" },
  { href: "/admin/fx", label: "환율" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="관리자 메뉴">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/admin/products"
            ? pathname === "/admin/products" ||
              (/^\/admin\/products\/\d+/.test(pathname) &&
                !pathname.startsWith("/admin/products/new"))
            : link.href === "/admin/products/new"
              ? pathname === "/admin/products/new"
              : link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`btn${isActive ? " admin-nav-active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
