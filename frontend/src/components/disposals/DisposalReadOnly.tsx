import type { Disposal } from "../../services/student.types";
import { STATUS_LABELS } from "../../services/student.types";
import {
  formatDate,
  formatGrams,
  safePhotoUrl,
} from "../../utils/studentFormat";

export function DisposalItems({
  request,
  studentView = true,
}: {
  request: Disposal;
  studentView?: boolean;
}) {
  return (
    <section className="catalog-card">
      <div className="student-section-heading">
        <h2>Equipamentos informados</h2>
      </div>
      {request.items.map((item) => {
        const photo = safePhotoUrl(item.photoUrl);
        return (
          <article key={item.id} className="student-detail-item">
            <div className="student-item-heading">
              <h3>
                {item.equipmentNameSnapshot ||
                  item.equipment?.name ||
                  "Equipamento"}
              </h3>
              <span className="profile-badge">
                {item.quantity.toLocaleString("pt-BR")} unidade(s) declarada(s)
              </span>
            </div>
            <dl className="student-data-grid">
              <div>
                <dt>Quantidade efetivamente conferida</dt>
                <dd>{item.quantityObserved ?? "Não registrada"}</dd>
              </div>
              {item.quantityObserved !== null && (
                <div>
                  <dt>Peso efetivamente conferido</dt>
                  <dd>
                    {formatGrams(
                      item.quantityObserved * item.averageWeightGramsSnapshot,
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>Condição física declarada</dt>
                <dd>{item.physicalCondition || "Não informada"}</dd>
              </div>
              <div>
                <dt>Funcionamento declarado</dt>
                <dd>{item.functionality || "Não informado"}</dd>
              </div>
              <div>
                <dt>Peso histórico por unidade</dt>
                <dd>{formatGrams(item.averageWeightGramsSnapshot)}</dd>
              </div>
              <div>
                <dt>Foto</dt>
                <dd>
                  {photo ? (
                    <a
                      className="text-action"
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      Abrir foto ↗
                    </a>
                  ) : (
                    "Não informada"
                  )}
                </dd>
              </div>
            </dl>
            {item.divergence && (
              <div className="student-divergence">
                <h4>Observações da conferência</h4>
                <p>{item.divergence.description}</p>
                <dl className="student-data-grid">
                  <div>
                    <dt>Quantidade observada</dt>
                    <dd>
                      {item.divergence.quantityObserved ?? "Não informada"}
                    </dd>
                  </div>
                  <div>
                    <dt>Condição observada</dt>
                    <dd>
                      {item.divergence.physicalConditionObserved ||
                        "Não informada"}
                    </dd>
                  </div>
                  <div>
                    <dt>Funcionamento observado</dt>
                    <dd>
                      {item.divergence.functionalityObserved || "Não informado"}
                    </dd>
                  </div>
                </dl>
                <p className="field-help">
                  Registrado por{" "}
                  {item.divergence.recordedBy?.name || "Biblioteca"} em{" "}
                  {formatDate(item.divergence.createdAt)}.{" "}
                  {studentView
                    ? "Sua declaração original foi preservada."
                    : "A declaração original do estudante foi preservada."}
                </p>
              </div>
            )}
          </article>
        );
      })}
      {!request.items.length && (
        <p className="catalog-empty">
          Esta solicitação não possui itens registrados.
        </p>
      )}
    </section>
  );
}

export function DisposalReview({ request }: { request: Disposal }) {
  if (!request.reviewNotes) return null;
  return (
    <section className="catalog-card p-6">
      <h2 className="student-small-title">Parecer da Biblioteca</h2>
      <p className="student-long-text">{request.reviewNotes}</p>
      {request.reviewedBy && (
        <p className="field-help mt-3">
          Responsável: {request.reviewedBy.name}
        </p>
      )}
    </section>
  );
}

export function DisposalTimeline({
  history,
}: {
  history: Disposal["statusHistory"];
}) {
  return (
    <section className="catalog-card student-timeline-card">
      <h2 className="student-small-title">Histórico da solicitação</h2>
      <ol className="student-timeline">
        {history.map((entry) => (
          <li key={entry.id}>
            <span className="timeline-point" aria-hidden="true" />
            <strong>
              {entry.toStatusLabel || STATUS_LABELS[entry.toStatus]}
            </strong>
            <time dateTime={entry.createdAt}>
              {formatDate(entry.createdAt)}
            </time>
            <span>{entry.actor?.name || "Registro do sistema"}</span>
            {entry.notes && <p>{entry.notes}</p>}
          </li>
        ))}
      </ol>
      {!history.length && (
        <p className="field-help">Não há eventos históricos registrados.</p>
      )}
    </section>
  );
}
