import { formatPaymentBrl } from "../../utils/payment";
import { canPay } from "../../auth/paymentPermission";
import { useAuth } from "../../auth/AuthContext";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { studentApi } from "../../services/student";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  Pagination,
  StudentError,
  StudentLoading,
} from "../../components/student/StudentUI";
import {
  equivalentBrl,
  formatBrl,
  formatCoins,
  formatDate,
} from "../../utils/studentFormat";

export function EcoCoinsPage() {
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [wallet, movements] = await Promise.all([
        studentApi.wallet(signal),
        studentApi.movements(page, signal),
      ]);
      return { wallet, movements };
    },
    [page],
  );
  const remote = useRemoteData(load);
  useEffect(() => {
    if (remote.data) {
      const last = Math.max(1, Math.ceil(remote.data.movements.total / 10));
      if (page > last) setPage(last);
    }
  }, [remote.data, page]);
  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">SUAS ESCOLHAS TÊM VALOR</p>
          <h1>Meus EcoCoins</h1>
          <p>
            Seu saldo e o histórico de créditos, pagamentos e resgates
            anteriores.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={remote.reload}
          disabled={remote.loading}
        >
          Atualizar
        </button>
      </div>
      {remote.loading && <StudentLoading />}
      {remote.error && (
        <StudentError message={remote.error} retry={remote.reload} />
      )}
      {remote.data && (
        <>
          <div className="student-wallet-grid">
            <section className="student-metric metric-balance">
              <p>Saldo disponível</p>
              <strong>
                {formatCoins(remote.data.wallet.balance)}{" "}
                <small>EcoCoins</small>
              </strong>
              <span>
                Atualizado em {formatDate(remote.data.wallet.updatedAt)}
              </span>
            </section>
            <section className="student-metric">
              <p>Equivalente em reais</p>
              <strong>
                {equivalentBrl(
                  remote.data.wallet.balance,
                  remote.data.wallet.coinValueBrl,
                )}
              </strong>

              <span>
                1 EcoCoin = {formatBrl(remote.data.wallet.coinValueBrl)}
              </span>
            </section>
          </div>
          <div className="student-info-strip">
            <span aria-hidden="true">↻</span>
            <p>
              Os créditos entram após aprovação da Biblioteca. Você pode enviar
              EcoCoins a uma Xerox ativa, com até duas casas decimais, após
              revisar e confirmar o pagamento.
            </p>
          </div>
          {canPay(session?.user.accessProfiles.map((p) => p.key) ?? []) && (
            <Link
              className="primary-button w-fit px-6"
              to="/student/payments/new"
            >
              Enviar EcoCoin
            </Link>
          )}
          <section className="catalog-card">
            <div className="student-section-heading">
              <h2>Histórico de movimentações</h2>
              <span className="field-help">
                Créditos, pagamentos e resgates anteriores da sua carteira
              </span>
            </div>
            {remote.data.movements.data.length ? (
              <div
                className="table-scroll"
                role="region"
                aria-label="Suas movimentações de EcoCoins"
                tabIndex={0}
              >
                <table className="catalog-table">
                  <caption className="sr-only">
                    Créditos, pagamentos e resgates anteriores de EcoCoins,
                    responsáveis e saldos históricos
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Data e tipo</th>
                      <th scope="col">Origem</th>
                      <th scope="col">EcoCoins</th>
                      <th scope="col">Desconto utilizado</th>
                      <th scope="col">Saldo após</th>
                      <th scope="col">Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remote.data.movements.data.map((movement) => (
                      <tr key={movement.id}>
                        <td>
                          <span
                            className={`movement-kind ${movement.type === "CREDIT" ? "credit" : "debit"}`}
                          >
                            {movement.typeLabel ||
                              (movement.type === "CREDIT"
                                ? "Crédito"
                                : "Débito")}
                          </span>
                          <span className="record-description">
                            {formatDate(movement.createdAt)}
                          </span>
                        </td>
                        <td>
                          {movement.origin.label}
                          <span className="record-description">
                            {movement.origin.disposalRequestId ? (
                              <Link
                                className="text-action"
                                to={`/student/disposals/${movement.origin.disposalRequestId}`}
                              >
                                Descarte #
                                {movement.origin.disposalRequestId
                                  .slice(0, 8)
                                  .toUpperCase()}
                              </Link>
                            ) : movement.payment || movement.redemption ? (
                              <Link
                                className="text-action"
                                to={
                                  "/student/payments/" +
                                  (movement.payment?.id ?? movement.id)
                                }
                              >
                                Consultar comprovante
                              </Link>
                            ) : (
                              "Movimentação anterior"
                            )}
                          </span>
                          {movement.description && (
                            <span className="record-description">
                              {movement.description}
                            </span>
                          )}
                        </td>
                        <td
                          className={`movement-amount ${movement.type === "CREDIT" ? "credit" : "debit"}`}
                        >
                          {movement.type === "CREDIT" ? "+" : "−"}{" "}
                          {formatCoins(movement.amount)}
                        </td>
                        <td>
                          {movement.payment
                            ? formatPaymentBrl(movement.payment.valueBrl)
                            : movement.redemption
                              ? formatBrl(movement.redemption.valueBrl)
                              : "—"}
                        </td>
                        <td className="weight-cell">
                          {formatCoins(movement.balanceAfter)}
                        </td>
                        <td>{movement.responsible?.name || "Não informado"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="catalog-empty">
                Você ainda não tem movimentações registradas.
              </p>
            )}
            <Pagination
              page={page}
              pageSize={10}
              total={remote.data.movements.total}
              onChange={setPage}
            />
          </section>
          <p className="catalog-help">
            Os valores vêm da sua carteira e do histórico registrado pelo
            sistema. Frações menores que um centavo podem aparecer no
            equivalente exato em reais; elas não são arredondadas nem retiradas
            do seu saldo.
          </p>
        </>
      )}
    </div>
  );
}
