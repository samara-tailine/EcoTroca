import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import axios from "axios";
import { studentApi } from "../../services/student";
import { studentError } from "../../services/studentError";
import {
  FUNCTIONALITIES,
  PHYSICAL_CONDITIONS,
} from "../../services/student.types";
import type { CreateDisposalInput } from "../../services/student.types";
import type { Equipment } from "../../services/catalog";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  StudentError,
  StudentLoading,
} from "../../components/student/StudentUI";
import { formatGrams, safePhotoUrl } from "../../utils/studentFormat";

type DraftItem = {
  localId: string;
  equipmentId: string;
  quantity: string;
  physicalCondition: (typeof PHYSICAL_CONDITIONS)[number] | "";
  functionality: (typeof FUNCTIONALITIES)[number] | "";
  photoUrl: string;
};
function emptyItem(): DraftItem {
  return {
    localId: crypto.randomUUID(),
    equipmentId: "",
    quantity: "1",
    physicalCondition: "",
    functionality: "",
    photoUrl: "",
  };
}
function totalWeight(
  items: DraftItem[],
  equipment: Equipment[],
): bigint | null {
  let total = 0n;
  for (const item of items) {
    const record = equipment.find(({ id }) => id === item.equipmentId);
    if (!record || !/^\d+$/.test(item.quantity)) return null;
    const quantity = BigInt(item.quantity);
    if (quantity < 1n || quantity > 2147483647n) return null;
    total += quantity * BigInt(record.averageWeightGrams);
  }
  return total;
}

