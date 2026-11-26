import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
export function ProtectedRoute() {
  const { session, refreshPermissions } = useAuth();
  const { pathname } = useLocation();
  const [verified, setVerified] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const identity = (session?.accessToken ?? "") + ":" + pathname;
  useEffect(() => {
    let active = true;
    setError(false);
    if (!session) return;
    void refreshPermissions().then((ok) => {
      if (active) {
        if (ok) setVerified(identity);
        else setError(true);
      }
    });
    return () => {
      active = false;
    };
  }, [identity, refreshPermissions, retry]);
  if (!session || session.expiresAt <= Date.now())
    return <Navigate to="/login" replace />;
  if (error)
    return (
      <main className="home-content">
        <p role="alert">
          Não foi possível confirmar suas permissões. Verifique a conexão.
        </p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setRetry((v) => v + 1)}
        >
          Tentar novamente
        </button>
      </main>
    );
  if (verified !== identity)
    return (
      <main className="home-content">
        <p role="status">Verificando sessão e permissões…</p>
      </main>
    );
  return <Outlet />;
}
