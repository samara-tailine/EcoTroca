import { GoogleButton } from "../components/GoogleButton";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import {
  registerStudent,
  registrationApiError,
} from "../services/registration";
import { registrationError } from "../utils/registration";
import type { RegistrationFields } from "../utils/registration";

const empty: RegistrationFields = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};
export function RegisterPage() {
  const { session, googleLogin } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  const navigate = useNavigate();
  const [fields, setFields] = useState<RegistrationFields>(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const lock = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(
      () => navigate("/login", { replace: true }),
      2500,
    );
    return () => window.clearTimeout(timeout);
  }, [success, navigate]);
  useEffect(() => {
    if (error || success) feedback.current?.focus();
  }, [error, success]);
  if (session && session.expiresAt > Date.now())
    return <Navigate to="/login" replace />;
  const change = (key: keyof RegistrationFields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || success || googleBusy) return;
    setError("");
    const validation = registrationError(fields);
    if (validation) {
      setError(validation);
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await registerStudent(fields);
      setFields(empty);
      setSuccess(true);
    } catch (cause) {
      setError(registrationApiError(cause));
      setFields((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="login-page register-page">
      <main className="login-layout">
        <section className="intro-panel" aria-label="EcoTroca">
          <div className="login-brand-large">
            <Brand />
          </div>
        </section>
        <section className="login-form-panel" aria-labelledby="register-title">
          <div className="login-form-content">
            <p className="eyebrow">BEM-VINDO AO ECOTROCA</p>
            <h2 id="register-title">Crie sua conta</h2>
            <p className="form-intro">
              Cadastre-se como estudante e participe dessa mudança.
            </p>
            {success ? (
              <>
                <p
                  ref={feedback}
                  className="catalog-message success"
                  role="status"
                  tabIndex={-1}
                >
                  Conta criada com sucesso! Você será direcionado para entrar.
                </p>
                <Link className="primary-button" to="/login" replace>
                  Ir para o login
                </Link>
              </>
            ) : (
              <>
                {error && (
                  <p
                    ref={feedback}
                    id="register-error"
                    className="error-message"
                    role="alert"
                    tabIndex={-1}
                  >
                    {error}
                  </p>
                )}
                <form
                  className="login-form"
                  noValidate
                  onSubmit={submit}
                  aria-describedby={error ? "register-error" : undefined}
                  aria-busy={busy}
                >
                  <div className="field-group">
                    <label htmlFor="register-name">
                      <Icon name="user" />
                      Nome completo
                    </label>
                    <input
                      id="register-name"
                      name="name"
                      value={fields.name}
                      onChange={(e) => change("name", e.target.value)}
                      required
                      maxLength={160}
                      autoComplete="name"
                      placeholder="Seu nome completo"
                      disabled={busy || googleBusy}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="register-email">
                      <Icon name="mail" />
                      E-mail
                    </label>
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      value={fields.email}
                      onChange={(e) => change("email", e.target.value)}
                      required
                      maxLength={320}
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="seu@email.com"
                      disabled={busy || googleBusy}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="register-password">
                      <Icon name="lock" />
                      Senha
                    </label>
                    <input
                      id="register-password"
                      name="password"
                      type="password"
                      value={fields.password}
                      onChange={(e) => change("password", e.target.value)}
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Crie uma senha"
                      aria-describedby="register-password-help"
                      disabled={busy || googleBusy}
                    />
                    <p id="register-password-help" className="field-help">
                      Utilize de 12 a 128 caracteres.
                    </p>
                  </div>
                  <div className="field-group">
                    <label htmlFor="register-confirm">
                      <Icon name="lock" />
                      Confirmar senha
                    </label>
                    <input
                      id="register-confirm"
                      name="confirmPassword"
                      type="password"
                      value={fields.confirmPassword}
                      onChange={(e) =>
                        change("confirmPassword", e.target.value)
                      }
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Digite a senha novamente"
                      disabled={busy || googleBusy}
                    />
                  </div>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={busy || googleBusy}
                  >
                    {busy ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Criando conta…
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </button>
                </form>
                <div className="auth-divider">
                  <span>ou</span>
                </div>
                <GoogleButton
                  onCredential={googleLogin}
                  disabled={busy}
                  onBusyChange={setGoogleBusy}
                />
              </>
            )}
            <p className="login-hint">
              Já tem uma conta?{" "}
              <Link className="text-action" to="/login">
                Entrar
              </Link>
            </p>
          </div>
        </section>
      </main>
      <footer className="page-footer">
        <span>EcoTroca</span>
        <span>Conexões que renovam.</span>
      </footer>
    </div>
  );
}
