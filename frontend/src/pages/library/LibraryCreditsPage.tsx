import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { libraryApi } from "../../services/library";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  Pagination,
  StudentError as DataError,
  StudentLoading as DataLoading,
} from "../../components/student/StudentUI";
import {
  formatCoins,
  formatDate,
  formatGrams,
} from "../../utils/studentFormat";

export function LibraryCreditsPage() {
  const [params, setParams] = useSearchParams();
  const requestId = params.get("disposalRequestId") ?? "";
  const [page, setPage] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) => libraryApi.credits(page, requestId, signal),
    [page, requestId],
  );
  const remote = useRemoteData(load);
  useEffect(() => {
    setPage(1);
  }, [requestId]);
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
          <p className="eyebrow">CRÉDITOS COM ORIGEM E RESPONSÁVEL</p>
          <h1>Créditos de EcoCoins</h1>
          <p>
            Descartes que você recebeu, conferiu ou aprovou, conforme o acesso
            permitido pelo sistema.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={remote.loading}
          onClick={remote.reload}
        >
          Atualizar créditos
        </button>
      </div>
      {requestId && (
        <div className="notice library-credit-filter">
          <span>
            Filtrando pela solicitação #{requestId.slice(0, 8).toUpperCase()}
          </span>
          <button
            type="button"
            className="text-action"
            onClick={() => {
              setPage(1);
              setParams({});
            }}
          >
            Mostrar todos os meus registros
          </button>
        </div>
      )}
      {remote.loading && <DataLoading />}
      {remote.error && (
        <DataError message={remote.error} retry={remote.reload} />
      )}
      {remote.data && (
        <section className="catalog-card">
          <div className="student-section-heading">
            <h2>Histórico de créditos concedidos</h2>
            <span className="field-help">Valores registrados no backend</span>
          </div>
          {remote.data.data.length ? (
            <div
              className="table-scroll"
              role="region"
              aria-label="Créditos de descartes processados pela Biblioteca"
              tabIndex={0}
            >
              <table className="catalog-table">
                <caption className="sr-only">
                  Créditos de descartes processados pelo seu usuário, com
                  estudante e responsável
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Descarte</th>
                    <th scope="col">Estudante</th>
                    <th scope="col">Peso histórico</th>
                    <th scope="col">EcoCoins</th>
                    <th scope="col">Creditado em</th>
                    <th scope="col">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {remote.data.data.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        {movement.origin.disposalRequestId ? (
                          <Link
                            className="text-action"
                            to={`/library/disposals/${movement.origin.disposalRequestId}`}
                          >
                            #
                            {movement.origin.disposalRequestId
                              .slice(0, 8)
                              .toUpperCase()}
                          </Link>
                        ) : (
                          "Origem não informada"
                        )}
                        <span className="record-description">
                          {movement.description || movement.origin.label}
                        </span>
                      </td>
                      <td>{movement.student?.name || "Não informado"}</td>
                      <td className="weight-cell">
                        {formatGrams(movement.origin.weightGrams)}
                      </td>
                      <td className="movement-amount credit">
                        + {formatCoins(movement.amount)}
                      </td>
                      <td>{formatDate(movement.createdAt)}</td>
                      <td>{movement.responsible?.name || "Não informado"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="catalog-empty">
              {requestId
                ? "Não há créditos deste descarte visíveis para seu usuário."
                : "Você ainda não possui créditos vinculados a descartes que processou."}
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
        Os créditos são concedidos automaticamente na aprovação. Esta tela não
        concede créditos manuais nem exibe o saldo total dos estudantes.
      </p>
    </div>
  );
}
