import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { categoriesApi, equipmentApi } from "../../services/catalog";
import type { Equipment } from "../../services/catalog";
import { apiError } from "../../services/apiError";
import { useAdminList } from "../../hooks/useAdminList";
import {
  ListError,
  LoadingState,
  Message,
  StatusBadge,
} from "../../components/admin/CatalogUI";

export function EquipmentPage() {
  const list = useAdminList(equipmentApi.list);
  const categories = useAdminList(categoriesApi.list);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const busy =
    saving || pendingId !== null || list.loading || categories.loading;
  const weightIsFixed = Boolean(editing?.officialCatalogKey);
  const activeCategories = categories.items
    .filter(({ isActive }) => isActive)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  function openForm(equipment?: Equipment) {
    setEditing(equipment ?? null);
    setName(equipment?.name ?? "");
    setDescription(equipment?.description ?? "");
    setCategoryId(equipment?.categoryId ?? "");
    setWeight(equipment ? String(equipment.averageWeightGrams) : "");
    setError("");
    setSuccess("");
    setFormOpen(true);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      formRef.current
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    });
  }

  function replaceItem(equipment: Equipment) {
    list.setItems((items) => [
      ...items.filter(({ id }) => id !== equipment.id),
      equipment,
    ]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    const averageWeightGrams = Number(weight);
    if (
      !name.trim() ||
      !categoryId ||
      !Number.isInteger(averageWeightGrams) ||
      averageWeightGrams < 1 ||
      averageWeightGrams > 1000000
    ) {
      setError("Informe nome, categoria e peso inteiro entre 1 e 1.000.000 g.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        ...(!weightIsFixed ? { averageWeightGrams } : {}),
      };
      const equipment = editing
        ? await equipmentApi.update(editing.id, {
            ...data,
            ...(categoryId !== editing.categoryId ? { categoryId } : {}),
          })
        : await equipmentApi.create({
            ...data,
            categoryId,
            averageWeightGrams,
          });
      replaceItem(equipment);
      setSuccess(
        editing
          ? "Equipamento atualizado com sucesso."
          : "Equipamento cadastrado com sucesso.",
      );
      setFormOpen(false);
      setEditing(null);
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(equipment: Equipment) {
    if (busy) return;
    setPendingId(equipment.id);
    setError("");
    setSuccess("");
    try {
      const updated = await equipmentApi.setStatus(
        equipment.id,
        !equipment.isActive,
      );
      replaceItem(updated);
      setSuccess(
        `Equipamento ${updated.isActive ? "ativado" : "desativado"} com sucesso.`,
      );
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setPendingId(null);
    }
  }

  const filtered = list.items
    .filter(
      (equipment) =>
        equipment.name
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR").trim()) &&
        (status === "all" || equipment.isActive === (status === "active")) &&
        (categoryFilter === "all" || equipment.categoryId === categoryFilter),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">CADA EQUIPAMENTO, UM NOVO CICLO</p>
          <h1>Equipamentos</h1>
          <p>Mantenha o catálogo e consulte os pesos oficiais por unidade.</p>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={busy || !!categories.error || activeCategories.length === 0}
          onClick={() => openForm()}
        >
          <span aria-hidden="true">+</span> Novo equipamento
        </button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {success && <Message kind="success">{success}</Message>}
      {list.error && <ListError message={list.error} retry={list.reload} />}
      {categories.error && (
        <ListError
          message={`Não foi possível carregar as categorias. ${categories.error}`}
          retry={categories.reload}
        />
      )}
      {!categories.loading &&
        !categories.error &&
        activeCategories.length === 0 && (
          <p className="notice">
            Cadastre ou ative uma categoria antes de adicionar equipamentos.{" "}
            <Link className="text-action" to="/admin/categories">
              Gerenciar categorias
            </Link>
          </p>
        )}
      {formOpen && (
        <form
          ref={formRef}
          onSubmit={save}
          className="catalog-card catalog-form"
          aria-labelledby="equipment-form-title"
          aria-busy={saving}
        >
          <h2 id="equipment-form-title">
            {editing ? "Editar equipamento" : "Novo equipamento"}
          </h2>
          <fieldset disabled={busy} className="space-y-5">
            <legend className="sr-only">Dados do equipamento</legend>
            <div className="field-group">
              <label htmlFor="equipment-name">
                Nome <span aria-hidden="true">*</span>
              </label>
              <input
                id="equipment-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={160}
                placeholder="Ex.: Mouse"
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="field-group">
                <label htmlFor="equipment-category">
                  Categoria <span aria-hidden="true">*</span>
                </label>
                <select
                  id="equipment-category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Selecione uma categoria
                  </option>
                  {editing &&
                    !activeCategories.some(
                      ({ id }) => id === editing.categoryId,
                    ) && (
                      <option value={editing.categoryId} disabled>
                        {editing.category.name} (inativa)
                      </option>
                    )}
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {editing && !editing.category.isActive && (
                  <p className="field-help">
                    Você pode manter a categoria atual ou escolher uma categoria
                    ativa.
                  </p>
                )}
              </div>
              <div className="field-group">
                <label htmlFor="equipment-weight">
                  Peso médio por unidade (g) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="equipment-weight"
                  type="number"
                  inputMode="numeric"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  required
                  min={1}
                  max={1000000}
                  step={1}
                  placeholder="Ex.: 120"
                  aria-describedby="weight-help"
                  readOnly={weightIsFixed}
                />
                <p id="weight-help" className="field-help">
                  {weightIsFixed
                    ? "Peso oficial fixo. Nenhum perfil pode alterar este valor."
                    : "Informe o peso em gramas, sem casas decimais. Pesos oficiais são validados pelo sistema."}
                </p>
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="equipment-description">
                Descrição <span className="optional-label">(opcional)</span>
              </label>
              <textarea
                id="equipment-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Adicione detalhes para identificar o equipamento"
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="primary-button">
                {saving ? "Salvando…" : "Salvar equipamento"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <section
        className="catalog-card"
        aria-label="Lista de equipamentos"
        aria-busy={list.loading}
      >
        <div className="catalog-toolbar">
          <div className="field-group grow">
            <label htmlFor="equipment-search">Buscar equipamento</label>
            <input
              id="equipment-search"
              type="search"
              placeholder="Buscar pelo nome"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="equipment-filter-category">Categoria</label>
            <select
              id="equipment-filter-category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Todas</option>
              {categories.items.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="equipment-filter-status">Status</label>
            <select
              id="equipment-filter-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
        {list.loading ? (
          <LoadingState />
        ) : (
          !list.error && (
            <>
              <div
                className="table-scroll"
                role="region"
                aria-label="Equipamentos cadastrados"
                tabIndex={0}
              >
                <table className="catalog-table">
                  <caption className="sr-only">
                    Equipamentos cadastrados, pesos médios em gramas e ações de
                    gerenciamento
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Equipamento</th>
                      <th scope="col">Categoria</th>
                      <th scope="col">Peso / unidade</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((equipment) => (
                      <tr key={equipment.id}>
                        <td>
                          <span className="record-name">{equipment.name}</span>
                          {equipment.description && (
                            <span className="record-description">
                              {equipment.description}
                            </span>
                          )}
                        </td>
                        <td>
                          {equipment.category.name}
                          {!equipment.category.isActive && (
                            <span className="record-description">
                              Categoria inativa
                            </span>
                          )}
                        </td>
                        <td className="weight-cell">
                          {equipment.averageWeightGrams.toLocaleString("pt-BR")}{" "}
                          g
                        </td>
                        <td>
                          <StatusBadge active={equipment.isActive} />
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="text-action"
                              disabled={busy || !!categories.error}
                              aria-label={`Editar ${equipment.name}`}
                              onClick={() => openForm(equipment)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-action"
                              disabled={busy}
                              aria-label={`${equipment.isActive ? "Desativar" : "Ativar"} ${equipment.name}`}
                              onClick={() => changeStatus(equipment)}
                            >
                              {pendingId === equipment.id
                                ? "Salvando…"
                                : equipment.isActive
                                  ? "Desativar"
                                  : "Ativar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <p className="catalog-empty">
                  {list.items.length === 0
                    ? "Nenhum equipamento cadastrado. Adicione o primeiro ao catálogo."
                    : "Nenhum equipamento corresponde aos filtros."}
                </p>
              )}
              <div className="catalog-list-footer">
                {filtered.length} de {list.items.length} equipamentos
              </div>
            </>
          )
        )}
      </section>
      <p className="catalog-help">
        Os oito pesos oficiais são fixos para todos os perfis. Alterações no
        catálogo preservam os pesos já registrados nos históricos de descarte.
      </p>
    </div>
  );
}