export function NewDisposalPage() {
  const navigate = useNavigate();
  const catalog = useRemoteData(studentApi.activeEquipment);
  const [items, setItems] = useState<DraftItem[]>(() => [emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const equipment = (catalog.data ?? []).filter(
    (item) => item.isActive && item.category.isActive,
  );
  const preview = totalWeight(items, equipment);
  function update(localId: string, patch: Partial<Omit<DraftItem, "localId">>) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  }
  function showError(message: string) {
    setError(message);
    window.requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    setError("");
    if (
      !items.length ||
      new Set(items.map(({ equipmentId }) => equipmentId)).size !==
        items.length ||
      items.some(
        (item) =>
          !equipment.some(({ id }) => id === item.equipmentId) ||
          !item.physicalCondition ||
          !item.functionality,
      )
    ) {
      showError(
        "Selecione equipamentos ativos, sem repetições, e preencha a condição física e o funcionamento de cada item.",
      );
      return;
    }
    if (preview === null || preview <= 0n || preview > 2147483647n) {
      showError(
        "Informe quantidades inteiras positivas. O peso total deve ser de até 2.147.483.647 g.",
      );
      return;
    }
    if (
      items.some(
        (item) => item.photoUrl.trim() && !safePhotoUrl(item.photoUrl.trim()),
      )
    ) {
      showError(
        "As fotos devem ser URLs válidas iniciadas por http:// ou https://.",
      );
      return;
    }
    const payload: CreateDisposalInput = {
      items: items.map((item) => ({
        equipmentId: item.equipmentId,
        quantity: Number(item.quantity),
        physicalCondition:
          item.physicalCondition as (typeof PHYSICAL_CONDITIONS)[number],
        functionality: item.functionality as (typeof FUNCTIONALITIES)[number],
        ...(item.photoUrl.trim() ? { photoUrl: item.photoUrl.trim() } : {}),
      })),
    };
    submitLock.current = true;
    setSubmitting(true);
    try {
      const result = await studentApi.createDisposal(payload);
      navigate(`/student/disposals/${result.id}`, {
        replace: true,
        state: {
          success:
            "Solicitação enviada com sucesso. Acompanhe as próximas etapas abaixo.",
        },
      });
    } catch (cause) {
      showError(
        axios.isAxiosError(cause) &&
          (!cause.response || cause.response.status >= 500)
          ? "Não foi possível confirmar o envio. Confira Meus descartes antes de tentar novamente, pois a solicitação pode ter sido recebida."
          : studentError(cause),
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">DÊ UM NOVO DESTINO</p>
          <h1>Nova solicitação</h1>
          <p>Informe os equipamentos e conte como eles estão.</p>
        </div>
        <Link to="/student/disposals" className="secondary-button">
          Meus descartes
        </Link>
      </div>
      {catalog.loading && <StudentLoading />}
      {catalog.error && (
        <StudentError message={catalog.error} retry={catalog.reload} />
      )}
      {catalog.data && equipment.length === 0 && (
        <div className="notice" role="status">
          Não há equipamentos ativos disponíveis no momento. Tente novamente
          mais tarde.
          <button
            type="button"
            className="text-action ml-3"
            onClick={catalog.reload}
          >
            Atualizar catálogo
          </button>
        </div>
      )}
      {catalog.data && equipment.length > 0 && (
        <form onSubmit={submit} className="space-y-5" aria-busy={submitting}>
          {error && (
            <div
              ref={errorRef}
              tabIndex={-1}
              className="catalog-message error"
              role="alert"
            >
              <span>{error}</span>
              <Link className="text-action" to="/student/disposals">
                Conferir meus descartes
              </Link>
            </div>
          )}
          <fieldset
            disabled={submitting}
            className="student-form-fieldset space-y-5"
          >
            <legend className="sr-only">Equipamentos da solicitação</legend>
            {items.map((item, index) => {
              const selected = equipment.find(
                ({ id }) => id === item.equipmentId,
              );
              return (
                <section
                  className="catalog-card catalog-form"
                  key={item.localId}
                  aria-labelledby={`item-title-${item.localId}`}
                >
                  <div className="student-item-heading">
                    <h2 id={`item-title-${item.localId}`}>
                      <span className="item-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      Equipamento {index + 1}
                    </h2>
                    <button
                      type="button"
                      className="text-action"
                      disabled={items.length === 1}
                      aria-label={`Remover equipamento ${index + 1}`}
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (value) => value.localId !== item.localId,
                          ),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                  <div className="student-item-fields">
                    <div className="field-group">
                      <label htmlFor={`equipment-${item.localId}`}>
                        Equipamento *
                      </label>
                      <select
                        id={`equipment-${item.localId}`}
                        required
                        value={item.equipmentId}
                        onChange={(event) =>
                          update(item.localId, {
                            equipmentId: event.target.value,
                          })
                        }
                      >
                        <option value="" disabled>
                          Selecione um equipamento
                        </option>
                        {equipment.map((record) => (
                          <option
                            key={record.id}
                            value={record.id}
                            disabled={items.some(
                              (other) =>
                                other.localId !== item.localId &&
                                other.equipmentId === record.id,
                            )}
                          >
                            {record.name} ·{" "}
                            {formatGrams(record.averageWeightGrams)}/unidade
                          </option>
                        ))}
                      </select>
                      <p className="field-help">
                        {selected
                          ? `${selected.category.name} · Peso fixo: ${formatGrams(selected.averageWeightGrams)} por unidade.`
                          : "Somente equipamentos e categorias ativos estão disponíveis."}
                      </p>
                    </div>
                    <div className="field-group">
                      <label htmlFor={`quantity-${item.localId}`}>
                        Quantidade *
                      </label>
                      <input
                        id={`quantity-${item.localId}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={2147483647}
                        step={1}
                        required
                        value={item.quantity}
                        onChange={(event) =>
                          update(item.localId, { quantity: event.target.value })
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor={`condition-${item.localId}`}>
                        Condição física *
                      </label>
                      <select
                        id={`condition-${item.localId}`}
                        required
                        value={item.physicalCondition}
                        onChange={(event) =>
                          update(item.localId, {
                            physicalCondition: event.target
                              .value as DraftItem["physicalCondition"],
                          })
                        }
                      >
                        <option value="" disabled>
                          Selecione a condição
                        </option>
                        {PHYSICAL_CONDITIONS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor={`functionality-${item.localId}`}>
                        Funcionamento *
                      </label>
                      <select
                        id={`functionality-${item.localId}`}
                        required
                        value={item.functionality}
                        onChange={(event) =>
                          update(item.localId, {
                            functionality: event.target
                              .value as DraftItem["functionality"],
                          })
                        }
                      >
                        <option value="" disabled>
                          Selecione o funcionamento
                        </option>
                        {FUNCTIONALITIES.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group student-full-field">
                      <label htmlFor={`photo-${item.localId}`}>
                        URL da foto{" "}
                        <span className="optional-label">(opcional)</span>
                      </label>
                      <input
                        id={`photo-${item.localId}`}
                        type="url"
                        maxLength={2048}
                        placeholder="https://exemplo.com/foto.jpg"
                        value={item.photoUrl}
                        onChange={(event) =>
                          update(item.localId, { photoUrl: event.target.value })
                        }
                      />
                      <p className="field-help">
                        Informe um link HTTP ou HTTPS. Não é necessário anexar
                        um arquivo.
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}
            <button
              type="button"
              className="secondary-button"
              disabled={items.length >= Math.min(100, equipment.length)}
              onClick={() => setItems((current) => [...current, emptyItem()])}
            >
              ＋ Adicionar outro equipamento
            </button>
            <div className="student-submit-card">
              <div>
                <span>Peso total informado</span>
                <strong>
                  {preview === null
                    ? "Preencha equipamentos e quantidades"
                    : `${preview.toLocaleString("pt-BR")} g`}
                </strong>
                <p>
                  O envio usa os pesos fixos do catálogo. EcoCoins entram
                  somente após aprovação da Biblioteca.
                </p>
              </div>
              <div className="form-actions">
                <Link className="secondary-button" to="/student/disposals">
                  Cancelar
                </Link>
                <button type="submit" className="primary-button">
                  {submitting ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Enviando…
                    </>
                  ) : (
                    "Enviar solicitação"
                  )}
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
