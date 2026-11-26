import {
  validateInstitutionalEmail,
  institutionalEmailError,
} from "./emailPolicy";
import axios from "axios";
import { api } from "./api";
import { registrationPayload } from "../utils/registration";
import type { RegistrationFields } from "../utils/registration";
export async function registerStudent(
  fields: RegistrationFields,
): Promise<void> {
  await validateInstitutionalEmail(fields.email);
  await api.post("/auth/register", registrationPayload(fields));
}
export function registrationApiError(error: unknown): string {
  const restriction = institutionalEmailError(error);
  if (restriction) return restriction;
  if (!axios.isAxiosError(error))
    return "Não foi possível criar a conta. Tente novamente.";
  if (!error.response)
    return "Não foi possível confirmar o cadastro. Verifique sua conexão. Se a conta já foi criada, tente entrar.";
  switch (error.response.status) {
    case 409:
      return "Este e-mail já está cadastrado. Entre na sua conta ou utilize outro e-mail.";
    case 400:
      return "Confira os dados: nome obrigatório, e-mail válido e senha de 12 a 128 caracteres.";
    case 429:
      return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
    default:
      return "Não foi possível criar a conta agora. Tente novamente em instantes.";
  }
}
