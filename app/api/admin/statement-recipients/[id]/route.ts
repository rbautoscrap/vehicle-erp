import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listStatementRecipients,
  writeStore,
  type StatementRecipientContact,
} from "@/lib/db";
import {
  normalizeRecipientContact,
  recipientContactKey,
} from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const recipientId = Number(id);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    return NextResponse.json({ error: "잘못된 거래처 ID입니다." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const company = String(body.company || "").trim();
  const contactPerson = String(body.contact_person || "").trim();
  const contactPhone = String(body.contact_phone || "").trim();
  const address = String(body.address || "").trim();

  if (!company) {
    return NextResponse.json(
      { error: "상호를 입력해 주세요." },
      { status: 400 }
    );
  }

  const outcome: {
    error: string | null;
    recipient: StatementRecipientContact | null;
  } = { error: null, recipient: null };

  writeStore((store) => {
    const recipient = store.statement_recipients.find((r) => r.id === recipientId);
    if (!recipient) {
      outcome.error = "거래처를 찾을 수 없습니다.";
      return;
    }
    const key = recipientContactKey(company);
    const dup = store.statement_recipients.find(
      (r) => r.id !== recipientId && recipientContactKey(r.company) === key
    );
    if (dup) {
      outcome.error = "같은 상호의 거래처가 이미 있습니다.";
      return;
    }
    const now = new Date().toISOString();
    recipient.company = company;
    recipient.contact_person = contactPerson;
    recipient.contact_phone = contactPhone;
    recipient.address = address;
    recipient.updated_at = now;
    outcome.recipient = normalizeRecipientContact(recipient);
  });

  if (outcome.error) {
    const status = outcome.error.includes("찾을 수 없") ? 404 : 400;
    return NextResponse.json({ error: outcome.error }, { status });
  }

  return NextResponse.json({
    recipient: outcome.recipient,
    recipients: listStatementRecipients(),
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession(["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const recipientId = Number(id);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    return NextResponse.json({ error: "잘못된 거래처 ID입니다." }, { status: 400 });
  }

  const outcome: { error: string | null } = { error: null };

  writeStore((store) => {
    const idx = store.statement_recipients.findIndex((r) => r.id === recipientId);
    if (idx < 0) {
      outcome.error = "거래처를 찾을 수 없습니다.";
      return;
    }
    store.statement_recipients.splice(idx, 1);
  });

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    recipients: listStatementRecipients(),
  });
}
