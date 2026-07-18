import {
  resolveAuctionStatus,
  getWinningBid,
  readStore,
  type Role,
  type UserStatus,
} from "@/lib/db";

export type MemberGrade = "A" | "B" | "C" | "D";

export type MemberAnalyticsRow = {
  user_id: number;
  username: string;
  name: string;
  role: Role;
  status: UserStatus;
  created_at: string;
  /** Unique auctions the user placed a bid on */
  bid_count: number;
  /** Ended auctions won (highest bid), any result status */
  win_count: number;
  /** Sum of winning prices for vehicles the user won (KRW) */
  win_amount_total: number;
  /** Admin-confirmed wins only (used for sincerity scoring) */
  confirmed_win_count: number;
  /** Ended auctions the user joined */
  ended_joined: number;
  /** Participation 0–100 among ended auctions */
  participation_score: number;
  /** Reliability / sincerity 0–100 */
  sincerity_score: number;
  grade: MemberGrade;
  last_bid_at: string | null;
  summary: string;
};

function gradeFromScores(participation: number, sincerity: number): MemberGrade {
  const avg = (participation + sincerity) / 2;
  if (avg >= 75) return "A";
  if (avg >= 55) return "B";
  if (avg >= 35) return "C";
  return "D";
}

function summaryFor(row: Omit<MemberAnalyticsRow, "summary" | "grade"> & { grade: MemberGrade }) {
  if (row.bid_count === 0) return "입찰 이력 없음 · 참여 유도 필요";
  if (row.grade === "A") return "참여·성실도 우수 · 핵심 회원";
  if (row.grade === "B") return "양호 · 지속 참여 기대";
  if (row.grade === "C") return "보통 · 참여 확대 여지";
  if (row.confirmed_win_count === 0 && row.win_count > 0) {
    return "낙찰 후 확정 대기 · 결과 처리 확인";
  }
  return "참여·성실도 낮음 · 모니터링 권장";
}

/** Build per-member bidding / winning analytics for admin internal review. */
export function buildMemberAnalytics(store = readStore()): MemberAnalyticsRow[] {
  const endedAuctions = store.auctions.filter(
    (a) => resolveAuctionStatus(a) === "ended"
  );
  const endedCount = endedAuctions.length;
  const now = Date.now();
  const day30 = 30 * 24 * 60 * 60 * 1000;

  const rows = store.users
    .filter((u) => u.role === "user")
    .map((user) => {
      const userBids = store.bids.filter((b) => b.user_id === user.id);
      const bidAuctionIds = new Set(userBids.map((b) => b.auction_id));
      const bid_count = bidAuctionIds.size;

      let win_count = 0;
      let win_amount_total = 0;
      let confirmed_win_count = 0;
      let ended_joined = 0;
      let competitive_near_miss = 0;

      for (const auction of endedAuctions) {
        const myBid = userBids.find((b) => b.auction_id === auction.id);
        if (!myBid) continue;
        ended_joined += 1;

        const winning = getWinningBid(auction.id, store);
        if (winning && winning.user_id === user.id) {
          win_count += 1;
          // Only the final winning price of vehicles this member won
          win_amount_total += winning.amount;
          if (auction.result_status === "confirmed") {
            confirmed_win_count += 1;
          }
        } else if (winning && myBid.amount >= winning.amount * 0.85) {
          competitive_near_miss += 1;
        }
      }

      const participation_score =
        endedCount === 0
          ? 0
          : Math.round(Math.min(100, (ended_joined / endedCount) * 100));

      const winRate = ended_joined > 0 ? win_count / ended_joined : 0;
      const confirmRate = win_count > 0 ? confirmed_win_count / win_count : 1;
      const effortRate =
        ended_joined > 0
          ? (win_count + competitive_near_miss * 0.5) / ended_joined
          : 0;

      const recentBids = userBids.filter(
        (b) => now - new Date(b.created_at).getTime() <= day30
      ).length;
      const recentBoost = Math.min(20, recentBids * 4);

      const sincerity_score = Math.round(
        Math.min(
          100,
          winRate * 35 + confirmRate * 35 + Math.min(1, effortRate) * 15 + recentBoost * 0.75
        )
      );

      const last_bid_at =
        userBids.length === 0
          ? null
          : userBids
              .map((b) => b.created_at)
              .sort((a, b) => b.localeCompare(a))[0] || null;

      const grade = gradeFromScores(participation_score, sincerity_score);
      const base = {
        user_id: user.id,
        username: user.username,
        name: user.name || user.username,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        bid_count,
        win_count,
        win_amount_total,
        confirmed_win_count,
        ended_joined,
        participation_score,
        sincerity_score,
        grade,
        last_bid_at,
      };

      return {
        ...base,
        summary: summaryFor(base),
      };
    })
    .sort((a, b) => {
      const scoreA = a.participation_score + a.sincerity_score;
      const scoreB = b.participation_score + b.sincerity_score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.win_amount_total !== a.win_amount_total) {
        return b.win_amount_total - a.win_amount_total;
      }
      return b.bid_count - a.bid_count;
    });

  return rows;
}

export function memberAnalyticsOverview(rows: MemberAnalyticsRow[]) {
  const activeRows = rows.filter((r) => r.status === "active");
  return {
    member_count: rows.length,
    active_count: activeRows.length,
    total_bids: rows.reduce((s, r) => s + r.bid_count, 0),
    total_win_amount: rows.reduce((s, r) => s + r.win_amount_total, 0),
    avg_participation: rows.length
      ? Math.round(rows.reduce((s, r) => s + r.participation_score, 0) / rows.length)
      : 0,
    avg_sincerity: rows.length
      ? Math.round(rows.reduce((s, r) => s + r.sincerity_score, 0) / rows.length)
      : 0,
    grade_a: rows.filter((r) => r.grade === "A").length,
    grade_b: rows.filter((r) => r.grade === "B").length,
    grade_c: rows.filter((r) => r.grade === "C").length,
    grade_d: rows.filter((r) => r.grade === "D").length,
  };
}
