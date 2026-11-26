import { useEffect, useRef } from "react";
export interface Confirmation {
  title: string;
  description: string;
  confirmText: string;
  run: () => Promise<void>;
}
export function ConfirmDialog({
  action,
  busy,
  onCancel,
  onConfirm,
}: {
  action: Confirmation;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="user-confirm-dialog"
      aria-labelledby="user-confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="user-confirm-title">{action.title}</h2>
      <p>{action.description}</p>
      <div className="form-actions">
        <button
          autoFocus
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Salvando…" : action.confirmText}
        </button>
      </div>
    </dialog>
  );
}
