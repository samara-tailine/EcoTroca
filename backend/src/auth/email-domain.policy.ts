import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { isEmail } from 'class-validator';

export const INSTITUTIONAL_EMAIL_MESSAGE =
  'O EcoTroca é de uso exclusivo da comunidade do IFSULDEMINAS. Utilize seu e-mail institucional.';
const defaults = ['alunos.ifsuldeminas.edu.br', 'ifsuldeminas.edu.br'];
function loopback(value: string | undefined, fallback: string) {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(
      new URL(value ?? fallback).hostname,
    );
  } catch {
    return false;
  }
}
export function emailDomainConfiguration() {
  const configured = process.env.ALLOWED_EMAIL_DOMAINS;
  const domains =
    configured === undefined
      ? defaults
      : configured.split(',').map((v) => v.trim().toLowerCase());
  if (
    domains.some(
      (v) =>
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
          v,
        ),
    )
  )
    throw new Error(
      'ALLOWED_EMAIL_DOMAINS deve conter domínios exatos separados por vírgula.',
    );
  // O domínio de demonstração nunca é liberado pela lista comum, nem em produção.
  const allowedDomains = [
    ...new Set(domains.filter((v) => v !== 'ecotroca.test')),
  ];
  const allowLocalTestEmails =
    process.env.ALLOW_LOCAL_TEST_EMAILS === 'true' &&
    process.env.NODE_ENV === 'development' &&
    loopback(process.env.DATABASE_URL, 'invalid:') &&
    loopback(process.env.FRONTEND_ORIGIN, 'http://localhost:5173');
  return { allowedDomains, allowLocalTestEmails };
}
export function isInstitutionalEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  if (!isEmail(value) || value.length > 320) return false;
  const domain = value.slice(value.lastIndexOf('@') + 1);
  const policy = emailDomainConfiguration();
  return (
    policy.allowedDomains.includes(domain) ||
    (domain === 'ecotroca.test' && policy.allowLocalTestEmails)
  );
}
export function assertInstitutionalEmail(
  email: string,
  unauthorized = false,
): void {
  if (!isInstitutionalEmail(email)) {
    if (unauthorized)
      throw new UnauthorizedException(INSTITUTIONAL_EMAIL_MESSAGE);
    throw new BadRequestException(INSTITUTIONAL_EMAIL_MESSAGE);
  }
}
