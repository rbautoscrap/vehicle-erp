"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAuth } from "@/components/AppShell";
import { AdminNav } from "@/components/AdminNav";
import { formatDateTime, formatWon } from "@/lib/format";
import type { MemberAnalyticsRow, MemberGrade } from "@/lib/memberAnalytics";

type Overview = {
  member_count: number;
  active_count: number;
  total_bids: number;
  total_win_amount: number;
  avg_participation: number;
  avg_sincerity: number;
  grade_a: number;
  grade_b: number;
  grade_c: number;
  grade_d: number;
};

type SortKey =
  | "participation_score"
  | "sincerity_score"
  | "bid_count"
  | "win_amount_total"
  | "win_count"
  | "username";

function gradeLabel(grade: MemberGrade) {
  if (grade === "A") return "우수";
  if (grade === "B") return "양호";
  if (grade === "C") return "보통";
  return "저조";
}

function gradeBadge(grade: MemberGrade) {
  if (grade === "A") return "badge-live";
  if (grade === "B") return "badge-bid";
  if (grade === "C") return "badge-upcoming";
  return "badge-ended";
}

function scoreBar(score: number) {
  return Math.max(0, Math.min(100, score));
}

export default function AdminMemberAnalyticsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [members, setMembers] = useState<MemberAnalyticsRow[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<"all" | MemberGrade>("all");
  const [sortKey, setSortKey] = useState<SortKey>("participation_score");
  const [fetchError, setFetchError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/analytics/members");
    if (!res.ok) {
      setFetchError("분석 데이터를 불러오지 못했습니다.");
      return;
    }
    const data = await res.json();
    setMembers(data.members || []);
    setOverview(data.overview || null);
    setFetchError("");
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      load();
      const timer = setInterval(load, 15000);
      return () => clearInterval(timer);
    }
  }, [user, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members
      .filter((m) => (gradeFilter === "all" ? true : m.grade === gradeFilter))
      .filter((m) => {
        if (!q) return true;
        return (
          m.username.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q)
        );
      });

    const sorted = [...list].sort((a, b) => {
      if (sortKey === "username") return a.username.localeCompare(b.username);
      return Number(b[sortKey]) - Number(a[sortKey]);
    });
    return sorted;
  }, [members, query, gradeFilter, sortKey]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="app-shell">
        <p className="page-desc">불러오는 중…</p>
      </div>
    );
  }

  return (
    <AppShell title="회원 분석">
      <AdminNav />
      <p className="page-desc">
        누적 입찰 건수·낙찰액과 참여도·성실도를 내부 검토용으로 집계합니다. 일반
        회원만 대상이며, 점수는 종료 경매 기준입니다.
      </p>

      {overview && (
        <div className="user-summary" aria-label="회원 분석 요약">
          <div className="user-summary-chip">
            <span className="user-summary-label">분석 대상</span>
            <strong className="user-summary-count">{overview.member_count}</strong>
          </div>
          <div className="user-summary-chip">
            <span className="user-summary-label">활성 회원</span>
            <strong className="user-summary-count">{overview.active_count}</strong>
          </div>
          <div className="user-summary-chip">
            <span className="user-summary-label">누적 입찰(건)</span>
            <strong className="user-summary-count">{overview.total_bids}</strong>
          </div>
          <div className="user-summary-chip">
            <span className="user-summary-label">누적 낙찰액</span>
            <strong className="user-summary-count" style={{ fontSize: "1rem" }}>
              {formatWon(overview.total_win_amount)}
            </strong>
          </div>
          <div className="user-summary-chip">
            <span className="user-summary-label">평균 참여도</span>
            <strong className="user-summary-count">{overview.avg_participation}</strong>
          </div>
          <div className="user-summary-chip">
            <span className="user-summary-label">평균 성실도</span>
            <strong className="user-summary-count">{overview.avg_sincerity}</strong>
          </div>
        </div>
      )}

      {overview && (
        <div className="analytics-grade-row">
          <span className={`badge ${gradeBadge("A")}`}>A 우수 {overview.grade_a}</span>
          <span className={`badge ${gradeBadge("B")}`}>B 양호 {overview.grade_b}</span>
          <span className={`badge ${gradeBadge("C")}`}>C 보통 {overview.grade_c}</span>
          <span className={`badge ${gradeBadge("D")}`}>D 저조 {overview.grade_d}</span>
        </div>
      )}

      <div className="user-toolbar">
        <input
          className="user-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름, 아이디 검색"
          aria-label="회원 검색"
        />
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value as "all" | MemberGrade)}
          aria-label="등급 필터"
        >
          <option value="all">전체 등급</option>
          <option value="A">A 우수</option>
          <option value="B">B 양호</option>
          <option value="C">C 보통</option>
          <option value="D">D 저조</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="정렬"
        >
          <option value="participation_score">참여도 높은순</option>
          <option value="sincerity_score">성실도 높은순</option>
          <option value="bid_count">입찰 건수순</option>
          <option value="win_amount_total">누적 낙찰액순</option>
          <option value="win_count">낙찰 횟수순</option>
          <option value="username">아이디순</option>
        </select>
        <span className="user-toolbar-meta">표시 {filtered.length}명</span>
      </div>

      {fetchError && <p className="error">{fetchError}</p>}

      <div className="analytics-legend">
        <p>
          <strong>참여도</strong>: 종료된 전체 경매 중 입찰에 참여한 비율(0–100)
        </p>
        <p>
          <strong>성실도</strong>: 낙찰률·확정률·경쟁 입찰·최근 활동으로 산출(0–100)
        </p>
        <p>
          <strong>누적 낙찰액</strong>: 해당 회원이 낙찰한 차량의 낙찰가(최고가)만
          합산
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">분석할 일반 회원이 없거나 조건에 맞는 회원이 없습니다.</div>
      ) : (
        <div className="user-table-wrap">
          <table className="user-table analytics-table">
            <thead>
              <tr>
                <th className="col-member">회원</th>
                <th className="col-grade">등급</th>
                <th className="col-num">입찰 건수</th>
                <th className="col-wins">낙찰 / 확정</th>
                <th className="col-amount">누적 낙찰액</th>
                <th className="col-score">참여도</th>
                <th className="col-score">성실도</th>
                <th className="col-memo">내부 메모</th>
                <th className="col-date">최근 입찰</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.user_id}>
                  <td className="col-member">
                    <div className="user-cell-name">
                      <strong>{m.name}</strong>
                      <span>@{m.username}</span>
                      <span className="badge">
                        {m.status === "active"
                          ? "활성"
                          : m.status === "pending"
                            ? "대기"
                            : "정지"}
                      </span>
                    </div>
                  </td>
                  <td className="col-grade">
                    <span className={`badge ${gradeBadge(m.grade)}`}>
                      {m.grade} {gradeLabel(m.grade)}
                    </span>
                  </td>
                  <td className="col-num">
                    <span className="bid-amount">{m.bid_count}</span>
                  </td>
                  <td className="col-wins">
                    {m.win_count} / {m.confirmed_win_count}
                  </td>
                  <td className="col-amount bid-amount">
                    {formatWon(m.win_amount_total)}
                  </td>
                  <td className="col-score">
                    <div className="score-cell">
                      <strong>{m.participation_score}</strong>
                      <div className="score-bar" aria-hidden="true">
                        <span style={{ width: `${scoreBar(m.participation_score)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="col-score">
                    <div className="score-cell">
                      <strong>{m.sincerity_score}</strong>
                      <div className="score-bar" aria-hidden="true">
                        <span style={{ width: `${scoreBar(m.sincerity_score)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="col-memo">
                    <div className="analytics-summary" title={m.summary}>
                      {m.summary}
                    </div>
                  </td>
                  <td className="col-date">
                    <span className="user-cell-date">
                      {m.last_bid_at ? formatDateTime(m.last_bid_at) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
