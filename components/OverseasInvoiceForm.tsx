"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  OverseasInvoice,
  OverseasInvoiceCurrency,
  OverseasInvoiceItem,
  OverseasRemittance,
} from "@/lib/overseasInvoices";
import {
  DEFAULT_REMITTANCE,
  addDaysIso,
  calcFinalPrice,
  dateInputToIso,
  formatInvoiceMoney,
  invoiceItemsTotal,
  newOverseasInvoiceItem,
  parseTermsDays,
  toDateInputValue,
} from "@/lib/overseasInvoices";
import { OverseasInvoiceDocument } from "@/components/OverseasInvoiceDocument";
import { OverseasInvoiceToolbar } from "@/components/OverseasInvoiceToolbar";

export type OverseasInvoiceFormValues = {
  issued_at: string;
  due_at: string;
  terms: string;
  currency: OverseasInvoiceCurrency;
  company: string;
  consignee: string;
  business_no: string;
  final_destination: string;
  items: OverseasInvoiceItem[];
  remittance: OverseasRemittance;
  payment_note: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: OverseasInvoice | null;
  saving?: boolean;
  error?: string;
  onSubmit: (values: OverseasInvoiceFormValues) => void | Promise<void>;
};

function defaultValues(
  initial?: OverseasInvoice | null
): OverseasInvoiceFormValues {
  if (initial) {
    return {
      issued_at: toDateInputValue(initial.issued_at),
      due_at: toDateInputValue(initial.due_at),
      terms: initial.terms || "3days",
      currency: initial.currency || "EUR",
      company: initial.company || "",
      consignee: initial.consignee || "",
      business_no: initial.business_no || "",
      final_destination: initial.final_destination || "",
      items:
        initial.items.length > 0
          ? initial.items.map((i) => ({ ...i }))
          : [newOverseasInvoiceItem(0)],
      remittance: { ...initial.remittance },
      payment_note: initial.payment_note || "100% PREPAID",
    };
  }
  const issued = toDateInputValue(new Date().toISOString());
  const issuedIso = dateInputToIso(issued);
  return {
    issued_at: issued,
    due_at: toDateInputValue(addDaysIso(issuedIso, 3)),
    terms: "3days",
    currency: "EUR",
    company: "",
    consignee: "",
    business_no: "",
    final_destination: "",
    items: [newOverseasInvoiceItem(0)],
    remittance: { ...DEFAULT_REMITTANCE },
    payment_note: "100% PREPAID",
  };
}

