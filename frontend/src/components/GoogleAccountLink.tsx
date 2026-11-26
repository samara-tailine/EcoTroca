import { useEffect, useState } from "react";
import { GoogleButton } from "./GoogleButton";
import { googleApi, googleError } from "../services/google";
export function GoogleAccountLink() {
  const [status, setStatus] = useState<{
    linked: boolean;
    canLink: boolean;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void googleApi
      .status(controller.signal)
      .then(setStatus)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(googleError(cause));
      });
    return () => controller.abort();
  }, []);
  async function link(credential: string) {
    try {
      await googleApi.link(credential, password);
      setPassword("");
      setStatus({ linked: true, canLink: false });
    } catch (cause) {
      setPassword("");
      throw cause;
    }
  }
  return (
    <section
      className="account-card google-account-link"
      aria-labelledby="google-link-title"
    >
      <h2 id="google-link-title">Acesso com Google</h2>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!status && !error && <p className="field-help">Carregando vínculo…</p>}
      {status?.linked && (
        <p className="catalog-message success" role="status">
          Sua conta Google está vinculada. Seus perfis de acesso permanecem os
          mesmos.
        </p>
      )}
      {status?.canLink && (
        <div className="space-y-4">
          <p className="field-help">
            Confirme sua senha atual e escolha a conta Google com o mesmo
            e-mail. O vínculo não altera seus perfis.
          </p>
          <div className="field-group">
            <label htmlFor="google-link-password">
              Senha atual do EcoTroca
            </label>
            <input
              id="google-link-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
              disabled={busy}
            />
          </div>
          <GoogleButton
            onCredential={link}
            disabled={!password || busy}
            onBusyChange={setBusy}
          />
        </div>
      )}
      {status && !status.linked && !status.canLink && (
        <p className="field-help">
          O vínculo exige autenticação com uma senha existente nesta conta.
        </p>
      )}
    </section>
  );
}
