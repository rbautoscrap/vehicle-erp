import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  allocateStatementNumber,
  listStatementRecipients,
  readStore,
  upsertStatementRecipient,
  writeStore,
  type TransactionStatement,
} from "@/lib/db";
import {
  DEFAULT_SUPPLIER,
  dateInputToIso,
  normalizeParty,
  normalizeStatement,
  normalizeStatementItem,
  roundMoney,
  statementSupplyTotal,
  type StatementItem,
} from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseItems(raw: unknown): StatementItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => normalizeStatementItem(item as Partial<StatementItem>, i))
    .filter((item) => item.name || item.amount);
}

export async function GET() {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const store = readStore();
  const statements = [...store.statements].sort((a, b) =>
    b.issued_at.localeCompare(a.issued_at) || b.id - a.id
  );
  const accounts = store.bank_accounts;
  const recipients = listStatementRecipients(store);
  return NextResponse.json({ statements, accounts, recipients });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const body = await req.json().catch(() => ({}));
  const currency = "KRW" as const;
  const items = parseItems(body.items);
  const recipient = normalizeParty(body.recipient);
  const supplier = normalizeParty(body.supplier || DEFAULT_SUPPLIER);
  const note = String(body.note || "").trim();
  const issuedRaw = String(body.issued_at || "").trim();
  const issuedAt = issuedRaw.includes("T")
    ? new Date(issuedRaw)
    : new Date(dateInputToIso(issuedRaw || ""));
  const bankAccountIdRaw = body.bank_account_id;
  const bankAccountId =
    bankAccountIdRaw == null || bankAccountIdRaw === ""
      ? null
      : Number(bankAccountIdRaw);

  if (!recipient.company) {
    return NextResponse.json(
      { error: "공급받는자 상호를 입력해 주세요." },
      { status: 400 }
    );
  }
  if (items.length === 0) {
    return NextResponse.json(
      { error: "품목을 1개 이상 입력해 주세요." },
      { status: 400 }
    );
  }
  if (Number.isNaN(issuedAt.getTime())) {
    return NextResponse.json({ error: "발행일이 올바르지 않습니다." }, { status: 400 });
  }

  let created: TransactionStatement | null = null;
  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    let resolvedBankId = bankAccountId;
    if (resolvedBankId != null) {
      if (!store.bank_accounts.some((a) => a.id === resolvedBankId)) {
        outcome.error = "선택한 입금 계좌를 찾을 수 없습니다.";
        return;
      }
    } else {
      const def =
        store.bank_accounts.find((a) => a.is_default) || store.bank_accounts[0];
      resolvedBankId = def?.id ?? null;
    }

    const now = new Date().toISOString();
    const statement = normalizeStatement({
      id: store.nextStatementId++,
      number: allocateStatementNumber(store, issuedAt),
      issued_at: issuedAt.toISOString(),
      currency,
      supplier: supplier.name ? supplier : DEFAULT_SUPPLIER,
      recipient,
      items: items.map((item) => ({
        ...item,
        amount: roundMoney(item.amount, currency),
      })),
      bank_account_id: resolvedBankId,
      note,
      created_at: now,
      updated_at: now,
    });
    // Ensure totals are consistent (amounts already rounded)
    void statementSupplyTotal(statement.items);
    store.statements.push(statement);
    upsertStatementRecipient(store, recipient);
    created = statement;
  });

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }

  return NextResponse.json({ statement: created }, { status: 201 });
}
