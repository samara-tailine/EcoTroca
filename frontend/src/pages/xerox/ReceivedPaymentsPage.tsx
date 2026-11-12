import { useCallback, useState } from "react";
import { Link } from "react-router";
import { paymentsApi } from "../../services/payments";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  Pagination,
  StudentError,
  StudentLoading,
} from "../../components/student/StudentUI";
import { formatCoins, formatDate } from "../../utils/studentFormat";
import { formatPaymentBrl } from "../../utils/payment";
export function ReceivedPaymentsPage() {
  const [page, setPage] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) => paymentsApi.list(page, signal),
    [page],
  );
  const remote = useRemoteData(load);
  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">XEROX · RECEBIMENTOS</p>
          <h1>Pagamentos recebidos</h1>
          <p>
            Pagamentos enviados pelos estudantes e comprovantes de resgates
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
        <section className="catalog-card">
          <div
            className="table-scroll"
            role="region"
            aria-label="Pagamentos recebidos pela sua Xerox"
            tabIndex={0}
          >
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Estudante</th>
                  <th>EcoCoins</th>
                  <th>Equivalente em reais</th>
                  <th>Operação</th>
                  <th>Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {remote.data.data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {formatDate(p.createdAt)}
                      <span className="record-description">
                        {p.kind === "PAYMENT"
                          ? "Pagamento"
                          : "Resgate anterior"}
                      </span>
                    </td>
                    <td>
                      {p.student.name}
                      <span className="record-description">{p.student.id}</span>
                    </td>
                    <td>{formatCoins(p.amount)}</td>
                    <td>{formatPaymentBrl(p.valueBrl)}</td>
                    <td className="xerox-key">{p.id}</td>
                    <td>
                      <Link
                        className="text-action"
                        to={`/xerox/payments/${p.id}`}
                      >
                        Consultar comprovante
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!remote.data.total && (
            <p className="catalog-empty">
              Nenhum pagamento recebido nesta conta.
            </p>
          )}
          <Pagination
            page={page}
            pageSize={10}
            total={remote.data.total}
            onChange={setPage}
          />
        </section>
      )}
      <p className="catalog-help">
        Esta área permite somente consultar recebimentos. A Xerox não possui
        carteira nem saldo acumulado.
      </p>
    </div>
  );
}
