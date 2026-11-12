import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";
import { canPay } from "../../auth/paymentPermission";
import { paymentsApi } from "../../services/payments";
import type { PaymentReceipt as Receipt } from "../../services/payments";
import { PaymentReceipt } from "../../components/PaymentReceipt";
import { studentApi } from "../../services/student";
import { studentError } from "../../services/studentError";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  StudentError,
  StudentLoading,
} from "../../components/student/StudentUI";
import {
  paymentAmount,
  readPayment,
  remainingBalance,
} from "../../utils/payment";
import type { PendingPayment } from "../../utils/payment";
import { equivalentBrl, formatCoins } from "../../utils/studentFormat";

async function load(signal: AbortSignal) {
  const [wallet, recipients] = await Promise.all([
    studentApi.wallet(signal),
    paymentsApi.recipients(signal),
  ]);
  return { wallet, recipients };
}
export function SendPaymentPage() {
  const { session } = useAuth();
  const allowed = canPay(session?.user.accessProfiles.map((p) => p.key) ?? []);
  return allowed ? (
    <PaymentForm key={session!.user.id} />
  ) : (
    <p className="catalog-message error" role="alert">
      Somente estudantes sem perfis administrativos podem iniciar pagamentos.
    </p>
  );
}
function PaymentForm() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const key = `ecotroca:student:payment:${userId}`;
  const [pending, setPending] = useState<PendingPayment | null>(() => {
    try {
      return readPayment(sessionStorage.getItem(key));
    } catch {
      return null;
    }
  });
  const [attempted, setAttempted] = useState(Boolean(pending));
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [correctable, setCorrectable] = useState(false);
  const lock = useRef(false);
  const remote = useRemoteData(load);
  const parsed = paymentAmount(amount);
  const displayedAmount = pending?.amount ?? parsed;
  const displayedBalance =
    pending?.balanceBefore ?? remote.data?.wallet.balance;
  const remaining =
    displayedAmount && displayedBalance
      ? remainingBalance(displayedBalance, displayedAmount)
      : null;

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending) return;
    setError("");
    const recipient = remote.data?.recipients.find((r) => r.id === recipientId);
    if (!recipient || !parsed || remaining === null) {
      setError(
        "Selecione uma Xerox e informe um valor positivo com até duas casas decimais, dentro do saldo disponível.",
      );
      return;
    }
    try {
      setPending({
        recipientId: recipient.id,
        recipientName: recipient.name,
        amount: parsed,
        balanceBefore: remote.data!.wallet.balance,
        idempotencyKey: crypto.randomUUID(),
      });
      setAttempted(false);
      setCorrectable(false);
    } catch {
      setError(
        "Não foi possível gerar uma chave segura. Use HTTPS ou localhost em um navegador atualizado.",
      );
    }
  }
  async function confirm() {
    if (!pending || lock.current || receipt) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setCorrectable(false);
    try {
      sessionStorage.setItem(key, JSON.stringify(pending));
    } catch {
      setError(
        "Habilite o armazenamento da sessão para preservar a chave antes de pagar.",
      );
      lock.current = false;
      setBusy(false);
      return;
    }
    setAttempted(true);
    try {
      const result = await paymentsApi.pay({
        recipientId: pending.recipientId,
        amount: pending.amount,
        idempotencyKey: pending.idempotencyKey,
      });
      if (
        result.idempotencyKey !== pending.idempotencyKey ||
        result.student?.id !== userId ||
        result.recipient?.id !== pending.recipientId ||
        result.amount !== pending.amount ||
        result.kind !== "PAYMENT" ||
        result.balanceAfter === undefined
      )
        throw new Error("Comprovante não confirmado.");
      setReceipt(result);
      remote.reload();
    } catch (cause) {
      const status = axios.isAxiosError(cause)
        ? cause.response?.status
        : undefined;
      const message = axios.isAxiosError(cause)
        ? cause.response?.data?.message
        : undefined;
      const definitive =
        status === 400 ||
        status === 404 ||
        (status === 409 &&
          message === "Saldo insuficiente para realizar este pagamento.");
      setCorrectable(definitive);
      setError(
        `${studentError(cause)}${definitive ? "" : " Resultado não confirmado. Reenvie a mesma operação com a mesma chave para evitar outro débito."}`,
      );
      remote.reload();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function reset() {
    if (lock.current || (attempted && !receipt && !correctable)) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      setError("Não foi possível limpar a operação anterior. Tente novamente.");
      return;
    }
    setPending(null);
    setAttempted(false);
    setReceipt(null);
    setError("");
    setCorrectable(false);
    setAmount("");
    setRecipientId("");
    remote.reload();
  }
  return (
    <div className="xerox-page">
      <div>
        <p className="eyebrow">SUA CARTEIRA · PAGAMENTO INTERNO</p>
        <h1 className="text-3xl font-bold text-ink">Enviar EcoCoin</h1>
        <p className="home-intro">
          Escolha a Xerox e confirme o pagamento com seu próprio saldo.
        </p>
      </div>
      {remote.loading && <StudentLoading />}
      {remote.error && (
        <StudentError message={remote.error} retry={remote.reload} />
      )}
      {error && (
        <div className="catalog-message error" role="alert">
          {error}
        </div>
      )}
      {receipt ? (
        <>
          <p className="catalog-message success" role="status">
            Pagamento confirmado. O saldo e o histórico foram atualizados.
          </p>
          <PaymentReceipt receipt={receipt} />
          <div className="form-actions">
            <Link className="secondary-button" to="/student/ecocoins">
              Ver saldo e histórico
            </Link>
            <button type="button" className="primary-button" onClick={reset}>
              Novo pagamento
            </button>
          </div>
        </>
      ) : (
        <section className="catalog-card catalog-form" aria-busy={busy}>
          <h2>{pending ? "Confirme seu pagamento" : "Dados do pagamento"}</h2>
          <form className="xerox-form" onSubmit={prepare}>
            <div className="field-group">
              <label htmlFor="payment-recipient">Destinatário · Xerox</label>
              {pending ? (
                <input
                  id="payment-recipient"
                  value={pending.recipientName}
                  readOnly
                />
              ) : (
                <select
                  id="payment-recipient"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  required
                  disabled={!remote.data || remote.loading}
                >
                  <option value="">Selecione uma Xerox</option>
                  {remote.data?.recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              {remote.data && !remote.data.recipients.length && !pending && (
                <p className="field-help">
                  Nenhuma Xerox ativa está disponível.
                </p>
              )}
            </div>
            <div className="field-group">
              <label htmlFor="payment-amount">Valor em EcoCoins</label>
              <input
                id="payment-amount"
                inputMode="decimal"
                value={pending?.amount ?? amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={Boolean(pending)}
                required
                maxLength={15}
                placeholder="Ex.: 1,25"
                aria-describedby="payment-amount-help"
              />
              <p className="field-help" id="payment-amount-help">
                Valor positivo com até duas casas decimais. 1 EcoCoin = R$ 0,10.
              </p>
            </div>
            <div className="xerox-preview" aria-live="polite">
              <span>Equivalente em reais</span>
              <strong>
                {displayedAmount ? equivalentBrl(displayedAmount, "0.10") : "—"}
              </strong>
              <span>
                Saldo disponível na revisão:{" "}
                {displayedBalance ? formatCoins(displayedBalance) : "—"}{" "}
                EcoCoins
              </span>
              <span>
                Saldo restante estimado:{" "}
                {remaining !== null ? formatCoins(remaining) : "—"} EcoCoins
              </span>
              <small>
                Conversão exata, inclusive frações de centavo. Não há
                transferência de reais ou Pix bancário.
              </small>
            </div>
            {pending && (
              <div className="notice">
                {attempted
                  ? "Operação preservada. Reenvie os mesmos dados para recuperar o resultado sem repetir o débito."
                  : "Confira o destinatário e o valor. Ao confirmar, os EcoCoins serão debitados da sua carteira."}
                <p className="xerox-key">
                  Destinatário: {pending.recipientId}
                  <br />
                  Operação: {pending.idempotencyKey}
                </p>
              </div>
            )}
            <div className="form-actions">
              {pending && (!attempted || correctable) && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={reset}
                >
                  Corrigir dados
                </button>
              )}
              {!pending ? (
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!remote.data || remote.loading}
                >
                  Revisar pagamento
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void confirm()}
                >
                  {busy
                    ? "Confirmando…"
                    : attempted
                      ? "Reenviar mesma operação"
                      : "Confirmar pagamento"}
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
