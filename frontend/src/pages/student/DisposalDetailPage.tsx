import { useCallback } from "react";
import { Link, useLocation, useParams } from "react-router";
import { studentApi } from "../../services/student";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  DisposalBadge,
  StudentError,
  StudentLoading,
} from "../../components/student/StudentUI";
import {
  DisposalItems,
  DisposalReview,
  DisposalTimeline,
} from "../../components/disposals/DisposalReadOnly";
import { formatDate, formatGrams } from "../../utils/studentFormat";

export function DisposalDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const success =
    typeof location.state?.success === "string" ? location.state.success : "";
  const load = useCallback(
    (signal: AbortSignal) => studentApi.disposal(id, signal),
    [id],
  );
  const remote = useRemoteData(load);
  const request = remote.data;
  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">CADA ETAPA, UMA NOVA POSSIBILIDADE</p>
          <h1>Detalhes do descarte</h1>
          <p className="request-code">
            Solicitação #{id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Link className="secondary-button" to="/student/disposals">
          ← Meus descartes
        </Link>
      </div>
      {success && (
        <div className="catalog-message success" role="status">
          {success}
        </div>
      )}
      {remote.loading && <StudentLoading />}
      {remote.error && (
        <StudentError message={remote.error} retry={remote.reload} />
      )}
      {request && (
        <>
          <section className="catalog-card student-detail-summary">
            <div>
              <span className="field-help">Status atual</span>
              <DisposalBadge
                status={request.status}
                label={request.statusLabel}
              />
            </div>
            <div>
              <span className="field-help">Enviada em</span>
              <strong>{formatDate(request.requestedAt)}</strong>
            </div>
            <div>
              <span className="field-help">Peso declarado (preservado)</span>
              <strong>{formatGrams(request.totalWeightGramsSnapshot)}</strong>
            </div>
            {request.totalWeightGramsObserved !== null && (
              <div>
                <span className="field-help">
                  Peso conferido pela Biblioteca
                </span>
                <strong>{formatGrams(request.totalWeightGramsObserved)}</strong>
              </div>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={remote.reload}
            >
              Atualizar
            </button>
          </section>
          <div className="student-detail-grid">
            <div className="space-y-5">
              <DisposalItems request={request} />
              <DisposalReview request={request} />
            </div>
            <DisposalTimeline history={request.statusHistory} />
          </div>
        </>
      )}
    </div>
  );
}
