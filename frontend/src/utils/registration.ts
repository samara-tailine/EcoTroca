export interface RegistrationFields {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export function registrationError(fields: RegistrationFields): string | null {
  if (
    !fields.name.trim() ||
    !fields.email.trim() ||
    !fields.password ||
    !fields.confirmPassword
  )
    return "Preencha todos os campos.";
  if (fields.name.trim().length > 160)
    return "O nome deve ter até 160 caracteres.";
  if (
    fields.email.trim().length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
  )
    return "Informe um e-mail válido.";
  if (fields.password.length < 12 || fields.password.length > 128)
    return "A senha deve ter de 12 a 128 caracteres.";
  if (fields.password !== fields.confirmPassword)
    return "As senhas não coincidem.";
  return null;
}
export function registrationPayload(fields: RegistrationFields) {
  return {
    name: fields.name.trim(),
    email: fields.email.trim().toLowerCase(),
    password: fields.password,
  };
}
