import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useRemoteData } from "../../hooks/useRemoteData";
import { studentApi } from "../../services/student";
import { STATUS_LABELS } from "../../services/student.types";
import type { DisposalStatus } from "../../services/student.types";
import {
  DisposalTable,
  Pagination,
  StudentError,
  StudentLoading,
} from "../../components/student/StudentUI";

export function DisposalsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DisposalStatus | "">("");
  const load = useCallback(
    (signal: AbortSignal) =>
      studentApi.disposals(
        { page, pageSize: 10, ...(status ? { status } : {}) },
        signal,
      ),
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
          <p className="eyebrow">ACOMPANHE CADA ETAPA</p>
          <h1>Meus descartes</h1>
          <p>
            Consulte suas solicitações, os status e os registros de conferência.
          </p>
        </div>
        <Link to="/student/disposals/new" className="primary-button">
          ＋ Nova solicitação
        </Link>
      </div>
      <section className="catalog-card">
        <div className="catalog-toolbar">
          <div className="field-group grow">
            <label htmlFor="student-disposal-status">Filtrar por status</label>
            <select
              id="student-disposal-status"
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
          <button
            type="button"
            className="secondary-button"
            disabled={remote.loading}
            onClick={remote.reload}
          >
            Atualizar
          </button>
        </div>
        {remote.loading && <StudentLoading />}
        {remote.error && (
          <div className="p-5">
            <StudentError message={remote.error} retry={remote.reload} />
          </div>
        )}
        {remote.data && (
          <>
            {remote.data.data.length ? (
              <DisposalTable items={remote.data.data} />
            ) : (
              <p className="catalog-empty">
                {status
                  ? "Você não tem solicitações com este status."
                  : "Você ainda não enviou solicitações de descarte."}
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
