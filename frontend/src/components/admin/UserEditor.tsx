import { useState } from "react";
import type { FormEvent } from "react";
import { profileLabel } from "../../auth/profileLabels";
import { useAuth } from "../../auth/AuthContext";
import { formatDate } from "../../utils/studentFormat";
import {
  profileCombinationError,
  userFieldsError,
} from "../../utils/userProfiles";
import type { ProfileKey } from "../../utils/userProfiles";
import { usersApi } from "../../services/users";
import type { AdminUser, UserProfile } from "../../services/users";
import { ProfilePicker } from "./ProfilePicker";
import type { Confirmation } from "./ConfirmDialog";
import { StatusBadge } from "./CatalogUI";

export type UserEditorMode =
  { mode: "create" } | { mode: "view" | "edit" | "profiles"; user: AdminUser };
export function UserEditor({
  editor,
  profiles,
  busy,
  onClose,
  onConfirm,
  onSaved,
  onError,
  onMode,
}: {
  editor: UserEditorMode;
  profiles: UserProfile[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (action: Confirmation) => void;
  onSaved: (user: AdminUser, message: string) => void;
  onError: (message: string) => void;
  onMode: (user: AdminUser, mode: "edit" | "profiles") => void;
}) {
  const { session } = useAuth();
  const user = editor.mode === "create" ? null : editor.user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [studentIdentifier, setStudentIdentifier] = useState(
    user?.studentIdentifier ?? "",
  );
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<ProfileKey[]>(
    user?.accessProfiles.map((p) => p.key) ?? ["STUDENT"],
  );
  const title =
    editor.mode === "create"
      ? "Cadastrar usuário"
      : editor.mode === "edit"
        ? "Editar dados do usuário"
        : editor.mode === "profiles"
          ? "Atribuir e remover perfis"
          : "Dados do usuário";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const changingProfiles =
      editor.mode === "create" || editor.mode === "profiles";
    const validation =
      (changingProfiles ? profileCombinationError(selected) : null) ??
      (editor.mode !== "profiles"
        ? userFieldsError(
            name,
            email,
            studentIdentifier,
            editor.mode === "create" ? password : undefined,
          )
        : null);
    if (validation) {
      onError(validation);
      return;
    }
    if (
      changingProfiles &&
      selected.some((key) => !profiles.some((p) => p.key === key))
    ) {
      onError("Remova os perfis indisponíveis antes de salvar.");
      return;
    }
    const self = user?.id === session?.user.id;
    const revoked = self && !selected.includes("ADMIN");
    if (editor.mode === "profiles" && user) {
      const keys = [...selected];
      onConfirm({
        title: "Confirmar alteração de perfis",
        description: `Alterar os perfis de ${user.name} de ${user.accessProfiles.map((p) => profileLabel(p.key)).join(", ") || "nenhum"} para ${keys.map(profileLabel).join(", ") || "nenhum"}?${revoked ? " Você perderá seu próprio acesso administrativo e será levado à sua conta." : ""}`,
        confirmText: "Salvar perfis",
        run: async () =>
          onSaved(
            await usersApi.setProfiles(user.id, keys),
            "Perfis atualizados com sucesso.",
          ),
      });
      return;
    }
    const input = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      studentIdentifier: studentIdentifier.trim() || null,
    };
    if (editor.mode === "create") {
      const initialPassword = password,
        keys = [...selected];
      onConfirm({
        title: "Confirmar cadastro",
        description: `Criar a conta de ${input.name} (${input.email}) com os perfis ${keys.map(profileLabel).join(", ") || "nenhum"}?`,
        confirmText: "Criar usuário",
        run: async () =>
          onSaved(
            await usersApi.create({
              ...input,
              studentIdentifier: input.studentIdentifier ?? undefined,
              password: initialPassword,
              accessProfileKeys: keys,
            }),
            "Usuário cadastrado com sucesso.",
          ),
      });
    } else if (user) {
      onConfirm({
        title: "Confirmar edição",
        description: `Salvar os dados de ${user.name}? Os perfis e a senha não serão alterados.`,
        confirmText: "Salvar dados",
        run: async () =>
          onSaved(
            await usersApi.update(user.id, input),
            "Dados atualizados com sucesso.",
          ),
      });
    }
  }
  return (
    <section
      className="catalog-card catalog-form user-editor"
      aria-labelledby="user-editor-title"
    >
      <h2 id="user-editor-title">{title}</h2>
      {editor.mode === "view" && user ? (
        <>
          <dl className="student-data-grid">
            <div>
              <dt>Nome</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Perfis</dt>
              <dd>
                {user.accessProfiles
                  .map((p) => profileLabel(p.key))
                  .join(", ") || "Nenhum perfil"}
              </dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>
                <StatusBadge active={user.isActive} />
              </dd>
            </div>
            <div>
              <dt>Identificação do estudante</dt>
              <dd>{user.studentIdentifier || "Não informada"}</dd>
            </div>
            <div>
              <dt>Identificador da conta</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt>Criado em</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Atualizado em</dt>
              <dd>{formatDate(user.updatedAt)}</dd>
            </div>
          </dl>
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={onClose}
            >
              Fechar
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => onMode(user, "profiles")}
            >
              Alterar perfis
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => onMode(user, "edit")}
            >
              Editar dados
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={busy}>
          <fieldset className="student-form-fieldset space-y-5" disabled={busy}>
            {editor.mode !== "profiles" && (
              <div className="user-form-grid">
                <div className="field-group">
                  <label htmlFor="admin-user-name">Nome completo *</label>
                  <input
                    id="admin-user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={160}
                    autoComplete="off"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="admin-user-email">E-mail *</label>
                  <input
                    id="admin-user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={320}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="admin-user-identifier">
                    Identificação do estudante (opcional)
                  </label>
                  <input
                    id="admin-user-identifier"
                    value={studentIdentifier}
                    onChange={(e) => setStudentIdentifier(e.target.value)}
                    maxLength={64}
                    autoComplete="off"
                  />
                </div>
                {editor.mode === "create" && (
                  <div className="field-group">
                    <label htmlFor="admin-user-password">Senha inicial *</label>
                    <input
                      id="admin-user-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      aria-describedby="admin-user-password-help"
                    />
                    <p id="admin-user-password-help" className="field-help">
                      Use de 12 a 128 caracteres. A senha não será exibida na
                      listagem nem nos detalhes.
                    </p>
                  </div>
                )}
              </div>
            )}
            {(editor.mode === "create" || editor.mode === "profiles") && (
              <ProfilePicker
                profiles={profiles}
                selected={selected}
                onChange={setSelected}
              />
            )}
          </fieldset>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {editor.mode === "create"
                ? "Cadastrar usuário"
                : editor.mode === "profiles"
                  ? "Salvar perfis"
                  : "Salvar dados"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
