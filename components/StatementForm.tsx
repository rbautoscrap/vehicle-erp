"use client";

import { FormEvent, useMemo, useState } from "react";
import type { BidCurrency } from "@/lib/currency";
import { CURRENCIES } from "@/lib/currency";
import type {
  BankAccount,
  StatementItem,
  StatementParty,
  TransactionStatement,
} from "@/lib/statements";
import {
  DEFAULT_STATEMENT_NOTE,
  DEFAULT_SUPPLIER,
  DEFAULT_SUPPLIER_ADDRESS,
  FIXED_SUPPLIER_PHONE,
  bankAccountLabel,
  dateInputToIso,
  formatStatementMoney,
  newStatementItem,
  statementGrandTotal,
  statementSupplyTotal,
  statementVatAmount,
  toDateInputValue,
} from "@/lib/statements";
import { StatementDocument } from "@/components/StatementDocument";
import { StatementToolbar } from "@/components/StatementToolbar";
import type { StatementLocale } from "@/lib/statementI18n";

export type StatementFormValues = {
  issued_at: string;
  currency: BidCurrency;
  supplier: StatementParty;
  recipient: StatementParty;
  items: StatementItem[];
  bank_account_id: number | null;
  note: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: TransactionStatement | null;
  accounts: BankAccount[];
  saving?: boolean;
  error?: string;
  onSubmit: (values: StatementFormValues) => void | Promise<void>;
  onAccountsChange?: () => void;
};

function defaultValues(
  initial: TransactionStatement | null | undefined,
  accounts: BankAccount[]
): StatementFormValues {
  const defAccount =
    accounts.find((a) => a.is_default) || accounts[0] || null;
  if (initial) {
    const supplier = {
      ...initial.supplier,
      phone: FIXED_SUPPLIER_PHONE,
    };
    if (!supplier.address?.trim()) {
      supplier.address = DEFAULT_SUPPLIER_ADDRESS;
    }
    return {
      issued_at: toDateInputValue(initial.issued_at),
      currency: initial.currency,
      supplier,
      recipient: { ...initial.recipient },
      items:
        initial.items.length > 0
          ? initial.items.map((i) => ({ ...i }))
          : [newStatementItem(0)],
      bank_account_id: initial.bank_account_id ?? defAccount?.id ?? null,
      note: initial.note || DEFAULT_STATEMENT_NOTE,
    };
  }
  return {
    issued_at: toDateInputValue(new Date().toISOString()),
    currency: "KRW",
    supplier: { ...DEFAULT_SUPPLIER },
    recipient: {
      name: "",
      company: "",
      phone: "",
      whatsapp: "",
      contact_person: "",
      contact_phone: "",
      address: "",
    },
    items: [newStatementItem(0)],
    bank_account_id: defAccount?.id ?? null,
    note: DEFAULT_STATEMENT_NOTE,
  };
}

