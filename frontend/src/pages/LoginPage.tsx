import { institutionalEmailError } from "../services/emailPolicy";
import { GoogleButton } from "../components/GoogleButton";
import { Icon } from "../components/Icon";
import { canUseXerox } from "../auth/xeroxPermission";
import { canUseLibrary } from "../auth/libraryPermission";
import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link, Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";

function loginError(error: unknown): string {
  const restriction = institutionalEmailError(error);
  if (restriction) return restriction;
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "Não foi possível conectar à API. Verifique sua conexão e tente novamente.";
    if (error.response.status === 401)
      return "E-mail ou senha inválidos. Confira seus dados e tente novamente.";
    if (error.response.status === 400)
      return "Verifique o formato do e-mail e os dados informados.";
    if (error.response.status === 429)
      return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
    return "Não foi possível entrar agora. Tente novamente em instantes.";
  }
  return "Não foi possível iniciar a sessão. Tente entrar novamente.";
}

export function LoginPage() {
  const { session, expired, login, googleLogin } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session && session.expiresAt > Date.now())
    return (
      <Navigate
        to={
          session.user.accessProfiles.some(({ key }) => key === "ADMIN")
            ? "/admin/categories"
            : session.user.accessProfiles.some(({ key }) => key === "STUDENT")
              ? "/student"
              : canUseLibrary(session.user.accessProfiles.map(({ key }) => key))
                ? "/library/disposals"
                : canUseXerox(session.user.accessProfiles.map(({ key }) => key))
                  ? "/xerox/payments"
                  : "/"
        }
        replace
      />
    );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || googleBusy) return;
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
      setPassword("");
    } catch (cause) {
      setError(loginError(cause));
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <header className="page-header">
        <Brand />
        <span className="header-caption">Um novo ciclo começa aqui.</span>
      </header>

      <main className="login-layout">
        <section
          className="intro-panel"
          aria-label="EcoTroca: o fim do seu eletrônico é o começo de um novo ciclo."
        >
          <div className="login-brand-large">
            <Brand />
          </div>
        </section>

        <section className="login-form-panel" aria-labelledby="login-title">
          <div className="login-form-content">
            <p className="eyebrow">BEM-VINDO AO ECOTROCA</p>
            <h2 id="login-title">Entrar no EcoTroca</h2>
            <p className="form-intro">Acesse sua conta para continuar.</p>

            {expired && !error && (
              <p className="notice" role="status">
                Sua sessão expirou ou foi encerrada. Entre novamente para
                continuar.
              </p>
            )}
            {error && (
              <p id="login-error" className="error-message" role="alert">
                {error}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="login-form"
              aria-describedby={error ? "login-error" : undefined}
              aria-busy={isSubmitting}
            >
              <div className="field-group">
                <label htmlFor="email">
                  <Icon name="mail" />
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  maxLength={320}
                  disabled={isSubmitting || googleBusy}
                />
              </div>
              <div className="field-group">
                <label htmlFor="password">
                  <Icon name="lock" />
                  Senha
                </label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    maxLength={128}
                    disabled={isSubmitting || googleBusy}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting || googleBusy}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      {showPassword && (
                        <path
                          d="m4 3 16 18"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting || googleBusy}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Entrando…
                  </>
                ) : (
                  <>
                    Entrar <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>
            <div className="auth-divider">
              <span>ou</span>
            </div>
            <GoogleButton
              onCredential={googleLogin}
              disabled={isSubmitting}
              onBusyChange={setGoogleBusy}
            />
            <p className="login-hint">
              Use o e-mail e a senha da sua conta EcoTroca.
            </p>
            <p className="login-hint">
              Não tem uma conta?{" "}
              <Link className="text-action" to="/register">
                Cadastre-se
              </Link>
            </p>
          </div>
          <p className="form-footer">
            <span className="small-dot" /> Juntos, damos um novo destino ao que
            importa.
          </p>
        </section>
      </main>
      <footer className="page-footer">
        <span>EcoTroca</span>
        <span>Conexões que renovam.</span>
      </footer>
    </div>
  );
}
