"use client";

import type { OverseasInvoice } from "@/lib/overseasInvoices";
import {
  DEFAULT_INVOICE_NOTICES,
  DEFAULT_INVOICE_SELLER,
  DEFAULT_STAMP,
  formatInvoiceDate,
  formatInvoiceMoney,
  formatKrw,
  invoiceItemsTotal,
} from "@/lib/overseasInvoices";
import { getCurrencyMeta } from "@/lib/currency";

type Props = {
  invoice: OverseasInvoice;
  documentId?: string;
};

export function OverseasInvoiceDocument({
  invoice,
  documentId = "overseas-invoice-document",
}: Props) {
  const total = invoiceItemsTotal(invoice.items);
  const currencyMeta = getCurrencyMeta(invoice.currency);
  const rem = invoice.remittance;
  const rows = [...invoice.items];
  while (rows.length < 6) {
    rows.push({
      id: `pad-${rows.length}`,
      description: "",
      reg_no: "",
      vin: "",
      quantity: 0,
      price_krw: 0,
      rate: 0,
      final_price: 0,
    });
  }

  return (
    <article
      id={documentId}
      className="oi-doc notranslate"
      translate="no"
      lang="en"
      aria-label="INVOICE"
    >
      <header className="oi-doc-header">
        <div className="oi-doc-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rbauto-logo.png" alt="RBAUTO" />
          <strong>{DEFAULT_INVOICE_SELLER.brand}</strong>
        </div>
        <div className="oi-doc-head-right">
          <h1>INVOICE</h1>
          <p className="oi-doc-company">{DEFAULT_INVOICE_SELLER.company}</p>
          <p className="oi-doc-address">{DEFAULT_INVOICE_SELLER.address}</p>
        </div>
      </header>

      <div className="oi-meta-grid">
        <div>
          <span>Invoice#</span>
          <strong>{invoice.number || "—"}</strong>
        </div>
        <div>
          <span>Invoice Date</span>
          <strong>{formatInvoiceDate(invoice.issued_at)}</strong>
        </div>
        <div>
          <span>Terms</span>
          <strong>{invoice.terms || "—"}</strong>
        </div>
        <div>
          <span>Due Date</span>
          <strong>{formatInvoiceDate(invoice.due_at)}</strong>
        </div>
        <div>
          <span>Company</span>
          <strong>{invoice.company || "\u00A0"}</strong>
        </div>
        <div>
          <span>Consignee</span>
          <strong>{invoice.consignee || "—"}</strong>
        </div>
        <div>
          <span>Business no.</span>
          <strong>{invoice.business_no || "\u00A0"}</strong>
        </div>
        <div>
          <span>Final destination</span>
          <strong>{invoice.final_destination || "—"}</strong>
        </div>
      </div>

      <table className="oi-items">
        <thead>
          <tr>
            <th>Description</th>
            <th>Reg. No.</th>
            <th>VIN</th>
            <th>Qty</th>
            <th>PRICE (₩)</th>
            <th>Rate</th>
            <th>FINAL PRICE({currencyMeta.shortLabel})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const empty = !item.description && !item.price_krw && !item.final_price;
            return (
              <tr key={item.id}>
                <td>{item.description || (empty ? "\u00A0" : "")}</td>
                <td>{item.reg_no || "\u00A0"}</td>
                <td className="oi-vin">{item.vin || "\u00A0"}</td>
                <td className="num">
                  {item.quantity > 0 ? item.quantity : "\u00A0"}
                </td>
                <td className="num">
                  {item.price_krw > 0 ? formatKrw(item.price_krw) : "\u00A0"}
                </td>
                <td className="num">
                  {item.rate > 0
                    ? item.rate.toLocaleString("en-US")
                    : "\u00A0"}
                </td>
                <td className="num">
                  {item.final_price > 0
                    ? formatInvoiceMoney(item.final_price, invoice.currency)
                    : "\u00A0"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="oi-notice">
        <strong>Notice</strong>
        <ol>
          {DEFAULT_INVOICE_NOTICES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>

      <div className="oi-pay-bar">
        <span>{invoice.payment_note || "100% PREPAID"}</span>
        <strong>
          ({currencyMeta.shortLabel}) Amount:{" "}
          {formatInvoiceMoney(total, invoice.currency)}
        </strong>
      </div>

      <div className="oi-footer-grid">
        <div className="oi-remit">
          <h3>REMITTANCE INFORMATION (SOUTH KOREA)</h3>
          <dl>
            <div>
              <dt>Beneficiary Name</dt>
              <dd>{rem.beneficiary_name}</dd>
            </div>
            <div>
              <dt>Beneficiary Account No.</dt>
              <dd>{rem.account_no}</dd>
            </div>
            <div>
              <dt>Beneficiary Address</dt>
              <dd>{rem.beneficiary_address}</dd>
            </div>
            <div>
              <dt>Bank Name</dt>
              <dd>{rem.bank_name}</dd>
            </div>
            <div>
              <dt>Branch Name</dt>
              <dd>{rem.branch_name}</dd>
            </div>
            <div>
              <dt>Swift Code</dt>
              <dd>{rem.swift_code}</dd>
            </div>
            <div>
              <dt>Bank Address</dt>
              <dd>{rem.bank_address}</dd>
            </div>
            <div>
              <dt>Bank Telephone no.</dt>
              <dd>{rem.bank_phone}</dd>
            </div>
          </dl>
        </div>

        <div className="oi-stamp-wrap">
          <p className="oi-total">
            ({currencyMeta.shortLabel}) TOTAL :{" "}
            {formatInvoiceMoney(total, invoice.currency)}
          </p>
          <div className="oi-stamp">
            <p className="oi-stamp-reg">{DEFAULT_STAMP.registration_no}</p>
            <p className="oi-stamp-co">{DEFAULT_STAMP.company}</p>
            <p className="oi-stamp-name">성명 {DEFAULT_STAMP.name}</p>
            <p className="oi-stamp-addr">{DEFAULT_STAMP.address}</p>
            <p className="oi-stamp-biz">{DEFAULT_STAMP.business}</p>
            <div className="oi-stamp-seal" aria-hidden="true">
              인
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
