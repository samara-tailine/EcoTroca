import 'dotenv/config';
import { emitKeypressEvents } from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../dist/generated/prisma/client.js';

const email = 'admin@ecotroca.test';

class AdministrativeError extends Error {}

function readHiddenPassword(prompt) {
  const input = process.stdin;
  const output = process.stdout;
  if (!input.isTTY || !output.isTTY) {
    throw new AdministrativeError('Execute em um terminal interativo, sem redirecionar a entrada ou a saída.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const previousRaw = Boolean(input.isRaw);
    const wasPaused = input.isPaused();

    function finish(error) {
      input.removeListener('keypress', onKeypress);
      input.removeListener('end', onEnd);
      input.removeListener('error', onError);
      input.setRawMode(previousRaw);
      if (wasPaused) input.pause();
      output.write('\n');
      const result = value;
      value = '';
      if (error) reject(error);
      else resolve(result);
    }

    function onEnd() {
      finish(new AdministrativeError('Entrada encerrada; nenhuma senha foi alterada.'));
    }

    function onError() {
      finish(new AdministrativeError('Falha na leitura do terminal; nenhuma senha foi alterada.'));
    }

    function onKeypress(text, key) {
      if (key?.ctrl && (key.name === 'c' || key.name === 'd')) {
        finish(new AdministrativeError('Operação cancelada; nenhuma senha foi alterada.'));
      } else if (key?.name === 'return' || key?.name === 'enter') {
        finish();
      } else if (key?.name === 'backspace') {
        value = Array.from(value).slice(0, -1).join('');
      } else if (
        text && !key?.ctrl && !key?.meta &&
        !/[\u0000-\u001f\u007f-\u009f]/u.test(text)
      ) {
        value += text;
      }
    }

    emitKeypressEvents(input);
    input.setRawMode(true);
    input.on('keypress', onKeypress);
    input.once('end', onEnd);
    input.once('error', onError);
    output.write(prompt);
    input.resume();
  });
}

let prisma;
let password = '';
let confirmation = '';

try {
  if (!process.env.DATABASE_URL) {
    throw new AdministrativeError('DATABASE_URL não está configurada.');
  }

  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      accessProfiles: {
        where: { accessProfile: { key: 'ADMIN' } },
        select: { accessProfileId: true },
      },
    },
  });

  if (!user) {
    throw new AdministrativeError('A conta admin@ecotroca.test não existe.');
  }
  if (user.accessProfiles.length === 0) {
    throw new AdministrativeError('A conta não possui perfil ADMIN; nenhuma senha foi alterada.');
  }

  password = await readHiddenPassword('Nova senha (12 a 128 caracteres): ');
  if (password.length < 12 || password.length > 128) {
    throw new AdministrativeError('A senha deve ter entre 12 e 128 caracteres, conforme a autenticação existente.');
  }
  confirmation = await readHiddenPassword('Confirme a nova senha: ');
  if (password !== confirmation) {
    throw new AdministrativeError('As senhas não coincidem; nenhuma senha foi alterada.');
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  password = '';
  confirmation = '';

  // SQL parametrizado via Prisma evita a atualização automática de updatedAt.
  // A condição também confirma o perfil ADMIN no momento da gravação.
  const updated = await prisma.$executeRaw`
    UPDATE "User" AS u
    SET "passwordHash" = ${passwordHash}
    WHERE u."id" = ${user.id}::uuid
      AND u."email" = ${email}
      AND EXISTS (
        SELECT 1
        FROM "UserAccessProfile" AS assignment
        JOIN "AccessProfile" AS profile ON profile."id" = assignment."accessProfileId"
        WHERE assignment."userId" = u."id" AND profile."key" = 'ADMIN'
      )
  `;

  if (updated !== 1) {
    throw new AdministrativeError('A conta não existe mais ou perdeu o perfil ADMIN; nenhuma senha foi alterada.');
  }
  process.stdout.write('Senha de admin@ecotroca.test redefinida com hash Argon2id.\n');
} catch (error) {
  process.stderr.write(
    `${error instanceof AdministrativeError ? error.message : 'Não foi possível redefinir a senha. Verifique a configuração local do banco e o cliente Prisma compilado.'}\n`,
  );
  process.exitCode = 1;
} finally {
  password = '';
  confirmation = '';
  if (prisma) {
    await prisma.$disconnect().catch(() => {
      process.stderr.write('Não foi possível encerrar a conexão com o banco.\n');
      process.exitCode = 1;
    });
  }
}