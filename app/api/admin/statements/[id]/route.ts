import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  readStore,
  writeStore,
  type TransactionStatement,
} from "@/lib/db";
import { isBidCurrency } from "@/lib/currency";
import {
  DEFAULT_SUPPLIER,
  dateInputToIso,
  normalizeParty,
  normalizeStatement,
  normalizeStatementItem,
  roundMoney,
  type StatementItem,
} from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseItems(raw: unknown): StatementItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => normalizeStatementItem(item as Partial<StatementItem>, i))
    .filter((item) => item.name || item.amount);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const statementId = Number(id);
  const store = readStore();
  const statement = store.statements.find((s) => s.id === statementId);
  if (!statement) {
    return NextResponse.json(
      { error: "거래명세서를 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    statement: normalizeStatement(statement),
    accounts: store.bank_accounts,
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const statementId = Number(id);
  if (!Number.isInteger(statementId) || statementId <= 0) {
    return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const outcome: { error: string | null; statement: TransactionStatement | null } =
    { error: null, statement: null };

  writeStore((store) => {
    const statement = store.statements.find((s) => s.id === statementId);
    if (!statement) {
      outcome.error = "거래명세서를 찾을 수 없습니다.";
      return;
    }

    if (body.currency != null) {
      if (!isBidCurrency(body.currency)) {
        outcome.error = "통화가 올바르지 않습니다.";
        return;
      }
      statement.currency = body.currency;
    }

    if (body.issued_at != null) {
      const issuedRaw = String(body.issued_at).trim();
      const issuedAt = issuedRaw.includes("T")
        ? new Date(issuedRaw)
        : new Date(dateInputToIso(issuedRaw));
      if (Number.isNaN(issuedAt.getTime())) {
        outcome.error = "발행일이 올바르지 않습니다.";
        return;
      }
      statement.issued_at = issuedAt.toISOString();
    }

    if (body.supplier != null) {
      const supplier = normalizeParty(body.supplier);
      statement.supplier = supplier.name ? supplier : DEFAULT_SUPPLIER;
    }

    if (body.recipient != null) {
      const recipient = normalizeParty(body.recipient);
      if (!recipient.name) {
        outcome.error = "공급받는자 이름을 입력해 주세요.";
        return;
      }
      statement.recipient = recipient;
    }

    if (body.items != null) {
      const items = parseItems(body.items);
      if (items.length === 0) {
        outcome.error = "품목을 1개 이상 입력해 주세요.";
        return;
      }
      statement.items = items.map((item) => ({
        ...item,
        amount: roundMoney(item.amount, statement.currency),
      }));
    }

    if (Object.prototype.hasOwnProperty.call(body, "bank_account_id")) {
      const raw = body.bank_account_id;
      if (raw == null || raw === "") {
        statement.bank_account_id = null;
      } else {
        const bankId = Number(raw);
        if (!store.bank_accounts.some((a) => a.id === bankId)) {
          outcome.error = "선택한 입금 계좌를 찾을 수 없습니다.";
          return;
        }
        statement.bank_account_id = bankId;
      }
    }

    if (body.note != null) {
      statement.note = String(body.note).trim();
    }

    statement.updated_at = new Date().toISOString();
    outcome.statement = normalizeStatement(statement);
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  return NextResponse.json({ statement: outcome.statement });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const statementId = Number(id);
  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    const idx = store.statements.findIndex((s) => s.id === statementId);
    if (idx < 0) {
      outcome.error = "거래명세서를 찾을 수 없습니다.";
      return;
    }
    store.statements.splice(idx, 1);
  });

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
