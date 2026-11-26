import {
  validateInstitutionalEmail,
  institutionalEmailError,
} from "./emailPolicy";
import axios from "axios";
import { api } from "./api";
import { getSessionSnapshot, synchronizeSessionUser } from "../auth/session";
import type { ProfileKey } from "../utils/userProfiles";

export interface UserProfile {
  id: string;
  key: ProfileKey;
  name: string;
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  studentIdentifier: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  accessProfiles: UserProfile[];
}
export interface UserInput {
  name: string;
  email: string;
  studentIdentifier?: string | null;
}
export interface CreateUserInput extends UserInput {
  password: string;
  accessProfileKeys: ProfileKey[];
}

// Guarda somente campos permitidos: senhas, hashes e identificadores Google não entram no estado da tela.
export function safeAdminUser(user: AdminUser): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    studentIdentifier: user.studentIdentifier ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accessProfiles: user.accessProfiles.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
    })),
  };
}
function notifyChange(user: AdminUser, expectedToken?: string) {
  synchronizeSessionUser(user, expectedToken);
  window.dispatchEvent(
    new CustomEvent("ecotroca:permissions-changed", {
      detail: { userId: user.id },
    }),
  );
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("ecotroca:permissions");
    channel.postMessage({ userId: user.id });
    channel.close();
  }
}
async function mutation(action: () => Promise<{ data: AdminUser }>) {
  const token = getSessionSnapshot().session?.accessToken;
  const user = safeAdminUser((await action()).data);
  notifyChange(user, token);
  return user;
}
export const usersApi = {
  list: async (signal?: AbortSignal) =>
    (await api.get<AdminUser[]>("/users", { signal })).data.map(safeAdminUser),
  get: async (id: string, signal?: AbortSignal) =>
    safeAdminUser(
      (await api.get<AdminUser>(`/users/${encodeURIComponent(id)}`, { signal }))
        .data,
    ),
  profiles: async (signal?: AbortSignal) =>
    (await api.get<UserProfile[]>("/users/access-profiles", { signal })).data,
  create: (input: CreateUserInput) =>
    mutation(async () => {
      await validateInstitutionalEmail(input.email);
      return api.post<AdminUser>("/users", {
        name: input.name,
        email: input.email,
        studentIdentifier: input.studentIdentifier,
        password: input.password,
        accessProfileKeys: input.accessProfileKeys,
      });
    }),
  update: (id: string, input: UserInput) =>
    mutation(async () => {
      await validateInstitutionalEmail(input.email);
      return api.patch<AdminUser>(`/users/${encodeURIComponent(id)}`, {
        name: input.name,
        email: input.email,
        studentIdentifier: input.studentIdentifier,
      });
    }),
  setProfiles: (id: string, accessProfileKeys: ProfileKey[]) =>
    mutation(() =>
      api.put<AdminUser>(`/users/${encodeURIComponent(id)}/access-profiles`, {
        accessProfileKeys,
      }),
    ),
  setStatus: (id: string, isActive: boolean) =>
    mutation(() =>
      api.patch<AdminUser>(`/users/${encodeURIComponent(id)}/status`, {
        isActive,
      }),
    ),
};
export function usersError(cause: unknown): string {
  const restriction = institutionalEmailError(cause);
  if (restriction) return restriction;
  if (!axios.isAxiosError(cause))
    return "Não foi possível concluir a operação.";
  if (!cause.response)
    return "Não foi possível confirmar a operação. Verifique sua conexão e atualize a lista antes de tentar novamente.";
  if (cause.response.status === 401)
    return "Sua sessão expirou. Entre novamente.";
  if (cause.response.status === 403)
    return "Seu perfil não possui mais acesso à administração de usuários.";
  if (cause.response.status === 404)
    return "Usuário não encontrado. Atualize a lista.";
  if ([400, 409].includes(cause.response.status)) {
    const message: unknown = cause.response.data?.message;
    if (typeof message === "string") return message;
  }
  return "Não foi possível salvar. Confira os dados, os perfis selecionados e tente novamente.";
}
