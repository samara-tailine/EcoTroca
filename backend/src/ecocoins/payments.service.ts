import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { ListMovementsDto } from './dto/list-movements.dto.js';
import {
  ECOCOIN_AMOUNT_PATTERN,
  ECOCOIN_VALUE_BRL,
  MAX_ECOCOIN_BALANCE,
} from './ecocoin.constants.js';

type Payment = Prisma.EcoCoinPaymentGetPayload<object>;
const legacyInclude = {
  wallet: {
    select: { userId: true, user: { select: { id: true, name: true } } },
  },
  createdBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private student(actor: { roles: readonly string[] }) {
    if (
      !actor.roles.includes('STUDENT') ||
      actor.roles.some((r) => ['ADMIN', 'LIBRARY', 'XEROX'].includes(r))
    )
      throw new ForbiddenException(
        'Somente o estudante pode iniciar pagamentos de sua própria carteira, sem perfis administrativos.',
      );
  }
  private scope(actor: AuthenticatedUser) {
    if (
      actor.roles.includes('XEROX') &&
      !actor.roles.some((r) => ['ADMIN', 'LIBRARY'].includes(r))
    )
      return 'recipient';
    this.student(actor);
    return 'student';
  }
  private accountRoles(user: {
    accessProfiles: { accessProfile: { key: string } }[];
  }) {
    return user.accessProfiles.map((a) => a.accessProfile.key);
  }
  async recipients(actor: AuthenticatedUser) {
    this.student(actor);
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        accessProfiles: {
          some: { accessProfile: { key: 'XEROX', isActive: true } },
          none: {
            accessProfile: {
              key: { in: ['ADMIN', 'LIBRARY'] },
              isActive: true,
            },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
  async pay(actor: AuthenticatedUser, dto: CreatePaymentDto) {
    this.student(actor);
    if (
      typeof dto.amount !== 'string' ||
      !ECOCOIN_AMOUNT_PATTERN.test(dto.amount)
    )
      throw new BadRequestException(
        'Informe um valor positivo com até duas casas decimais.',
      );
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lessThanOrEqualTo(0) || amount.greaterThan(MAX_ECOCOIN_BALANCE))
      throw new BadRequestException(
        'O valor deve ser maior que zero e respeitar o limite da carteira.',
      );
    const key = dto.idempotencyKey.toLowerCase();
    const recipientId = dto.recipientId.toLowerCase();
    if (recipientId === actor.id)
      throw new BadRequestException(
        'O destinatário deve ser outra conta Xerox.',
      );
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS "lock"`;
        const previous = await tx.ecoCoinPayment.findUnique({
          where: { idempotencyKey: key },
        });
        if (previous) {
          if (
            previous.studentId !== actor.id ||
            previous.recipientId !== recipientId ||
            !previous.amount.equals(amount)
          )
            throw new ConflictException(
              'Esta chave já foi utilizada em outro pagamento. Não altere os dados ao reenviar.',
            );
          return this.receipt(previous, true);
        }
        if (
          await tx.ecoCoinMovement.findUnique({
            where: { redemptionKey: key },
            select: { id: true },
          })
        )
          throw new ConflictException(
            'Esta chave pertence a um resgate anterior.',
          );
        const ids = [actor.id, recipientId].sort();
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR SHARE`;
        const accounts = await tx.user.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            name: true,
            isActive: true,
            accessProfiles: {
              where: { accessProfile: { isActive: true } },
              select: { accessProfile: { select: { key: true } } },
            },
          },
        });
        const payer = accounts.find((u) => u.id === actor.id);
        const recipient = accounts.find((u) => u.id === recipientId);
        if (!payer?.isActive)
          throw new ForbiddenException(
            'O estudante precisa estar ativo para pagar.',
          );
        this.student({ ...actor, roles: this.accountRoles(payer) });
        const roles = recipient ? this.accountRoles(recipient) : [];
        if (
          !recipient?.isActive ||
          !roles.includes('XEROX') ||
          roles.some((r) => ['ADMIN', 'LIBRARY'].includes(r))
        )
          throw new BadRequestException(
            'A Xerox selecionada não está disponível para receber pagamentos.',
          );
        const wallets = await tx.$queryRaw<
          { id: string; balance: Prisma.Decimal }[]
        >`SELECT "id", "balance" FROM "EcoCoinWallet" WHERE "userId" = ${actor.id}::uuid FOR UPDATE`;
        const wallet = wallets[0];
        if (!wallet)
          throw new NotFoundException('Carteira de EcoCoins não encontrada.');
        const balanceAfter = new Prisma.Decimal(wallet.balance).minus(amount);
        if (balanceAfter.isNegative())
          throw new ConflictException(
            'Saldo insuficiente para realizar este pagamento.',
          );
        const updated = await tx.ecoCoinWallet.updateMany({
          where: { id: wallet.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            'Saldo insuficiente para realizar este pagamento.',
          );
        const payment = await tx.ecoCoinPayment.create({
          data: {
            idempotencyKey: key,
            studentId: actor.id,
            recipientId,
            studentName: payer.name,
            recipientName: recipient.name,
            amount,
            valueBrl: amount.mul(ECOCOIN_VALUE_BRL),
            balanceAfter,
          },
        });
        await tx.ecoCoinMovement.create({
          data: {
            walletId: wallet.id,
            paymentId: payment.id,
            type: 'DEBIT',
            amount,
            balanceAfter,
            createdByUserId: actor.id,
            coinValueBrlSnapshot: ECOCOIN_VALUE_BRL,
            description:
              'Pagamento de EcoCoins à Xerox iniciado pelo estudante.',
            createdAt: payment.createdAt,
          },
        });
        return this.receipt(payment, true);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034', 'P2028'].includes(error.code)
      )
        throw new ConflictException(
          'Houve um conflito simultâneo. Reenvie os mesmos dados com a mesma chave para confirmar o pagamento.',
        );
      throw error;
    }
  }
  private receipt(payment: Payment, own: boolean) {
    return {
      id: payment.id,
      kind: 'PAYMENT',
      idempotencyKey: payment.idempotencyKey,
      student: { id: payment.studentId, name: payment.studentName },
      recipient: { id: payment.recipientId, name: payment.recipientName },
      amount: payment.amount.toFixed(2),
      valueBrl: payment.valueBrl.toFixed(3),
      coinValueBrl: '0.10',
      createdAt: payment.createdAt,
      ...(own ? { balanceAfter: payment.balanceAfter.toFixed(2) } : {}),
    };
  }
  async get(actor: AuthenticatedUser, id: string) {
    const scope = this.scope(actor);
    const payment = await this.prisma.ecoCoinPayment.findFirst({
      where: {
        id,
        ...(scope === 'student'
          ? { studentId: actor.id }
          : { recipientId: actor.id }),
      },
    });
    if (payment) return this.receipt(payment, scope === 'student');
    const legacy = await this.prisma.ecoCoinMovement.findFirst({
      where: {
        id,
        redemptionKey: { not: null },
        ...(scope === 'student'
          ? { wallet: { userId: actor.id } }
          : { createdByUserId: actor.id }),
      },
      include: legacyInclude,
    });
    if (!legacy) throw new NotFoundException('Comprovante não encontrado.');
    return {
      id: legacy.id,
      kind: 'LEGACY_REDEMPTION',
      idempotencyKey: legacy.redemptionKey,
      student: legacy.wallet.user,
      recipient: legacy.createdBy,
      amount: legacy.amount.toFixed(2),
      valueBrl: legacy.redemptionValueBrl!.toFixed(2),
      coinValueBrl: '0.10',
      createdAt: legacy.createdAt,
      ...(scope === 'student'
        ? { balanceAfter: legacy.balanceAfter.toFixed(2) }
        : {}),
    };
  }
  async list(actor: AuthenticatedUser, query: ListMovementsDto) {
    const scope = this.scope(actor);
    if (scope !== 'recipient')
      throw new ForbiddenException(
        'Somente a Xerox pode consultar seus recebimentos.',
      );
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 20;
    const condition = Prisma.sql`p."recipientId" = ${actor.id}::uuid`;
    const oldCondition = Prisma.sql`m."createdByUserId" = ${actor.id}::uuid`;
    const union = Prisma.sql`SELECT p.id, p."createdAt" FROM "EcoCoinPayment" p WHERE ${condition}
      UNION ALL SELECT m.id, m."createdAt" FROM "EcoCoinMovement" m JOIN "EcoCoinWallet" w ON w.id=m."walletId" WHERE m."redemptionKey" IS NOT NULL AND ${oldCondition}`;
    const [rows, count] = await this.prisma.$transaction(
      [
        this.prisma.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT id FROM (${union}) records ORDER BY "createdAt" DESC, id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        ),
        this.prisma.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT count(*) AS total FROM (${union}) records`,
        ),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      data: await Promise.all(rows.map((r) => this.get(actor, r.id))),
      total: Number(count[0].total),
      page,
      pageSize,
    };
  }
}
