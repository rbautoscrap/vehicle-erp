"use client";

import type { BankAccount, TransactionStatement } from "@/lib/statements";
import {
  bankAccountLabel,
  formatStatementDate,
  formatStatementMoney,
  statementSupplyTotal,
} from "@/lib/statements";

type Props = {
  statement: TransactionStatement;
  account: BankAccount | null;
};

export function StatementDocument({ statement, account }: Props) {
  const supply = statementSupplyTotal(statement.items);
  const vat = 0;
  const total = supply + vat;
  const currency = statement.currency;

  return (
    <article className="ts-doc" aria-label="거래명세서">
      <header className="ts-doc-header">
        <div className="ts-doc-brand">
          <strong>{statement.supplier.name || "KOREA AUTO TRADE"}</strong>
          <span>{statement.supplier.company || "주식회사 알비오토"}</span>
        </div>
        <div className="ts-doc-title">
          <h1>거래명세서</h1>
          <p>TRANSACTION STATEMENT</p>
        </div>
      </header>

      <div className="ts-doc-meta">
        <div>
          <span>명세서 번호</span>
          <strong>{statement.number}</strong>
        </div>
        <div>
          <span>발행일</span>
          <strong>{formatStatementDate(statement.issued_at)}</strong>
        </div>
      </div>

      <div className="ts-doc-parties">
        <section>
          <h2>공급자</h2>
          <dl>
            <div>
              <dt>상호</dt>
              <dd>
                {statement.supplier.name}
                {statement.supplier.company
                  ? ` / ${statement.supplier.company}`
                  : ""}
              </dd>
            </div>
            {(statement.supplier.phone || statement.supplier.whatsapp) && (
              <div>
                <dt>연락처</dt>
                <dd>
                  {statement.supplier.phone && (
                    <span>Tel / KakaoTalk {statement.supplier.phone}</span>
                  )}
                  {statement.supplier.whatsapp && (
                    <span>WhatsApp {statement.supplier.whatsapp}</span>
                  )}
                </dd>
              </div>
            )}
            {statement.supplier.address && (
              <div>
                <dt>주소</dt>
                <dd>{statement.supplier.address}</dd>
              </div>
            )}
          </dl>
        </section>
        <section>
          <h2>공급받는자</h2>
          <dl>
            <div>
              <dt>성명</dt>
              <dd>{statement.recipient.name || "—"}</dd>
            </div>
            {statement.recipient.company && (
              <div>
                <dt>상호</dt>
                <dd>{statement.recipient.company}</dd>
              </div>
            )}
            {statement.recipient.address && (
              <div>
                <dt>주소</dt>
                <dd>{statement.recipient.address}</dd>
              </div>
            )}
            {(statement.recipient.phone || statement.recipient.whatsapp) && (
              <div>
                <dt>연락처</dt>
                <dd>
                  {[statement.recipient.phone, statement.recipient.whatsapp]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <table className="ts-doc-table">
        <thead>
          <tr>
            <th>품목</th>
            <th>상세</th>
            <th className="ts-num">수량</th>
            <th className="ts-num">공급가액</th>
          </tr>
        </thead>
        <tbody>
          {statement.items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="ts-muted">{item.details || "—"}</td>
              <td className="ts-num">{item.quantity}</td>
              <td className="ts-num">
                {formatStatementMoney(
                  item.amount * item.quantity,
                  currency
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ts-doc-totals">
        <div>
          <span>공급가액</span>
          <strong>{formatStatementMoney(supply, currency)}</strong>
        </div>
        <div>
          <span>부가세 (영세율)</span>
          <strong>{formatStatementMoney(vat, currency)}</strong>
        </div>
        <div className="ts-doc-total-sum">
          <span>합계 ({currency})</span>
          <strong>{formatStatementMoney(total, currency)}</strong>
        </div>
      </div>

      <section className="ts-doc-bank">
        <h2>입금 계좌</h2>
        {account ? (
          <dl>
            <div>
              <dt>은행</dt>
              <dd>{account.bank}</dd>
            </div>
            <div>
              <dt>계좌번호</dt>
              <dd>{account.account_number}</dd>
            </div>
            <div>
              <dt>예금주</dt>
              <dd>{account.holder}</dd>
            </div>
          </dl>
        ) : (
          <p className="ts-muted">선택된 입금 계좌가 없습니다.</p>
        )}
        {account && (
          <p className="ts-doc-bank-line">{bankAccountLabel(account)}</p>
        )}
      </section>

      <footer className="ts-doc-footer">
        {statement.note ||
          "본 명세서는 영세율(부가세 0%) 거래로 작성되었습니다. 상기 내용이 정확함을 확인합니다."}
      </footer>
    </article>
  );
}
