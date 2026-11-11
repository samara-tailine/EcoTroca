import { useRef, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { libraryApi } from "../../services/library";
import {
  ACTION_LABELS,
  ACTION_SUCCESS,
  libraryActionPolicy,
} from "../../services/libraryActions";
import type { CheckInput, LibraryAction } from "../../services/library.types";
import {
  FUNCTIONALITIES,
  PHYSICAL_CONDITIONS,
} from "../../services/student.types";
import type { Disposal } from "../../services/student.types";
import { studentError } from "../../services/studentError";
import { formatGrams } from "../../utils/studentFormat";

type DivergenceDraft = {
  enabled: boolean;
  description: string;
  quantity: string;
  physical: (typeof PHYSICAL_CONDITIONS)[number] | "";
  functionality: (typeof FUNCTIONALITIES)[number] | "";
};
type Props = {
  request: Disposal;
  actorId: string;
  onAttempt: () => void;
  onBusy: (busy: boolean) => void;
  onSuccess: (message: string) => void;
  onError: (message: string, refresh: boolean) => void;
};

export function LibraryActions({
  request,
  actorId,
  onAttempt,
  onBusy,
  onSuccess,
  onError,
}: Props) {
  const [action, setAction] = useState<LibraryAction | null>(null);
  const [notes, setNotes] = useState("");
  const [justification, setJustification] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DivergenceDraft>>({});
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const policy = libraryActionPolicy(request, actorId);
  const terminal = ["APPROVED", "REJECTED", "CANCELLED"].includes(
    request.status,
  );

  function start(next: LibraryAction) {
    if (lock.current || policy[next]) return;
    onAttempt();
    setAction(next);
    setNotes("");
    setJustification("");
    setDrafts(
      Object.fromEntries(
        request.items.map((item) => [
          item.id,
          {
            enabled: false,
            description: "",
            quantity: "",
            physical: "",
            functionality: "",
          },
        ]),
      ),
    );
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "center" });
      formRef.current
        ?.querySelector<HTMLTextAreaElement>("textarea")
        ?.focus({ preventScroll: true });
    });
  }
  function update(itemId: string, patch: Partial<DivergenceDraft>) {
    setDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...patch },
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || lock.current) return;
    onAttempt();
    if (policy[action]) {
      onError(policy[action]!, true);
      return;
    }
    if (
      (action === "approve" || action === "reject") &&
      !justification.trim()
    ) {
      onError("Informe uma justificativa para a decisão.", false);
      return;
    }
    const check: CheckInput = {
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      divergences: [],
    };
    if (action === "check") {
      for (const item of request.items) {
        const draft = drafts[item.id];
        if (!draft?.enabled) continue;
        const quantity =
          draft.quantity.trim() === "" ? undefined : Number(draft.quantity);
        if (!draft.description.trim()) {
          onError(
            "Descreva cada divergência selecionada antes de concluir a conferência.",
            false,
          );
          return;
        }
        if (
          quantity !== undefined &&
          (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647)
        ) {
          onError(
            "A quantidade observada deve ser um inteiro entre zero e 2.147.483.647.",
            false,
          );
          return;
        }
        check.divergences!.push({
          itemId: item.id,
          description: draft.description.trim(),
          ...(quantity !== undefined ? { quantityObserved: quantity } : {}),
          ...(draft.physical
            ? { physicalConditionObserved: draft.physical }
            : {}),
          ...(draft.functionality
            ? { functionalityObserved: draft.functionality }
            : {}),
        });
      }
    }
    lock.current = true;
    setPending(true);
    onBusy(true);
    try {
      if (action === "receive")
        await libraryApi.receive(request.id, notes.trim() || undefined);
      else if (action === "check") await libraryApi.check(request.id, check);
      else if (action === "approve")
        await libraryApi.approve(request.id, justification.trim());
      else await libraryApi.reject(request.id, justification.trim());
      setAction(null);
      onSuccess(ACTION_SUCCESS[action]);
    } catch (cause) {
      const uncertain =
        axios.isAxiosError(cause) &&
        (!cause.response || cause.response.status >= 500);
      const conflict =
        axios.isAxiosError(cause) && cause.response?.status === 409;
      onError(
        uncertain
          ? "Não foi possível confirmar o resultado da operação. Atualize a solicitação e confira seu status antes de tentar novamente. Nenhuma ação será repetida automaticamente."
          : studentError(cause),
        uncertain || conflict,
      );
      if (uncertain || conflict) setAction(null);
    } finally {
      lock.current = false;
      setPending(false);
      onBusy(false);
    }
  }

  return (
    <section
      className="catalog-card library-actions"
      aria-labelledby="library-actions-title"
    >
      <h2 id="library-actions-title" className="student-small-title">
        Processar solicitação
      </h2>
      {terminal ? (
        <p className="library-action-help">
          Esta solicitação está concluída. As operações não podem ser repetidas
          ou reabertas.
        </p>
      ) : (
        <>
          {request.requesterId === actorId && (
            <p className="notice">
              Você não pode aprovar sua própria solicitação. A aprovação precisa
              ser feita por outra pessoa autorizada da Biblioteca.
            </p>
          )}
          <p className="library-action-help">
            Receba os equipamentos, registre a conferência e decida sobre o
            descarte. A rejeição pode ocorrer antes do recebimento, sempre com
            justificativa.
          </p>
          <div className="library-action-buttons">
            {(["receive", "check", "approve", "reject"] as LibraryAction[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    value === "reject"
                      ? "secondary-button library-reject-button"
                      : "secondary-button"
                  }
                  disabled={pending || !!policy[value]}
                  title={policy[value] || ACTION_LABELS[value]}
                  aria-pressed={action === value}
                  onClick={() => start(value)}
                >
                  {ACTION_LABELS[value]}
                </button>
              ),
            )}
          </div>
          <div className="library-step-guide">
            <span className={request.status === "PENDING" ? "current" : ""}>
              1. Recebimento
            </span>
            <span aria-hidden="true">→</span>
            <span className={request.status === "RECEIVED" ? "current" : ""}>
              2. Conferência
            </span>
            <span aria-hidden="true">→</span>
            <span className={request.status === "IN_REVIEW" ? "current" : ""}>
              3. Decisão
            </span>
          </div>
        </>
      )}
      {action && !terminal && (
        <form
          ref={formRef}
          onSubmit={submit}
          className="library-action-form"
          aria-labelledby="library-action-form-title"
          aria-busy={pending}
        >
          <h3 id="library-action-form-title">{ACTION_LABELS[action]}</h3>
          <fieldset
            disabled={pending}
            className="student-form-fieldset space-y-5"
          >
            <legend className="sr-only">
              Dados para {ACTION_LABELS[action].toLowerCase()}
            </legend>
            {action === "approve" || action === "reject" ? (
              <>
                {action === "approve" && (
                  <p className="library-action-help">
                    Ao confirmar, a aprovação e o crédito de EcoCoins são
                    registrados juntos pelo sistema. Pesos e conversões não
                    podem ser editados aqui.
                  </p>
                )}
                <div className="field-group">
                  <label htmlFor="library-justification">Justificativa *</label>
                  <textarea
                    id="library-justification"
                    required
                    minLength={1}
                    maxLength={2000}
                    rows={4}
                    value={justification}
                    onChange={(event) => setJustification(event.target.value)}
                    placeholder={
                      action === "approve"
                        ? "Descreva os motivos da aprovação após a conferência"
                        : "Informe claramente o motivo da rejeição"
                    }
                  />
                </div>
              </>
            ) : (
              <div className="field-group">
                <label htmlFor="library-notes">
                  Observações <span className="optional-label">(opcional)</span>
                </label>
                <textarea
                  id="library-notes"
                  maxLength={2000}
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={
                    action === "receive"
                      ? "Registre observações sobre o recebimento"
                      : "Registre observações gerais da conferência"
                  }
                />
              </div>
            )}
            {action === "check" && (
              <div className="space-y-4">
                <p className="library-action-help">
                  Marque apenas os itens com divergências. Os campos abaixo
                  registram o que foi observado, sem alterar os dados originais
                  do estudante ou os pesos.
                </p>
                {request.items.map((item, index) => {
                  const draft = drafts[item.id];
                  if (!draft) return null;
                  return (
                    <section key={item.id} className="library-divergence-form">
                      <label className="library-checkline">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(event) =>
                            update(item.id, { enabled: event.target.checked })
                          }
                        />
                        <span>
                          Registrar divergência:{" "}
                          <strong>
                            {item.equipmentNameSnapshot || item.equipment.name}
                          </strong>
                        </span>
                      </label>
                      <p className="field-help">
                        Declarado: {item.quantity} unidade(s) ·{" "}
                        {item.physicalCondition || "Condição não informada"} ·{" "}
                        {item.functionality || "Funcionamento não informado"} ·{" "}
                        {formatGrams(item.averageWeightGramsSnapshot)} por
                        unidade.
                      </p>
                      {draft.enabled && (
                        <div className="library-observed-fields">
                          <div className="field-group student-full-field">
                            <label htmlFor={`divergence-description-${index}`}>
                              Descrição da divergência *
                            </label>
                            <textarea
                              id={`divergence-description-${index}`}
                              required
                              minLength={1}
                              maxLength={2000}
                              rows={3}
                              value={draft.description}
                              onChange={(event) =>
                                update(item.id, {
                                  description: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="field-group">
                            <label htmlFor={`observed-quantity-${index}`}>
                              Quantidade observada{" "}
                              <span className="optional-label">(opcional)</span>
                            </label>
                            <input
                              id={`observed-quantity-${index}`}
                              type="number"
                              min={0}
                              max={2147483647}
                              step={1}
                              inputMode="numeric"
                              value={draft.quantity}
                              onChange={(event) =>
                                update(item.id, {
                                  quantity: event.target.value,
                                })
                              }
                            />
                            <p className="field-help">
                              Use zero se o item não foi entregue.
                            </p>
                          </div>
                          <div className="field-group">
                            <label htmlFor={`observed-condition-${index}`}>
                              Condição observada{" "}
                              <span className="optional-label">(opcional)</span>
                            </label>
                            <select
                              id={`observed-condition-${index}`}
                              value={draft.physical}
                              onChange={(event) =>
                                update(item.id, {
                                  physical: event.target
                                    .value as DivergenceDraft["physical"],
                                })
                              }
                            >
                              <option value="">Não informada</option>
                              {PHYSICAL_CONDITIONS.map((label) => (
                                <option key={label} value={label}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field-group">
                            <label htmlFor={`observed-functionality-${index}`}>
                              Funcionamento observado{" "}
                              <span className="optional-label">(opcional)</span>
                            </label>
                            <select
                              id={`observed-functionality-${index}`}
                              value={draft.functionality}
                              onChange={(event) =>
                                update(item.id, {
                                  functionality: event.target
                                    .value as DivergenceDraft["functionality"],
                                })
                              }
                            >
                              <option value="">Não informado</option>
                              {FUNCTIONALITIES.map((label) => (
                                <option key={label} value={label}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAction(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="primary-button">
                {pending ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Registrando…
                  </>
                ) : action === "approve" ? (
                  "Confirmar aprovação e crédito"
                ) : action === "reject" ? (
                  "Confirmar rejeição"
                ) : action === "check" ? (
                  "Concluir conferência"
                ) : (
                  "Confirmar recebimento"
                )}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
