"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";

export default function AdminHomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  return (
    <AppShell title="관리자">
      <AdminNav />
      <p className="page-desc">
        아래에서 원하는 메뉴를 선택하세요. 진행 중 경매와 잔존물관리는 페이지가 분리되어
        있습니다.
      </p>

      <div className="admin-cards">
        <Link href="/admin/products/new" className="admin-card admin-card-primary">
          <strong>잔존물등록</strong>
          <span>차량 정보·사진·일정을 입력해 경매를 등록합니다.</span>
        </Link>
        <Link href="/admin/live" className="admin-card">
          <strong>진행 중 경매</strong>
          <span>실시간 입찰 현황을 확인합니다.</span>
        </Link>
        <Link href="/admin/results" className="admin-card">
          <strong>경매 결과</strong>
          <span>종료된 경매의 낙찰 결과 확인·수정을 합니다.</span>
        </Link>
        <Link href="/admin/products" className="admin-card">
          <strong>잔존물관리</strong>
          <span>등록된 잔존물을 조회·수정·삭제합니다.</span>
        </Link>
        <Link href="/admin/users" className="admin-card">
          <strong>회원 관리</strong>
          <span>가입 승인, 로그인 정지, 권한을 관리합니다.</span>
        </Link>
        <Link href="/admin/analytics" className="admin-card">
          <strong>회원 분석</strong>
          <span>누적 입찰 건수·낙찰액, 참여도·성실도를 내부 분석합니다.</span>
        </Link>
        <Link href="/admin/fx" className="admin-card">
          <strong>환율</strong>
          <span>미화·유로화 → 원화 환산 환율을 수정합니다.</span>
        </Link>
        <Link href="/profile" className="admin-card">
          <strong>프로필</strong>
          <span>관리자 계정 정보와 비밀번호를 변경합니다.</span>
        </Link>
      </div>
    </AppShell>
  );
}
