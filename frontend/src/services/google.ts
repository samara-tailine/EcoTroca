import { validateGoogleEmail, institutionalEmailError } from "./emailPolicy";
import axios from "axios";
import { api } from "./api";
export type GoogleConfiguration =
  { enabled: false } | { enabled: true; clientId: string; nonce: string };
export const googleApi = {
  configuration: async () =>
    (
      await api.get<GoogleConfiguration>("/auth/google/config", {
        withCredentials: true,
      })
    ).data,
  link: async (credential: string, password: string) => {
    await validateGoogleEmail(credential);
    await api.post(
      "/auth/google/link",
      { credential, password },
      { withCredentials: true },
    );
  },
  status: async (signal?: AbortSignal) =>
    (
      await api.get<{ linked: boolean; canLink: boolean }>(
        "/auth/google/status",
        { signal },
      )
    ).data,
};
export function googleError(cause: unknown): string {
  const restriction = institutionalEmailError(cause);
  if (restriction) return restriction;
  if (!axios.isAxiosError(cause))
    return "Não foi possível continuar com o Google. Tente novamente.";
  if (!cause.response)
    return "Não foi possível conectar. Confira sua conexão e tente novamente.";
  const message: unknown = cause.response.data?.message;
  if (
    [400, 401, 409, 503].includes(cause.response.status) &&
    typeof message === "string"
  )
    return message;
  return "Não foi possível autenticar com o Google. Tente novamente.";
}
interface GoogleId {
  initialize(options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
    ux_mode: "popup";
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "rectangular";
      locale: "pt-BR";
      width: number;
    },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}
let scriptPromise: Promise<GoogleId> | null = null;
export function loadGoogleIdentity(): Promise<GoogleId> {
  if (window.google?.accounts.id)
    return Promise.resolve(window.google.accounts.id);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      scriptPromise = null;
      reject(new Error("Google indisponível"));
    };
    script.src = "https://accounts.google.com/gsi/client?hl=pt-BR";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.google?.accounts.id) resolve(window.google.accounts.id);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptPromise;
}
