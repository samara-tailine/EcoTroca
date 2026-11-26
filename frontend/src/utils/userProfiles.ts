export const PROFILE_KEYS = ["STUDENT", "LIBRARY", "XEROX", "ADMIN"] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];
export function profileCombinationError(
  keys: readonly string[],
): string | null {
  if (keys.some((key) => !PROFILE_KEYS.includes(key as ProfileKey)))
    return "Selecione apenas perfis disponíveis.";
  if (new Set(keys).size !== keys.length)
    return "Selecione cada perfil apenas uma vez.";
  if (
    keys.includes("ADMIN") &&
    (keys.includes("LIBRARY") || keys.includes("XEROX"))
  )
    return "Administrador técnico não pode acumular os perfis da Biblioteca ou da Xerox.";
  if (keys.includes("LIBRARY") && keys.includes("XEROX"))
    return "Administrador da Biblioteca e Administrador da Xerox não podem coexistir na mesma conta.";
  return null;
}
export function userFieldsError(
  name: string,
  email: string,
  studentIdentifier: string,
  password?: string,
): string | null {
  if (!name.trim() || name.trim().length > 160)
    return "Informe um nome com até 160 caracteres.";
  if (
    email.trim().length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )
    return "Informe um e-mail válido.";
  if (studentIdentifier.trim().length > 64)
    return "A identificação do estudante deve ter até 64 caracteres.";
  if (password !== undefined && (password.length < 12 || password.length > 128))
    return "A senha inicial deve ter de 12 a 128 caracteres.";
  return null;
}
