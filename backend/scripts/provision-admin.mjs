import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../dist/generated/prisma/client.js';

const email = 'admin@ecotroca.test';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está configurada.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error(`O e-mail ${email} já está cadastrado; nenhuma alteração foi feita.`);
  }

  const adminProfile = await prisma.accessProfile.findUnique({
    where: { key: 'ADMIN' },
    select: { id: true },
  });
  if (!adminProfile) {
    throw new Error('O perfil ADMIN não existe no banco; nenhum usuário foi criado.');
  }

  // 32 bytes aleatórios em base64url produzem 43 caracteres sem persistir a senha.
  const password = randomBytes(32).toString('base64url');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  if (!(await argon2.verify(passwordHash, password))) {
    throw new Error('Não foi possível validar o hash gerado; nenhum usuário foi criado.');
  }

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: 'Administrador EcoTroca',
        email,
        passwordHash,
        isActive: true,
      },
      select: { id: true, email: true },
    });

    await tx.userAccessProfile.create({
      data: {
        userId: user.id,
        accessProfileId: adminProfile.id,
      },
    });

    const confirmation = await tx.user.findUnique({
      where: { id: user.id },
      select: {
        passwordHash: true,
        accessProfiles: {
          where: { accessProfileId: adminProfile.id },
          select: { accessProfile: { select: { key: true } } },
        },
      },
    });

    if (
      !confirmation?.passwordHash ||
      !(await argon2.verify(confirmation.passwordHash, password)) ||
      !confirmation.accessProfiles.some(({ accessProfile }) => accessProfile.key === 'ADMIN')
    ) {
      throw new Error('A confirmação do hash ou do perfil ADMIN falhou; transação revertida.');
    }

    return user;
  });

  process.stdout.write(`Usuário provisionado: ${created.email}\n`);
  process.stdout.write('Perfil ADMIN associado: sim\n');
  process.stdout.write('Hash Argon2id armazenado e validado: sim\n');
  process.stdout.write(`Senha (exibida uma vez): ${password}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Erro inesperado no provisionamento.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

