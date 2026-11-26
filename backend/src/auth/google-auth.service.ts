import { assertInstitutionalEmail } from './email-domain.policy.js';
import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GoogleTokenService } from './google-token.service.js';
import { verifyPassword } from './password-hasher.js';
import type { AuthenticatedUser } from './auth.types.js';
import { AuthService } from './auth.service.js';
const linkRequired = () =>
  new ConflictException(
    'Este e-mail já está cadastrado. Entre com sua senha e vincule o Google em Dados da conta.',
  );
@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: GoogleTokenService,
    private readonly auth: AuthService,
  ) {}
  async login(credential: string, nonce: string) {
    const identity = await this.tokens.verify(credential, nonce);
    assertInstitutionalEmail(identity.email, true);
    let userId: string;
    try {
      userId = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'google:' + identity.subject},0))::text`;
        const linked = await tx.user.findUnique({
          where: { googleSubject: identity.subject },
          select: { id: true, email: true, isActive: true },
        });
        if (linked) {
          assertInstitutionalEmail(linked.email, true);
          if (!linked.isActive)
            throw new UnauthorizedException('Esta conta está desativada.');
          return linked.id;
        }
        if (
          await tx.user.findFirst({
            where: { email: { equals: identity.email, mode: 'insensitive' } },
            select: { id: true },
          })
        )
          throw linkRequired();
        const profile = await tx.accessProfile.findUnique({
          where: { key: 'STUDENT' },
          select: { id: true, isActive: true },
        });
        if (!profile?.isActive)
          throw new ServiceUnavailableException(
            'O cadastro de estudantes não está disponível agora.',
          );
        const created = await tx.user.create({
          data: {
            name: identity.name,
            email: identity.email,
            googleSubject: identity.subject,
            accessProfiles: { create: { accessProfileId: profile.id } },
          },
          select: { id: true },
        });
        return created.id;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw linkRequired();
      throw error;
    }
    return this.auth.createSession(userId);
  }
  async status(actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { googleSubject: true, passwordHash: true, isActive: true },
    });
    if (!user?.isActive)
      throw new UnauthorizedException('Conta inválida ou inativa.');
    return {
      linked: !!user.googleSubject,
      canLink: !!user.passwordHash && !user.googleSubject,
    };
  }
  async link(
    actor: AuthenticatedUser,
    credential: string,
    password: string,
    nonce: string,
  ) {
    const identity = await this.tokens.verify(credential, nonce);
    assertInstitutionalEmail(identity.email, true);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${actor.id}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: actor.id },
          select: {
            email: true,
            passwordHash: true,
            isActive: true,
            googleSubject: true,
          },
        });
        let valid = false;
        if (user?.isActive && user.passwordHash) {
          try {
            valid = await verifyPassword(user.passwordHash, password);
          } catch {
            valid = false;
          }
        }
        if (!valid || !user)
          throw new UnauthorizedException(
            'Confirme a senha atual da sua conta para vincular o Google.',
          );
        assertInstitutionalEmail(user.email, true);
        if (user.email.trim().toLowerCase() !== identity.email)
          throw new ConflictException(
            'Escolha a conta Google com o mesmo e-mail da sua conta EcoTroca.',
          );
        if (user.googleSubject && user.googleSubject !== identity.subject)
          throw new ConflictException(
            'Esta conta já possui outro vínculo Google.',
          );
        const existing = await tx.user.findUnique({
          where: { googleSubject: identity.subject },
          select: { id: true },
        });
        if (existing && existing.id !== actor.id)
          throw new ConflictException(
            'Esta identidade Google já está vinculada a outra conta.',
          );
        await tx.user.update({
          where: { id: actor.id },
          data: { googleSubject: identity.subject },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Esta identidade Google já está vinculada a outra conta.',
        );
      throw error;
    }
    return { message: 'Conta Google vinculada com sucesso.' };
  }
}
