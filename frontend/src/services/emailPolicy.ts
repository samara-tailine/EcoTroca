import axios from "axios";
import { api } from "./api";
export const INSTITUTIONAL_EMAIL_MESSAGE =
  "O EcoTroca é de uso exclusivo da comunidade do IFSULDEMINAS. Utilize seu e-mail institucional.";
export interface EmailPolicy {
  allowedDomains: string[];
  allowLocalTestEmails: boolean;
}
export function matchesEmailPolicy(email: string, policy: EmailPolicy) {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  const domain = value.slice(value.lastIndexOf("@") + 1);
  return (
    policy.allowedDomains
      .filter((d) => d !== "ecotroca.test")
      .includes(domain) ||
    (domain === "ecotroca.test" && policy.allowLocalTestEmails)
  );
}
export async function validateInstitutionalEmail(email: string) {
  const { data } = await api.get<{ emailPolicy: EmailPolicy }>(
    "/auth/google/config",
    { params: { emailPolicyOnly: "true" } },
  );
  if (!data.emailPolicy || !matchesEmailPolicy(email, data.emailPolicy))
    throw new Error(INSTITUTIONAL_EMAIL_MESSAGE);
}
export function institutionalEmailError(error: unknown): string | null {
  const message = axios.isAxiosError(error)
    ? error.response?.data?.message
    : error instanceof Error
      ? error.message
      : null;
  return message === INSTITUTIONAL_EMAIL_MESSAGE
    ? INSTITUTIONAL_EMAIL_MESSAGE
    : null;
}

// Somente feedback antecipado. A API verifica assinatura e todos os claims de novo.
export async function validateGoogleEmail(credential: string) {
  let email: unknown;
  try {
    const encoded = credential
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    email = JSON.parse(new TextDecoder().decode(bytes)).email;
  } catch {
    throw new Error("Credencial Google inválida.");
  }
  if (typeof email !== "string") throw new Error("Credencial Google inválida.");
  await validateInstitutionalEmail(email);
}
