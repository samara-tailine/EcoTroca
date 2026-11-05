import type { ReactNode } from "react";

export function Message({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={`catalog-message ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`status-badge ${active ? "active" : "inactive"}`}>
      <span className="small-dot" />
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

export function LoadingState() {
  return (
    <div className="catalog-empty" role="status">
      <span className="spinner" aria-hidden="true" /> Carregando registros…
    </div>
  );
}

export function ListError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <Message kind="error">
      <span>{message}</span>
      <button type="button" onClick={retry} className="text-action">
        Tentar novamente
      </button>
    </Message>
  );
}
