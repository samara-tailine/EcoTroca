import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { libraryApi } from "../../services/library";
import { STATUS_LABELS } from "../../services/student.types";
import type { DisposalStatus } from "../../services/student.types";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  DisposalBadge,
  Pagination,
  StudentError as DataError,
  StudentLoading as DataLoading,
} from "../../components/student/StudentUI";
import { formatDate, formatGrams } from "../../utils/studentFormat";

export function LibraryQueuePage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DisposalStatus | "">("");
  const load = useCallback(
    (signal: AbortSignal) => libraryApi.queue(page, status, signal),
    [page, status],
  );
  const remote = useRemoteData(load);
  useEffect(() => {
    if (remote.data) {
      const last = Math.max(1, Math.ceil(remote.data.total / 10));
      if (page > last) setPage(last);
    }
  }, [remote.data, page]);
  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">RECEBER, CONFERIR E TRANSFORMAR</p>
          <h1>Fila de descartes</h1>
          <p>
            Acompanhe as solicitações dos estudantes e processe cada etapa com
            cuidado.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={remote.loading}
          onClick={remote.reload}
        >
          Atualizar fila
        </button>
      </div>
      <section className="catalog-card">
        <div className="catalog-toolbar">
          <div className="field-group grow">
            <label htmlFor="library-status">Filtrar por status</label>
            <select
              id="library-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as DisposalStatus | "");
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <span className="field-help">
            Pesos e declarações são apresentados conforme o histórico.
          </span>
        </div>
        {remote.loading && <DataLoading />}
        {remote.error && (
          <div className="p-5">
            <DataError message={remote.error} retry={remote.reload} />
          </div>
        )}
        {remote.data && (
          <>
            {remote.data.data.length ? (
              <div
                className="table-scroll"
                role="region"
                aria-label="Fila de solicitações da Biblioteca"
                tabIndex={0}
              >
                <table className="catalog-table">
                  <caption className="sr-only">
                    Solicitações de descarte, estudantes e status para
                    processamento
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Solicitação</th>
                      <th scope="col">Estudante</th>
                      <th scope="col">Enviada em</th>
                      <th scope="col">Peso histórico</th>
                      <th scope="col">Status</th>
                      <th scope="col">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remote.data.data.map((request) => (
                      <tr key={request.id}>
                        <td className="record-name">
                          #{request.id.slice(0, 8).toUpperCase()}
                          <span className="record-description">
                            {request.items.length} tipo(s) de equipamento
                          </span>
                        </td>
                        <td>
                          {request.requester.name}
                          <span className="record-description">
                            {request.requester.studentIdentifier ||
                              request.requester.email}
                          </span>
                        </td>
                        <td>{formatDate(request.requestedAt)}</td>
                        <td className="weight-cell">
                          {formatGrams(request.totalWeightGramsSnapshot)}
                        </td>
                        <td>
                          <DisposalBadge
                            status={request.status}
                            label={request.statusLabel}
                          />
                        </td>
                        <td>
                          <Link
                            className="text-action"
                            to={`/library/disposals/${request.id}`}
                            aria-label={`Abrir solicitação ${request.id.slice(0, 8)}`}
                          >
                            Abrir →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="catalog-empty">
                {status
                  ? "Nenhuma solicitação corresponde ao status selecionado."
                  : "Não há solicitações de descarte registradas."}
              </p>
            )}
            <Pagination
              page={page}
              pageSize={10}
              total={remote.data.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