export function OverseasInvoiceForm({
  mode,
  initial,
  saving,
  error,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(() => defaultValues(initial));
  const [showPreview, setShowPreview] = useState(true);

  const previewInvoice: OverseasInvoice = useMemo(
    () => ({
      id: initial?.id || 0,
      number: initial?.number || "PREVIEW",
      issued_at: dateInputToIso(values.issued_at),
      due_at: dateInputToIso(values.due_at),
      terms: values.terms,
      currency: values.currency,
      company: values.company,
      consignee: values.consignee,
      business_no: values.business_no,
      final_destination: values.final_destination,
      items: values.items,
      remittance: values.remittance,
      payment_note: values.payment_note,
      created_at: initial?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    [values, initial]
  );

  const total = invoiceItemsTotal(values.items);

  function updateItem(
    index: number,
    patch: Partial<OverseasInvoiceItem>,
    recalc = false
  ) {
    setValues((v) => {
      const items = v.items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (recalc) {
          next.final_price = calcFinalPrice(next.price_krw, next.rate);
        }
        return next;
      });
      return { ...v, items };
    });
  }

  function onIssuedOrTermsChange(patch: Partial<OverseasInvoiceFormValues>) {
    setValues((v) => {
      const next = { ...v, ...patch };
      const days = parseTermsDays(next.terms);
      if (patch.issued_at != null || patch.terms != null) {
        next.due_at = toDateInputValue(
          addDaysIso(dateInputToIso(next.issued_at), days)
        );
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  return (
    <div className="ts-layout">
      <form className="card stack ts-form" onSubmit={handleSubmit}>
        <div className="ts-form-top">
          <h2>{mode === "create" ? "해외 인보이스 작성" : "해외 인보이스 수정"}</h2>
          {initial?.number ? (
            <p className="field-hint">Invoice#: {initial.number}</p>
          ) : null}
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="form-grid">
          <label>
            Invoice Date
            <input
              type="date"
              required
              value={values.issued_at}
              onChange={(e) =>
                onIssuedOrTermsChange({ issued_at: e.target.value })
              }
            />
          </label>
          <label>
            Terms
            <input
              value={values.terms}
              onChange={(e) => onIssuedOrTermsChange({ terms: e.target.value })}
              placeholder="3days"
            />
          </label>
          <label>
            Due Date
            <input
              type="date"
              required
              value={values.due_at}
              onChange={(e) =>
                setValues((v) => ({ ...v, due_at: e.target.value }))
              }
            />
          </label>
          <label>
            Currency
            <select
              value={values.currency}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  currency: e.target.value as OverseasInvoiceCurrency,
                }))
              }
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            Company
            <input
              value={values.company}
              onChange={(e) =>
                setValues((v) => ({ ...v, company: e.target.value }))
              }
            />
          </label>
          <label>
            Consignee
            <input
              required
              value={values.consignee}
              onChange={(e) =>
                setValues((v) => ({ ...v, consignee: e.target.value }))
              }
            />
          </label>
          <label>
            Business no.
            <input
              value={values.business_no}
              onChange={(e) =>
                setValues((v) => ({ ...v, business_no: e.target.value }))
              }
            />
          </label>
          <label>
            Final destination
            <input
              value={values.final_destination}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  final_destination: e.target.value,
                }))
              }
            />
          </label>
          <label>
            Payment
            <input
              value={values.payment_note}
              onChange={(e) =>
                setValues((v) => ({ ...v, payment_note: e.target.value }))
              }
            />
          </label>
        </div>

        <div className="ts-items-head">
          <h3>Items</h3>
          <button
            type="button"
            className="btn"
            onClick={() =>
              setValues((v) => ({
                ...v,
                items: [...v.items, newOverseasInvoiceItem(v.items.length)],
              }))
            }
          >
            품목 추가
          </button>
        </div>

        <div className="oi-item-editor stack">
          {values.items.map((item, index) => (
            <div key={item.id} className="oi-item-row card">
              <label>
                Description
                <input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, { description: e.target.value })
                  }
                  placeholder="2015 Volkswagen Golf …"
                />
              </label>
              <div className="form-grid">
                <label>
                  Reg. No.
                  <input
                    value={item.reg_no}
                    onChange={(e) =>
                      updateItem(index, { reg_no: e.target.value })
                    }
                  />
                </label>
                <label>
                  VIN
                  <input
                    value={item.vin}
                    onChange={(e) => updateItem(index, { vin: e.target.value })}
                  />
                </label>
                <label>
                  Qty
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, {
                        quantity: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label>
                  PRICE (₩)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={item.price_krw || ""}
                    onChange={(e) =>
                      updateItem(
                        index,
                        { price_krw: Number(e.target.value) || 0 },
                        true
                      )
                    }
                  />
                </label>
                <label>
                  Rate
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={item.rate || ""}
                    onChange={(e) =>
                      updateItem(
                        index,
                        { rate: Number(e.target.value) || 0 },
                        true
                      )
                    }
                  />
                </label>
                <label>
                  FINAL PRICE
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.final_price || ""}
                    onChange={(e) =>
                      updateItem(index, {
                        final_price: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
              </div>
              {values.items.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() =>
                    setValues((v) => ({
                      ...v,
                      items: v.items.filter((_, i) => i !== index),
                    }))
                  }
                >
                  삭제
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <p className="field-hint">
          Total: {formatInvoiceMoney(total, values.currency)}
        </p>

        <details className="oi-remit-edit">
          <summary>Remittance information (edit)</summary>
          <div className="form-grid" style={{ marginTop: 12 }}>
            {(
              [
                ["beneficiary_name", "Beneficiary Name"],
                ["account_no", "Account No."],
                ["beneficiary_address", "Beneficiary Address"],
                ["bank_name", "Bank Name"],
                ["branch_name", "Branch Name"],
                ["swift_code", "Swift Code"],
                ["bank_address", "Bank Address"],
                ["bank_phone", "Bank Telephone"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className={key.includes("address") ? "full" : ""}>
                {label}
                <input
                  value={values.remittance[key]}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      remittance: {
                        ...v.remittance,
                        [key]: e.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </details>

        <div className="row-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "저장 중…" : mode === "create" ? "저장" : "수정 저장"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setShowPreview((s) => !s)}
          >
            {showPreview ? "미리보기 숨기기" : "미리보기"}
          </button>
        </div>
      </form>

      {showPreview ? (
        <div className="ts-preview-wrap" id="overseas-invoice-print-area">
          <OverseasInvoiceToolbar
            targetId="overseas-invoice-document"
            fileName={initial?.number || "invoice-preview"}
          />
          <OverseasInvoiceDocument invoice={previewInvoice} />
        </div>
      ) : null}
    </div>
  );
}
