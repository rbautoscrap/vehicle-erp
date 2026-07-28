"use client";

import type { BankAccount, TransactionStatement } from "@/lib/statements";
import {
  FIXED_SUPPLIER_PHONE,
  bankAccountLabel,
  formatStatementDate,
  formatStatementMoney,
  statementGrandTotal,
  statementSupplyTotal,
  statementVatAmount,
} from "@/lib/statements";
import {
  getStatementLabels,
  type StatementLocale,
} from "@/lib/statementI18n";

type Props = {
  statement: TransactionStatement;
  account: BankAccount | null;
  locale?: StatementLocale;
  documentId?: string;
};

export function StatementDocument({
  statement,
  account,
  locale = "ko",
  documentId = "statement-document",
}: Props) {
  const t = getStatementLabels(locale);
  const currency = statement.currency;
  const supply = statementSupplyTotal(statement.items);
  const vat = statementVatAmount(statement.items, currency);
  const total = statementGrandTotal(statement.items, currency);

  return (
    <article
      id={documentId}
      className="ts-doc notranslate"
      translate="no"
      aria-label={t.title}
      lang={locale === "en" ? "en" : "ko"}
    >
      <header className="ts-doc-header">
        <div className="ts-doc-brand">
          <strong>{statement.supplier.name || "RBAUTO Co., Ltd."}</strong>
          <span>{statement.supplier.company || "주식회사 알비오토"}</span>
        </div>
        <div className="ts-doc-title">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>

      <div className="ts-doc-meta">
        <div>
          <span>{t.number}</span>
          <strong>{statement.number}</strong>
        </div>
        <div>
          <span>{t.issuedAt}</span>
          <strong>{formatStatementDate(statement.issued_at)}</strong>
        </div>
      </div>

      <div className="ts-doc-parties">
        <section>
          <h2>{t.supplier}</h2>
          <dl>
            <div>
              <dt>{t.businessName}</dt>
              <dd>
                {statement.supplier.company ||
                  statement.supplier.name ||
                  "—"}
              </dd>
            </div>
            <div>
              <dt>{t.representativePhone}</dt>
              <dd>{FIXED_SUPPLIER_PHONE}</dd>
            </div>
            {statement.supplier.contact_person && (
              <div>
                <dt>{t.contactPerson}</dt>
                <dd>{statement.supplier.contact_person}</dd>
              </div>
            )}
            {statement.supplier.contact_phone && (
              <div>
                <dt>{t.managerContact}</dt>
                <dd>{statement.supplier.contact_phone}</dd>
              </div>
            )}
            {statement.supplier.address && (
              <div>
                <dt>{t.address}</dt>
                <dd>{statement.supplier.address}</dd>
              </div>
            )}
          </dl>
        </section>
        <section>
          <h2>{t.recipient}</h2>
          <dl>
            <div>
              <dt>{t.tradeName}</dt>
              <dd className="notranslate" translate="no">
                {statement.recipient.company || "—"}
              </dd>
            </div>
            {statement.recipient.name && (
              <div>
                <dt>{t.name}</dt>
                <dd className="notranslate" translate="no">
                  {statement.recipient.name}
                </dd>
              </div>
            )}
            {statement.recipient.contact_person && (
              <div>
                <dt>{t.managerName}</dt>
                <dd>{statement.recipient.contact_person}</dd>
              </div>
            )}
            {statement.recipient.contact_phone && (
              <div>
                <dt>{t.contact}</dt>
                <dd>{statement.recipient.contact_phone}</dd>
              </div>
            )}
            {statement.recipient.address && (
              <div>
                <dt>{t.address}</dt>
                <dd>{statement.recipient.address}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <table className="ts-doc-table">
        <thead>
          <tr>
            <th>{t.item}</th>
            <th>{t.details}</th>
            <th className="ts-num">{t.quantity}</th>
            <th className="ts-num">{t.supplyAmount}</th>
          </tr>
        </thead>
        <tbody>
          {statement.items.map((item) => (
            <tr key={item.id}>
              <td className="notranslate" translate="no">
                {item.name}
              </td>
              <td className="ts-muted notranslate" translate="no">
                {item.details || "—"}
              </td>
              <td className="ts-num">{item.quantity}</td>
              <td className="ts-num">
                {formatStatementMoney(item.amount * item.quantity, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ts-doc-totals">
        <div>
          <span>{t.supplyTotal}</span>
          <strong>{formatStatementMoney(supply, currency)}</strong>
        </div>
        <div>
          <span>{t.vat}</span>
          <strong>{formatStatementMoney(vat, currency)}</strong>
        </div>
        <div className="ts-doc-total-sum">
          <span>
            {t.grandTotal} ({currency})
          </span>
          <strong>{formatStatementMoney(total, currency)}</strong>
        </div>
      </div>

      <section className="ts-doc-bank">
        <h2>{t.bankAccount}</h2>
        {account ? (
          <dl>
            <div>
              <dt>{t.bank}</dt>
              <dd>{account.bank}</dd>
            </div>
            <div>
              <dt>{t.accountNumber}</dt>
              <dd>{account.account_number}</dd>
            </div>
            <div>
              <dt>{t.holder}</dt>
              <dd>{account.holder}</dd>
            </div>
          </dl>
        ) : (
          <p className="ts-muted">{t.noAccount}</p>
        )}
        {account && (
          <p className="ts-doc-bank-line">{bankAccountLabel(account)}</p>
        )}
      </section>
    </article>
  );
}