export function StatementForm({
  mode,
  initial,
  accounts,
  saving,
  error,
  onSubmit,
  onAccountsChange,
}: Props) {
  const [values, setValues] = useState(() => defaultValues(initial, accounts));
  const [showPreview, setShowPreview] = useState(true);
  const [locale, setLocale] = useState<StatementLocale>("ko");
  const [accountForm, setAccountForm] = useState({
    bank: "",
    account_number: "",
    holder: "",
  });
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");

  const docId = "statement-document";
  const selectedAccount =
    accounts.find((a) => a.id === values.bank_account_id) || null;

  const previewStatement: TransactionStatement = useMemo(
    () => ({
      id: initial?.id ?? 0,
      number: initial?.number || "TS-PREVIEW-0000",
      issued_at: dateInputToIso(values.issued_at),
      currency: values.currency,
      supplier: { ...values.supplier, phone: FIXED_SUPPLIER_PHONE },
      recipient: values.recipient,
      items: values.items,
      bank_account_id: values.bank_account_id,
      note: values.note,
      created_at: initial?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    [initial, values]
  );

  const supply = statementSupplyTotal(values.items);
  const vat = statementVatAmount(values.items, values.currency);
  const grandTotal = statementGrandTotal(values.items, values.currency);

  function updateItem(id: string, patch: Partial<StatementItem>) {
    setValues((v) => ({
      ...v,
      items: v.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addItem() {
    setValues((v) => ({
      ...v,
      items: [...v.items, newStatementItem(v.items.length)],
    }));
  }

  function removeItem(id: string) {
    setValues((v) => ({
      ...v,
      items: v.items.length <= 1 ? v.items : v.items.filter((i) => i.id !== id),
    }));
  }

  async function addBankAccount() {
    setAccountError("");
    setAccountBusy(true);
    try {
      const res = await fetch("/api/admin/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...accountForm,
          is_default: accounts.length === 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAccountError(data.error || "계좌 추가에 실패했습니다.");
        return;
      }
      setAccountForm({ bank: "", account_number: "", holder: "" });
      if (data.account?.id) {
        setValues((v) => ({ ...v, bank_account_id: data.account.id }));
      }
      onAccountsChange?.();
    } finally {
      setAccountBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void onSubmit({
      ...values,
      supplier: { ...values.supplier, phone: FIXED_SUPPLIER_PHONE },
    });
  }

  return (
    <div className="ts-layout">
      <form className="form ts-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="issued_at">발행일</label>
            <input
              id="issued_at"
              type="date"
              required
              value={values.issued_at}
              onChange={(e) =>
                setValues((v) => ({ ...v, issued_at: e.target.value }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="currency">통화</label>
            <select
              id="currency"
              value={values.currency}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  currency: e.target.value as BidCurrency,
                }))
              }
            >
              {[...CURRENCIES]
                .sort((a, b) =>
                  a.code === "KRW" ? -1 : b.code === "KRW" ? 1 : 0
                )
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {mode === "edit" && initial?.number && (
          <p className="field-hint">명세서 번호: {initial.number}</p>
        )}

        <h2 className="ts-section-title">공급자</h2>
        <div className="field">
          <label htmlFor="supplier_company">상호명</label>
          <input
            id="supplier_company"
            value={values.supplier.company}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                supplier: { ...v.supplier, company: e.target.value },
              }))
            }
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="supplier_phone">대표번호</label>
            <input
              id="supplier_phone"
              value={FIXED_SUPPLIER_PHONE}
              readOnly
              disabled
            />
          </div>
          <div className="field">
            <label htmlFor="supplier_contact_person">담당 프로</label>
            <input
              id="supplier_contact_person"
              value={values.supplier.contact_person}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  supplier: { ...v.supplier, contact_person: e.target.value },
                }))
              }
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="supplier_contact_phone">담당 연락처</label>
            <input
              id="supplier_contact_phone"
              value={values.supplier.contact_phone}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  supplier: { ...v.supplier, contact_phone: e.target.value },
                }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="supplier_address">기본 주소</label>
            <input
              id="supplier_address"
              value={values.supplier.address}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  supplier: { ...v.supplier, address: e.target.value },
                }))
              }
            />
          </div>
        </div>

        <h2 className="ts-section-title">공급받는자</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="recipient_name">성명 *</label>
            <input
              id="recipient_name"
              required
              value={values.recipient.name}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  recipient: { ...v.recipient, name: e.target.value },
                }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="recipient_company">상호</label>
            <input
              id="recipient_company"
              value={values.recipient.company}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  recipient: { ...v.recipient, company: e.target.value },
                }))
              }
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="recipient_address">주소</label>
          <input
            id="recipient_address"
            value={values.recipient.address}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                recipient: { ...v.recipient, address: e.target.value },
              }))
            }
          />
        </div>

        <h2 className="ts-section-title">품목</h2>
        <div className="ts-items">
          <table className="ts-items-table">
            <thead>
              <tr>
                <th scope="col">품목</th>
                <th scope="col">상세</th>
                <th scope="col" className="ts-col-qty">
                  수량
                </th>
                <th scope="col" className="ts-col-amount">
                  단가
                </th>
                <th scope="col" className="ts-col-action">
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {values.items.map((item, idx) => (
                <tr key={item.id}>
                  <td>
                    <input
                      aria-label={`품목 ${idx + 1}`}
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, { name: e.target.value })
                      }
                      placeholder="차량명 / 항목명"
                      required
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`상세 ${idx + 1}`}
                      value={item.details}
                      onChange={(e) =>
                        updateItem(item.id, { details: e.target.value })
                      }
                      placeholder="차대번호, VIN 등"
                    />
                  </td>
                  <td className="ts-col-qty">
                    <input
                      aria-label={`수량 ${idx + 1}`}
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                  </td>
                  <td className="ts-col-amount">
                    <input
                      aria-label={`단가 ${idx + 1}`}
                      type="number"
                      min={0}
                      step={values.currency === "KRW" ? 1 : 0.01}
                      value={item.amount || ""}
                      onChange={(e) =>
                        updateItem(item.id, {
                          amount: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </td>
                  <td className="ts-col-action">
                    <button
                      type="button"
                      className="btn btn-ghost ts-item-remove"
                      onClick={() => removeItem(item.id)}
                      disabled={values.items.length <= 1}
                      aria-label={`품목 ${idx + 1} 삭제`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ts-items-footer">
          <button type="button" className="btn" onClick={addItem}>
            품목 추가
          </button>
          <span className="field-hint" style={{ margin: 0 }}>
            공급가액 {formatStatementMoney(supply, values.currency)} · 부가세
            (10%) {formatStatementMoney(vat, values.currency)} · 합계{" "}
            {formatStatementMoney(grandTotal, values.currency)}
          </span>
        </div>

        <h2 className="ts-section-title">입금 계좌</h2>
        <div className="field">
          <label htmlFor="bank_account_id">계좌 선택</label>
          <select
            id="bank_account_id"
            value={values.bank_account_id ?? ""}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                bank_account_id: e.target.value
                  ? Number(e.target.value)
                  : null,
              }))
            }
            required
          >
            {accounts.length === 0 && (
              <option value="">등록된 계좌 없음</option>
            )}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {bankAccountLabel(a)}
                {a.is_default ? " (기본)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="ts-account-add">
          <div className="field-row-3">
            <div className="field">
              <label htmlFor="new_bank">은행</label>
              <input
                id="new_bank"
                value={accountForm.bank}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, bank: e.target.value }))
                }
                placeholder="농협"
              />
            </div>
            <div className="field">
              <label htmlFor="new_account">계좌번호</label>
              <input
                id="new_account"
                value={accountForm.account_number}
                onChange={(e) =>
                  setAccountForm((f) => ({
                    ...f,
                    account_number: e.target.value,
                  }))
                }
                placeholder="351-1093-4618-73"
              />
            </div>
            <div className="field">
              <label htmlFor="new_holder">예금주</label>
              <input
                id="new_holder"
                value={accountForm.holder}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, holder: e.target.value }))
                }
                placeholder="(주)알비오토"
              />
            </div>
          </div>
          {accountError && <p className="error">{accountError}</p>}
          <button
            type="button"
            className="btn"
            disabled={
              accountBusy ||
              !accountForm.bank.trim() ||
              !accountForm.account_number.trim() ||
              !accountForm.holder.trim()
            }
            onClick={() => void addBankAccount()}
          >
            {accountBusy ? "추가 중…" : "계좌 추가"}
          </button>
        </div>

        <div className="field">
          <label htmlFor="note">하단 안내 문구</label>
          <textarea
            id="note"
            rows={5}
            value={values.note}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
            placeholder="비우면 기본 입고·이동 안내 문구가 표시됩니다."
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving
              ? "저장 중…"
              : mode === "create"
                ? "명세서 저장"
                : "수정 저장"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "미리보기 숨기기" : "미리보기 보기"}
          </button>
        </div>
      </form>

      {showPreview && (
        <div className="ts-preview-wrap" id="statement-print-area">
          <StatementToolbar
            locale={locale}
            onLocaleChange={setLocale}
            targetId={docId}
            fileName={previewStatement.number || "transaction-statement"}
          />
          <StatementDocument
            statement={previewStatement}
            account={selectedAccount}
            locale={locale}
            documentId={docId}
          />
        </div>
      )}
    </div>
  );
}
