import type { AuthSession, LoginResponse, SessionUser } from './auth.types';

const STORAGE_KEY = 'ecotroca.session';
const listeners = new Set<() => void>();

function tokenExpiresAt(token: string): number | null {
  try {
    // Apenas lê a validade para a interface. A assinatura e as permissões são
    // sempre verificadas pelo backend; perfis não são extraídos do JWT.
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}

function isUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<SessionUser>;
  return typeof user.id === 'string' && typeof user.name === 'string' &&
    typeof user.email === 'string' && Array.isArray(user.accessProfiles) &&
    user.accessProfiles.every((profile) => profile &&
      typeof profile.key === 'string' && typeof profile.name === 'string');
}

function cleanUser(user: SessionUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    accessProfiles: user.accessProfiles.map(({ key, name }) => ({ key, name })),
  };
}

function restoreSession(): { session: AuthSession | null; expired: boolean } {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return { session: null, expired: false };
    const parsed = JSON.parse(saved) as Partial<AuthSession>;
    const jwtExpiry = typeof parsed.accessToken === 'string' ? tokenExpiresAt(parsed.accessToken) : null;
    if (!jwtExpiry || !Number.isFinite(parsed.expiresAt) || !isUser(parsed.user)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return { session: null, expired: false };
    }
    const expiresAt = Math.min(jwtExpiry, parsed.expiresAt!);
    if (expiresAt <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return { session: null, expired: true };
    }
    return {
      session: { accessToken: parsed.accessToken!, expiresAt, user: cleanUser(parsed.user) },
      expired: false,
    };
  } catch {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* armazenamento indisponível */ }
    return { session: null, expired: false };
  }
}

let snapshot = restoreSession();

export function getSessionSnapshot() {
  return snapshot;
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(session: AuthSession | null, expired: boolean) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // A sessão continua somente em memória se o navegador bloquear o armazenamento.
  }
  snapshot = { session, expired };
  listeners.forEach((listener) => listener());
}

export function startSession(response: LoginResponse) {
  const jwtExpiry = tokenExpiresAt(response.accessToken);
  if (!jwtExpiry || !Number.isFinite(response.expiresIn) || response.expiresIn <= 0 ||
    response.tokenType !== 'Bearer' || !isUser(response.user)) {
    throw new Error('Não foi possível iniciar a sessão. Tente entrar novamente.');
  }
  const expiresAt = Math.min(jwtExpiry, Date.now() + response.expiresIn * 1000);
  if (expiresAt <= Date.now()) {
    throw new Error('A sessão recebida expirou. Tente entrar novamente.');
  }
  publish({ accessToken: response.accessToken, expiresAt, user: cleanUser(response.user) }, false);
}

export function endSession(expired = false) {
  publish(null, expired);
}