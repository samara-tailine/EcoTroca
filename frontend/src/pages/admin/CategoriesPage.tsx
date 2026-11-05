import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { categoriesApi } from "../../services/catalog";
import type { Category } from "../../services/catalog";
import { apiError } from "../../services/apiError";
import { useAdminList } from "../../hooks/useAdminList";
import {
  ListError,
  LoadingState,
  Message,
  StatusBadge,
} from "../../components/admin/CatalogUI";

export function CategoriesPage() {
  const list = useAdminList(categoriesApi.list);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const busy = saving || pendingId !== null || list.loading;

  function openForm(category?: Category) {
    setEditing(category ?? null);
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
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

  function replaceItem(category: Category) {
    list.setItems((items) => [
      ...items.filter(({ id }) => id !== category.id),
      category,
    ]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("Informe o nome da categoria.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
      };
      const category = editing
        ? await categoriesApi.update(editing.id, input)
        : await categoriesApi.create(input);
      replaceItem(category);
      setSuccess(
        editing
          ? "Categoria atualizada com sucesso."
          : "Categoria cadastrada com sucesso.",
      );
      setFormOpen(false);
      setEditing(null);
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(category: Category) {
    if (busy) return;
    setPendingId(category.id);
    setError("");
    setSuccess("");
    try {
      const updated = await categoriesApi.setStatus(
        category.id,
        !category.isActive,
      );
      replaceItem(updated);
      setSuccess(
        `Categoria ${updated.isActive ? "ativada" : "desativada"} com sucesso.`,
      );
    } catch (cause) {
      setError(apiError(cause));
    } finally {
      setPendingId(null);
    }
  }

  const filtered = list.items
    .filter(
      (category) =>
        category.name
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR").trim()) &&
        (status === "all" || category.isActive === (status === "active")),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">ORGANIZE O CATÁLOGO</p>
          <h1>Categorias</h1>
          <p>Agrupe equipamentos e mantenha o catálogo organizado.</p>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={busy}
          onClick={() => openForm()}
        >
          <span aria-hidden="true">+</span> Nova categoria
        </button>
      </div>
      {error && <Message kind="error">{error}</Message>}
      {success && <Message kind="success">{success}</Message>}
      {list.error && <ListError message={list.error} retry={list.reload} />}
      {formOpen && (
        <form
          ref={formRef}
          onSubmit={save}
          className="catalog-card catalog-form"
          aria-labelledby="category-form-title"
          aria-busy={saving}
        >
          <h2 id="category-form-title">
            {editing ? "Editar categoria" : "Nova categoria"}
          </h2>
          <fieldset disabled={busy} className="space-y-5">
            <legend className="sr-only">Dados da categoria</legend>
            <div className="field-group">
              <label htmlFor="category-name">
                Nome <span aria-hidden="true">*</span>
              </label>
              <input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                placeholder="Ex.: Informática"
              />
            </div>
            <div className="field-group">
              <label htmlFor="category-description">
                Descrição <span className="optional-label">(opcional)</span>
              </label>
              <textarea
                id="category-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Descreva os equipamentos desta categoria"
              />
            </div>
            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                {saving ? "Salvando…" : "Salvar categoria"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <section
        className="catalog-card"
        aria-label="Lista de categorias"
        aria-busy={list.loading}
      >
        <div className="catalog-toolbar">
          <div className="field-group grow">
            <label htmlFor="category-search">Buscar categoria</label>
            <input
              id="category-search"
              type="search"
              placeholder="Buscar pelo nome"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="category-status">Status</label>
            <select
              id="category-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
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
                aria-label="Categorias cadastradas"
                tabIndex={0}
              >
                <table className="catalog-table">
                  <caption className="sr-only">
                    Categorias cadastradas e ações de gerenciamento
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Categoria</th>
                      <th scope="col">Descrição</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((category) => (
                      <tr key={category.id}>
                        <td className="record-name">{category.name}</td>
                        <td className="description-cell">
                          {category.description || "Sem descrição"}
                        </td>
                        <td>
                          <StatusBadge active={category.isActive} />
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              disabled={busy}
                              className="text-action"
                              aria-label={`Editar ${category.name}`}
                              onClick={() => openForm(category)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="text-action"
                              aria-label={`${category.isActive ? "Desativar" : "Ativar"} ${category.name}`}
                              onClick={() => changeStatus(category)}
                            >
                              {pendingId === category.id
                                ? "Salvando…"
                                : category.isActive
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
                    ? "Nenhuma categoria cadastrada. Comece criando a primeira."
                    : "Nenhuma categoria corresponde aos filtros."}
                </p>
              )}
              <div className="catalog-list-footer">
                {filtered.length} de {list.items.length} categorias
              </div>
            </>
          )
        )}
      </section>
      <p className="catalog-help">
        Desativar uma categoria preserva seus registros e vínculos. Os
        equipamentos dela deixam de aparecer na consulta de ativos.
      </p>
    </div>
  );
}
