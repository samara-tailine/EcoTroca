import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { getSessionSnapshot } from "../../auth/session";
import { profileLabel } from "../../auth/profileLabels";
import { usersApi, usersError } from "../../services/users";
import type { AdminUser } from "../../services/users";
import { PROFILE_KEYS } from "../../utils/userProfiles";
import { useRemoteData } from "../../hooks/useRemoteData";
import {
  LoadingState,
  ListError,
  Message,
  StatusBadge,
} from "../../components/admin/CatalogUI";
import { Pagination } from "../../components/student/StudentUI";
import { UserEditor } from "../../components/admin/UserEditor";
import type { UserEditorMode } from "../../components/admin/UserEditor";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog";
import type { Confirmation } from "../../components/admin/ConfirmDialog";

async function load(signal: AbortSignal) {
  const [users, profiles] = await Promise.all([
    usersApi.list(signal),
    usersApi.profiles(signal),
  ]);
  return { users, profiles };
}
export function UsersPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const remote = useRemoteData(load);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [role, setRole] = useState("all"),
    [page, setPage] = useState(1);
  const [editor, setEditor] = useState<UserEditorMode | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [saving, setSaving] = useState(false),
    [loadingUser, setLoadingUser] = useState(false);
  const [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const lock = useRef(false),
    readId = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const busy = saving || loadingUser;
  const currentId = session?.user.id;

  function reveal(next: UserEditorMode) {
    setEditor(next);
    setError("");
    setSuccess("");
    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      editorRef.current?.focus({ preventScroll: true });
    });
  }
  async function openUser(user: AdminUser, mode: "view" | "edit" | "profiles") {
    if (lock.current) return;
    const request = ++readId.current;
    setLoadingUser(true);
    setError("");
    setSuccess("");
    try {
      const fresh = await usersApi.get(user.id);
      if (request === readId.current) reveal({ mode, user: fresh });
    } catch (cause) {
      if (request === readId.current) setError(usersError(cause));
    } finally {
      if (request === readId.current) setLoadingUser(false);
    }
  }
  function saved(user: AdminUser, message: string) {
    setSuccess(message);
    setError("");
    setEditor(null);
    remote.reload();
    if (user.id === currentId) {
      if (!user.isActive) navigate("/login", { replace: true });
      else if (!user.accessProfiles.some((p) => p.key === "ADMIN"))
        navigate("/", { replace: true });
    }
  }
  function requestStatus(user: AdminUser) {
    if (busy || lock.current) return;
    const isActive = !user.isActive,
      self = user.id === currentId;
    setConfirmation({
      title: isActive ? "Ativar usuário" : "Desativar usuário",
      description: `${isActive ? "Ativar" : "Desativar"} a conta de ${user.name} (${user.email})?${!isActive ? " O acesso ao sistema será bloqueado." : ""}${self && !isActive ? " Esta é sua própria conta; sua sessão será encerrada." : ""}`,
      confirmText: isActive ? "Ativar" : "Desativar",
      run: async () =>
        saved(
          await usersApi.setStatus(user.id, isActive),
          `Usuário ${isActive ? "ativado" : "desativado"} com sucesso.`,
        ),
    });
  }
  async function confirm() {
    if (!confirmation || lock.current) return;
    if (
      !getSessionSnapshot().session?.user.accessProfiles.some(
        (p) => p.key === "ADMIN",
      )
    ) {
      setConfirmation(null);
      setError("Seu acesso administrativo foi removido.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await confirmation.run();
    } catch (cause) {
      setError(usersError(cause));
      remote.reload();
    } finally {
      lock.current = false;
      setSaving(false);
      setConfirmation(null);
    }
  }
  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = (remote.data?.users ?? [])
    .filter(
      (user) =>
        (!normalized ||
          user.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
          user.email.toLocaleLowerCase("pt-BR").includes(normalized)) &&
        (status === "all" || user.isActive === (status === "active")) &&
        (role === "all" || user.accessProfiles.some((p) => p.key === role)),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id),
    );
  const actualPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 10)),
  );
  const visible = filtered.slice((actualPage - 1) * 10, actualPage * 10);
  return (
    <div className="space-y-6">
      <div className="catalog-title-row">
        <div>
          <p className="eyebrow">MANUTENÇÃO TÉCNICA</p>
          <h1>Usuários</h1>
          <p>Gerencie contas, situação e perfis de acesso do EcoTroca.</p>
        </div>
        <div className="user-toolbar-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={remote.reload}
            disabled={busy || remote.loading}
          >
            Atualizar
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !remote.data}
            onClick={() => reveal({ mode: "create" })}
          >
            ＋ Cadastrar usuário
          </button>
        </div>
      </div>
      {success && <Message kind="success">{success}</Message>}
      {error && <Message kind="error">{error}</Message>}
      {loadingUser && (
        <p role="status" className="notice">
          Consultando dados atualizados do usuário…
        </p>
      )}
      {editor && remote.data && (
        <div ref={editorRef} tabIndex={-1} className="user-editor-anchor">
          <UserEditor
            key={editor.mode + ("user" in editor ? editor.user.id : "new")}
            editor={editor}
            profiles={remote.data.profiles}
            busy={busy}
            onClose={() => setEditor(null)}
            onConfirm={setConfirmation}
            onSaved={saved}
            onError={(message) => {
              setError(message);
              setSuccess("");
            }}
            onMode={openUser}
          />
        </div>
      )}
      <section className="catalog-card">
        <div className="catalog-toolbar">
          <div className="field-group grow">
            <label htmlFor="user-search">Buscar por nome ou e-mail</label>
            <input
              id="user-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Digite um nome ou e-mail"
            />
          </div>
          <div className="field-group">
            <label htmlFor="user-status">Situação</label>
            <select
              id="user-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todas</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="user-role">Perfil</label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todos os perfis</option>
              {PROFILE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {profileLabel(key)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {remote.loading && <LoadingState />}
        {remote.error && (
          <ListError message={remote.error} retry={remote.reload} />
        )}
        {remote.data && (
          <>
            <div
              className="table-scroll"
              role="region"
              aria-label="Lista de usuários"
              tabIndex={0}
            >
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Perfis</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.id}>
                      <td className="record-name">
                        {user.name}
                        {user.id === currentId && (
                          <span className="record-description">Sua conta</span>
                        )}
                      </td>
                      <td className="user-email">{user.email}</td>
                      <td>
                        <div className="user-role-tags">
                          {user.accessProfiles.length
                            ? user.accessProfiles.map((p) => (
                                <span className="profile-badge" key={p.key}>
                                  {profileLabel(p.key)}
                                </span>
                              ))
                            : "Nenhum perfil"}
                        </div>
                      </td>
                      <td>
                        <StatusBadge active={user.isActive} />
                      </td>
                      <td>
                        <div className="user-row-actions">
                          <button
                            type="button"
                            className="text-action"
                            disabled={busy}
                            onClick={() => void openUser(user, "view")}
                            aria-label={`Consultar ${user.name}`}
                          >
                            Consultar
                          </button>
                          <button
                            type="button"
                            className="text-action"
                            disabled={busy}
                            onClick={() => void openUser(user, "edit")}
                            aria-label={`Editar dados de ${user.name}`}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="text-action"
                            disabled={busy}
                            onClick={() => void openUser(user, "profiles")}
                            aria-label={`Alterar perfis de ${user.name}`}
                          >
                            Perfis
                          </button>
                          <button
                            type="button"
                            className="text-action"
                            disabled={busy}
                            onClick={() => requestStatus(user)}
                            aria-label={`${user.isActive ? "Desativar" : "Ativar"} ${user.name}`}
                          >
                            {user.isActive ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <p className="catalog-empty">
                Nenhum usuário corresponde aos filtros.
              </p>
            )}
            <Pagination
              page={actualPage}
              pageSize={10}
              total={filtered.length}
              onChange={setPage}
            />
          </>
        )}
      </section>
      <p className="catalog-help">
        Biblioteca e Xerox são perfis operacionais distintos. O administrador
        técnico não pode acumular nenhum deles. As alterações de dados, perfis e
        situação são confirmadas separadamente.
      </p>
      {confirmation && (
        <ConfirmDialog
          action={confirmation}
          busy={saving}
          onCancel={() => {
            if (!lock.current) setConfirmation(null);
          }}
          onConfirm={() => void confirm()}
        />
      )}
    </div>
  );
}
