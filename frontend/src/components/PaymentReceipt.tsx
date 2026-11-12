import type { PaymentReceipt as Receipt } from "../services/payments";
import { formatCoins, formatDate } from "../utils/studentFormat";
import { formatPaymentBrl } from "../utils/payment";
export function PaymentReceipt({ receipt }: { receipt: Receipt }) {
  return (
    <section
      className="catalog-card catalog-form"
      aria-labelledby="payment-receipt-title"
    >
      <h2 id="payment-receipt-title">
        {receipt.kind === "PAYMENT"
          ? "Comprovante de pagamento"
          : "Comprovante de resgate anterior"}
      </h2>
      <dl className="student-data-grid">
        <div>
          <dt>Estudante</dt>
          <dd>
            {receipt.student.name}
            <br />
            {receipt.student.id}
          </dd>
        </div>
        <div>
          <dt>Destinatário · Xerox</dt>
          <dd>
            {receipt.recipient?.name ?? "Operador anterior não disponível"}
          </dd>
        </div>
        <div>
          <dt>Valor em EcoCoins</dt>
          <dd>{formatCoins(receipt.amount)}</dd>
        </div>
        <div>
          <dt>Equivalente em reais</dt>
          <dd>{formatPaymentBrl(receipt.valueBrl)}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{formatDate(receipt.createdAt)}</dd>
        </div>
        {receipt.balanceAfter !== undefined && (
          <div>
            <dt>Saldo após a operação</dt>
            <dd>{formatCoins(receipt.balanceAfter)} EcoCoins</dd>
          </div>
        )}
        <div>
          <dt>Identificação da operação</dt>
          <dd>{receipt.id}</dd>
        </div>
        <div>
          <dt>Chave de idempotência</dt>
          <dd>{receipt.idempotencyKey}</dd>
        </div>
      </dl>
    </section>
  );
}
