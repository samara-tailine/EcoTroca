import axios from "axios";
import { endSession, getSessionSnapshot } from "../auth/session";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const { session } = getSessionSnapshot();
  if (
    session &&
    config.url !== "/auth/login" &&
    config.url !== "/auth/register" &&
    config.url !== "/auth/google" &&
    config.url !== "/auth/google/config"
  ) {
    if (session.expiresAt <= Date.now()) endSession(true);
    else config.headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.url !== "/auth/login" &&
      error.config?.url !== "/auth/register" &&
      !error.config?.url?.startsWith("/auth/google") &&
      getSessionSnapshot().session
    ) {
      endSession(true);
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const current = getSessionSnapshot().session;
      if (
        current?.user.accessProfiles.some((p) => p.key === "ADMIN") &&
        /^\/(users|categories|equipment)(?:\/|$)/.test(error.config?.url ?? "")
      )
        endSession(true);
      else if (typeof window !== "undefined")
        window.dispatchEvent(new Event("ecotroca:permissions-changed"));
    }
    return Promise.reject(error);
  },
);
