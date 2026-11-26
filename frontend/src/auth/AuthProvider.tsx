import {
  validateInstitutionalEmail,
  validateGoogleEmail,
} from "../services/emailPolicy";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { api } from "../services/api";
import { AuthContext } from "./AuthContext";
import type { LoginResponse, SessionUser } from "./auth.types";
import {
  endSession,
  getSessionSnapshot,
  startSession,
  subscribeSession,
  synchronizeSessionUser,
} from "./session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, expired } = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
  );
  const [permissionsError, setPermissionsError] = useState("");
  const flight = useRef<{
    token: string;
    promise: Promise<boolean>;
    id: symbol;
  } | null>(null);
  const refreshPermissions = useCallback(async (): Promise<boolean> => {
    const captured = getSessionSnapshot().session;
    if (!captured) return false;
    if (captured.expiresAt <= Date.now()) {
      endSession(true);
      return false;
    }
    if (flight.current?.token === captured.accessToken)
      return flight.current.promise;
    const requestId = Symbol();
    const task: Promise<boolean> = (async () => {
      try {
        const { data } = await api.get<SessionUser & { isActive: boolean }>(
          "/auth/me",
        );
        if (getSessionSnapshot().session?.accessToken !== captured.accessToken)
          return false;
        // Uma resposta iniciada antes de uma alteração própria não pode reverter os novos perfis.
        if (
          getSessionSnapshot().session === captured &&
          !synchronizeSessionUser(data, captured.accessToken)
        )
          return false;
        setPermissionsError("");
        return !!getSessionSnapshot().session;
      } catch {
        if (getSessionSnapshot().session?.accessToken === captured.accessToken)
          setPermissionsError("Não foi possível confirmar suas permissões.");
        return false;
      } finally {
        if (flight.current?.id === requestId) flight.current = null;
      }
    })();
    flight.current = {
      token: captured.accessToken,
      promise: task,
      id: requestId,
    };
    return task;
  }, []);
  useEffect(() => {
    if (!session) {
      setPermissionsError("");
      return;
    }
    const checkExpiry = () => {
      if (session.expiresAt <= Date.now()) endSession(true);
    };
    const timer = window.setTimeout(
      checkExpiry,
      Math.max(0, session.expiresAt - Date.now()),
    );
    window.addEventListener("focus", checkExpiry);
    document.addEventListener("visibilitychange", checkExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [session]);
  const token = session?.accessToken;
  useEffect(() => {
    if (!token) return;
    const refresh = () => {
      if (document.visibilityState !== "hidden") void refreshPermissions();
    };
    const notify = (event: Event) => {
      const userId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      if (!userId || userId === getSessionSnapshot().session?.user.id)
        refresh();
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("ecotroca:permissions")
        : null;
    if (channel)
      channel.onmessage = (event) => {
        if (event.data?.userId === getSessionSnapshot().session?.user.id)
          refresh();
      };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("ecotroca:permissions-changed", notify);
    refresh();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("ecotroca:permissions-changed", notify);
      channel?.close();
    };
  }, [token, refreshPermissions]);
  async function login(email: string, password: string) {
    await validateInstitutionalEmail(email);
    const { data } = await api.post<LoginResponse>("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });
    setPermissionsError("");
    startSession(data);
  }
  async function googleLogin(credential: string) {
    await validateGoogleEmail(credential);
    const { data } = await api.post<LoginResponse>(
      "/auth/google",
      { credential },
      { withCredentials: true },
    );
    setPermissionsError("");
    startSession(data);
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        expired,
        permissionsError,
        refreshPermissions,
        login,
        googleLogin,
        logout: () => endSession(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
