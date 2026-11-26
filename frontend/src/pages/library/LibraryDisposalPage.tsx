import { observedTotals } from "../../utils/observedDisposal";
import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { libraryApi } from "../../services/library";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  DisposalBadge,
  StudentError as DataError,
  StudentLoading as DataLoading,
} from "../../components/student/StudentUI";
import {
  DisposalItems,
  DisposalReview,
  DisposalTimeline,
} from "../../components/disposals/DisposalReadOnly";
import { LibraryActions } from "../../components/library/LibraryActions";
import {
  formatCoins,
  formatDate,
  formatGrams,
} from "../../utils/studentFormat";

export function LibraryDisposalPage() {
  const { id = "" } = useParams();
  return <LibraryDisposalWorkspace key={id} id={id} />;
}

function LibraryDisposalWorkspace({ id }: { id: string }) {
  const { session } = useAuth();
  const load = useCallback(
    (signal: AbortSignal) => libraryApi.detail(id, signal),
    [id],
  );
  const remote = useRemoteData(load);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const request = remote.data;
  const total = request ? observedTotals(request.items) : null;
  function attempt() {
    setSuccess("");
    setError("");
  }
  function failure(message: string, refresh: boolean) {
    setError(message);
    setSuccess("");
    if (refresh) remote.reload();
    window.requestAnimationFrame(() => errorRef.current?.focus());
  }
  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">RECEBIMENTO E CONFERÊNCIA</p>
          <h1>Detalhes da solicitação</h1>
          <p>Solicitação #{id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Link to="/library/disposals" className="secondary-button">
          ← Voltar para a fila
        </Link>
      </div>
      {success && (
        <div className="catalog-message success" role="status">
          {success}
        </div>
      )}
      {error && (
        <div
          className="catalog-message error"
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          <span>{error}</span>
          <button
            type="button"
            className="text-action"
            disabled={busy || remote.loading}
            onClick={remote.reload}
          >
            Atualizar solicitação
          </button>
        </div>
      )}
      {remote.loading && <DataLoading />}
      {remote.error && (
        <DataError message={remote.error} retry={remote.reload} />
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
              <span className="field-help">Solicitada em</span>
              <strong>{formatDate(request.requestedAt)}</strong>
            </div>
            <div>
              <span className="field-help">Peso declarado (preservado)</span>
              <strong>{formatGrams(request.totalWeightGramsSnapshot)}</strong>
            </div>
            <div>
              <span className="field-help">Peso conferido</span>
              <strong>
                {request.totalWeightGramsObserved === null
                  ? request.status === "APPROVED"
                    ? "Aprovação histórica: regra anterior"
                    : "Conferência pendente"
                  : formatGrams(request.totalWeightGramsObserved)}
              </strong>
            </div>
            {total && (
              <div>
                <span className="field-help">EcoCoins pela conferência</span>
                <strong>{formatCoins(total.ecoCoins)} EcoCoins</strong>
              </div>
            )}
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => {
                attempt();
                remote.reload();
              }}
            >
              Atualizar
            </button>
          </section>
          <section className="catalog-card library-student-card">
            <h2 className="student-small-title">Dados do estudante</h2>
            <dl className="student-data-grid">
              <div>
                <dt>Nome</dt>
                <dd>{request.requester.name}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{request.requester.email}</dd>
              </div>
              <div>
                <dt>Identificação do estudante</dt>
                <dd>
                  {request.requester.studentIdentifier || "Não informada"}
                </dd>
              </div>
              <div>
                <dt>Identificador da conta</dt>
                <dd className="library-user-id">{request.requester.id}</dd>
              </div>
            </dl>
          </section>
          <LibraryActions
            request={request}
            actorId={session?.user.id ?? ""}
            onAttempt={attempt}
            onBusy={setBusy}
            onSuccess={(message) => {
              setSuccess(message);
              setError("");
              remote.reload();
            }}
            onError={failure}
          />
          {request.status === "APPROVED" && (
            <div className="student-info-strip">
              <span aria-hidden="true">◉</span>
              <p>
                Consulte os créditos deste descarte nos registros permitidos ao
                seu usuário.{" "}
                <Link
                  className="text-action"
                  to={`/library/credits?disposalRequestId=${encodeURIComponent(request.id)}`}
                >
                  Ver créditos vinculados →
                </Link>
              </p>
            </div>
          )}
          <div className="student-detail-grid">
            <div className="space-y-5">
              <DisposalItems request={request} studentView={false} />
              <DisposalReview request={request} />
            </div>
            <DisposalTimeline history={request.statusHistory} />
          </div>
        </>
      )}
    </div>
  );
}
