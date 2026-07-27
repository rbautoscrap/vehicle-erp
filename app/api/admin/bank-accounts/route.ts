import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readStore, writeStore, type BankAccount } from "@/lib/db";
import { normalizeBankAccount } from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const accounts = [...store.bank_accounts].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.id - b.id;
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const bank = String(body.bank || "").trim();
  const accountNumber = String(body.account_number || "").trim();
  const holder = String(body.holder || "").trim();
  const makeDefault = body.is_default === true;

  if (!bank || !accountNumber || !holder) {
    return NextResponse.json(
      { error: "은행, 계좌번호, 예금주를 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  let created: BankAccount | null = null;
  writeStore((store) => {
    const account = normalizeBankAccount({
      id: store.nextBankAccountId++,
      bank,
      account_number: accountNumber,
      holder,
      is_default: makeDefault || store.bank_accounts.length === 0,
      created_at: new Date().toISOString(),
    });
    if (account.is_default) {
      for (const a of store.bank_accounts) a.is_default = false;
    }
    store.bank_accounts.push(account);
    created = account;
  });

  return NextResponse.json({ account: created }, { status: 201 });
}
