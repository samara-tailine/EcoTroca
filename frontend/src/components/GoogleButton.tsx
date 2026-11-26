import { useEffect, useRef, useState } from "react";
import { googleApi, googleError, loadGoogleIdentity } from "../services/google";
export function GoogleButton({
  onCredential,
  disabled = false,
  onBusyChange,
}: {
  onCredential: (credential: string) => Promise<void>;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ onCredential, disabled, onBusyChange });
  const lock = useRef(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unconfigured, setUnconfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    current.current = { onCredential, disabled, onBusyChange };
  }, [onCredential, disabled, onBusyChange]);
  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;
    setLoading(true);
    setError("");
    setUnconfigured(false);
    async function setup() {
      try {
        const config = await googleApi.configuration();
        if (!active) return;
        if (!config.enabled) {
          setUnconfigured(true);
          setLoading(false);
          return;
        }
        const sdk = await loadGoogleIdentity();
        if (!active || !host.current) return;
        sdk.initialize({
          client_id: config.clientId,
          nonce: config.nonce,
          auto_select: false,
          ux_mode: "popup",
          callback: (response) => {
            if (!active || current.current.disabled || lock.current) return;
            lock.current = true;
            setBusy(true);
            setError("");
            current.current.onBusyChange?.(true);
            void (async () => {
              try {
                await current.current.onCredential(response.credential);
              } catch (cause) {
                if (active) setError(googleError(cause));
              } finally {
                lock.current = false;
                if (active) setBusy(false);
                current.current.onBusyChange?.(false);
              }
            })();
          },
        });
        let lastWidth = 0;
        const render = () => {
          if (!active || !host.current) return;
          const width = Math.min(
            400,
            Math.max(
              200,
              Math.floor(host.current.getBoundingClientRect().width),
            ),
          );
          if (width === lastWidth) return;
          lastWidth = width;
          host.current.replaceChildren();
          sdk.renderButton(host.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            locale: "pt-BR",
            width,
          });
        };
        render();
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(render);
          observer.observe(host.current);
        }
        setLoading(false);
      } catch (cause) {
        if (active) {
          setError(googleError(cause));
          setLoading(false);
        }
      }
    }
    void setup();
    return () => {
      active = false;
      observer?.disconnect();
      host.current?.replaceChildren();
    };
  }, [revision]);
  return (
    <div className="google-signin">
      <div
        ref={host}
        className="google-button-host"
        inert={disabled || busy || loading || !!error}
        aria-disabled={disabled || busy || loading || !!error}
      />
      {loading && (
        <p className="field-help" role="status">
          Carregando acesso com Google…
        </p>
      )}
      {unconfigured && (
        <p className="field-help">
          O acesso com Google ainda não está configurado.
        </p>
      )}
      {busy && (
        <p className="field-help" role="status">
          Validando acesso com Google…
        </p>
      )}
      {error && (
        <>
          <p className="error-message" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="text-action"
            disabled={disabled || busy}
            onClick={() => setRevision((v) => v + 1)}
          >
            Tentar novamente com Google
          </button>
        </>
      )}
    </div>
  );
}
