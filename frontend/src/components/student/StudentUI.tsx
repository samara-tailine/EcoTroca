import { Link } from "react-router";
import type { Disposal, DisposalStatus } from "../../services/student.types";
import { STATUS_LABELS } from "../../services/student.types";
import { formatDate, formatGrams } from "../../utils/studentFormat";

export function StudentLoading() {
  return (
    <div className="catalog-card catalog-empty" role="status">
      <span className="spinner" aria-hidden="true" /> Carregando suas
      informações…
    </div>
  );
}
export function StudentError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="catalog-message error" role="alert">
      <span>{message}</span>
      <button type="button" className="text-action" onClick={retry}>
        Tentar novamente
      </button>
    </div>
  );
}
export function DisposalBadge({
  status,
  label,
}: {
  status: DisposalStatus;
  label?: string;
}) {
  return (
    <span className={`disposal-badge state-${status.toLowerCase()}`}>
      <span className="small-dot" />
      {label || STATUS_LABELS[status] || "Status indisponível"}
    </span>
  );
}
export function DisposalTable({ items }: { items: Disposal[] }) {
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Solicitações de descarte"
      tabIndex={0}
    >
      <table className="catalog-table">
        <caption className="sr-only">
          Suas solicitações, pesos históricos e status
        </caption>
        <thead>
          <tr>
            <th scope="col">Solicitação</th>
            <th scope="col">Enviada em</th>
            <th scope="col">Peso total</th>
            <th scope="col">Status</th>
            <th scope="col">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong className="record-name">
                  #{item.id.slice(0, 8).toUpperCase()}
                </strong>
                <span className="record-description">
                  {item.items.length} tipo(s) de equipamento
                </span>
              </td>
              <td>{formatDate(item.requestedAt)}</td>
              <td className="weight-cell">
                {formatGrams(
                  item.totalWeightGramsObserved ??
                    item.totalWeightGramsSnapshot,
                )}
              </td>
              <td>
                <DisposalBadge status={item.status} label={item.statusLabel} />
              </td>
              <td>
                <Link
                  className="text-action"
                  to={`/student/disposals/${item.id}`}
                  aria-label={`Ver solicitação ${item.id.slice(0, 8)}`}
                >
                  Ver detalhes →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="student-pagination" aria-label="Paginação">
      <span>
        {total.toLocaleString("pt-BR")} registro(s) · Página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="secondary-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
