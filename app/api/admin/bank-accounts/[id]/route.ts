import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { writeStore, type BankAccount } from "@/lib/db";
import { normalizeBankAccount } from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "잘못된 계좌 ID입니다." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const outcome: { error: string | null; account: BankAccount | null } = {
    error: null,
    account: null,
  };

  writeStore((store) => {
    const account = store.bank_accounts.find((a) => a.id === accountId);
    if (!account) {
      outcome.error = "계좌를 찾을 수 없습니다.";
      return;
    }
    if (body.bank != null) account.bank = String(body.bank).trim();
    if (body.account_number != null) {
      account.account_number = String(body.account_number).trim();
    }
    if (body.holder != null) account.holder = String(body.holder).trim();
    if (body.is_default === true) {
      for (const a of store.bank_accounts) a.is_default = a.id === accountId;
    }
    if (!account.bank || !account.account_number || !account.holder) {
      outcome.error = "은행, 계좌번호, 예금주를 모두 입력해 주세요.";
      return;
    }
    const normalized = normalizeBankAccount(account);
    Object.assign(account, normalized);
    outcome.account = account;
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  return NextResponse.json({ account: outcome.account });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "잘못된 계좌 ID입니다." }, { status: 400 });
  }

  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    const idx = store.bank_accounts.findIndex((a) => a.id === accountId);
    if (idx < 0) {
      outcome.error = "계좌를 찾을 수 없습니다.";
      return;
    }
    if (store.bank_accounts.length <= 1) {
      outcome.error = "최소 1개의 입금 계좌가 필요합니다.";
      return;
    }
    const wasDefault = store.bank_accounts[idx].is_default;
    store.bank_accounts.splice(idx, 1);
    if (wasDefault && store.bank_accounts.length > 0) {
      store.bank_accounts[0].is_default = true;
    }
    for (const s of store.statements) {
      if (s.bank_account_id === accountId) s.bank_account_id = null;
    }
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
