import { CreateRedemptionDto } from './dto/create-redemption.dto.js';
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
import {
  ECOCOIN_AMOUNT_PATTERN,
  ECOCOINS_PER_KG,
  ECOCOIN_VALUE_BRL,
  MAX_ECOCOIN_BALANCE,
} from './ecocoin.constants.js';
import { ListMovementsDto } from './dto/list-movements.dto.js';

const MOVEMENT_INCLUDE = {
  wallet: {
    select: { userId: true, user: { select: { id: true, name: true } } },
  },
  createdBy: { select: { id: true, name: true } },
  disposalRequest: {
    select: {
      id: true,
      totalWeightGramsSnapshot: true,
      conversionRateCoinsPerKgSnapshot: true,
      requester: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.EcoCoinMovementInclude;

type MovementRecord = Prisma.EcoCoinMovementGetPayload<{
  include: typeof MOVEMENT_INCLUDE;
}>;

@Injectable()
export class EcocoinsService {
  constructor(private readonly prisma: PrismaService) {}

  async redeem(actor: AuthenticatedUser, dto: CreateRedemptionDto) {
    this.requireXerox(actor);
    if (
      typeof dto.amount !== 'string' ||
      !ECOCOIN_AMOUNT_PATTERN.test(dto.amount)
    ) {
      throw new BadRequestException(
        'Informe uma quantidade válida de EcoCoins com até duas casas decimais.',
      );
    }
    const amount = new Prisma.Decimal(dto.amount);
    if (!amount.isPositive() || amount.greaterThan(MAX_ECOCOIN_BALANCE)) {
      throw new BadRequestException(
        'A quantidade de EcoCoins deve ser maior que zero e respeitar o limite da carteira.',
      );
    }
    const valueBrl = amount.mul(ECOCOIN_VALUE_BRL);
    if (!valueBrl.isPositive() || valueBrl.decimalPlaces() > 2) {
      throw new BadRequestException(
        'Utilize múltiplos de 0,10 EcoCoin para obter descontos exatos em centavos, sem arredondamento.',
      );
    }
    const key = dto.idempotencyKey.toLowerCase();
    const studentId = dto.studentId.toLowerCase();
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serializa a operação lógica antes de consultar a chave, inclusive para carteiras diferentes.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS "lock"`;
        const previous = await tx.ecoCoinMovement.findUnique({
          where: { redemptionKey: key },
          include: MOVEMENT_INCLUDE,
        });
        if (previous) {
          if (
            previous.type !== 'DEBIT' ||
            previous.createdByUserId !== actor.id ||
            previous.wallet.userId !== studentId ||
            !previous.amount.equals(amount)
          ) {
            throw new ConflictException(
              'Esta chave de idempotência já foi utilizada com outros dados ou por outro operador.',
            );
          }
          return this.toRedemptionResponse(previous);
        }

        // Preserva a verificação de atividade enquanto alterações de contas/perfis aguardam.
        const users = [...new Set([actor.id, studentId])].sort();
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" IN (${Prisma.join(users.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR SHARE`;
        const operator = await tx.user.findUnique({
          where: { id: actor.id },
          select: {
            isActive: true,
            accessProfiles: {
              where: { accessProfile: { isActive: true } },
              select: { accessProfile: { select: { key: true } } },
            },
          },
        });
        const operatorRoles =
          operator?.accessProfiles.map(
            ({ accessProfile }) => accessProfile.key,
          ) ?? [];
        if (
          !operator?.isActive ||
          !operatorRoles.includes('XEROX') ||
          operatorRoles.includes('ADMIN') ||
          operatorRoles.includes('LIBRARY')
        ) {
          throw new ForbiddenException(
            'Somente um operador ativo da Xerox pode registrar resgates, sem perfis técnico ou da Biblioteca.',
          );
        }
        const student = await tx.user.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            isActive: true,
            accessProfiles: {
              where: { accessProfile: { key: 'STUDENT', isActive: true } },
              select: { accessProfileId: true },
            },
          },
        });
        if (!student) throw new NotFoundException('Estudante não encontrado.');
        if (!student.isActive)
          throw new BadRequestException(
            'Estudantes inativos não podem realizar resgates.',
          );
        if (!student.accessProfiles.length)
          throw new BadRequestException(
            'A conta informada não possui um perfil de Estudante ativo.',
          );
        const wallets = await tx.$queryRaw<
          { id: string; balance: Prisma.Decimal }[]
        >`
          SELECT "id", "balance" FROM "EcoCoinWallet" WHERE "userId" = ${studentId}::uuid FOR UPDATE
        `;
        const wallet = wallets[0];
        if (!wallet)
          throw new NotFoundException(
            'Carteira de EcoCoins do estudante não encontrada.',
          );
        const balance = new Prisma.Decimal(wallet.balance);
        if (balance.lessThan(amount))
          throw new ConflictException(
            'Saldo insuficiente para realizar este resgate.',
          );
        const updated = await tx.ecoCoinWallet.updateMany({
          where: { id: wallet.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            'Saldo insuficiente ou alterado por outra operação. Repita usando a mesma chave de idempotência.',
          );
        const movement = await tx.ecoCoinMovement.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount,
            balanceAfter: balance.minus(amount),
            createdByUserId: actor.id,
            coinValueBrlSnapshot: ECOCOIN_VALUE_BRL,
            redemptionKey: key,
            redemptionValueBrl: valueBrl,
            description: 'Resgate de EcoCoins para desconto na Xerox.',
            createdAt: new Date(),
          },
          include: MOVEMENT_INCLUDE,
        });
        return this.toRedemptionResponse(movement);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException(
            'Este resgate já foi registrado. Repita usando a mesma chave de idempotência.',
          );
        if (error.code === 'P2034' || error.code === 'P2028')
          throw new ConflictException(
            'Houve um conflito simultâneo. Repita usando a mesma chave de idempotência.',
          );
        if (error.code === 'P2004')
          throw new BadRequestException(
            'O resgate não atende às regras de perfil, saldo ou conversão em centavos.',
          );
      }
      throw error;
    }
  }

  private toRedemptionResponse(movement: MovementRecord) {
    if (!movement.redemptionKey || !movement.redemptionValueBrl)
      throw new ConflictException(
        'O comprovante do resgate está inconsistente.',
      );
    return {
      id: movement.id,
      idempotencyKey: movement.redemptionKey,
      student: movement.wallet.user,
      operator: movement.createdBy,
      amount: movement.amount.toFixed(2),
      valueBrl: movement.redemptionValueBrl.toFixed(2),
      coinValueBrl: movement.coinValueBrlSnapshot?.toFixed(2),
      createdAt: movement.createdAt,
    };
  }
  async getOwnWallet(actor: AuthenticatedUser) {
    this.requireStudent(actor);
    const wallet = await this.prisma.ecoCoinWallet.findUnique({
      where: { userId: actor.id },
    });
    if (!wallet)
      throw new NotFoundException('Carteira de EcoCoins não encontrada.');
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance.toFixed(2),
      coinValueBrl: ECOCOIN_VALUE_BRL.toFixed(2),
      coinsPerKg: ECOCOINS_PER_KG.toFixed(2),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  getOwnMovements(actor: AuthenticatedUser, query: ListMovementsDto) {
    this.requireStudent(actor);
    return this.list({ wallet: { userId: actor.id } }, query, true);
  }

  getProcessedCredits(actor: AuthenticatedUser, query: ListMovementsDto) {
    this.requireLibrary(actor);
    return this.list(
      {
        type: 'CREDIT',
        disposalRequestId: { not: null },
        disposalRequest: { status: 'APPROVED' },
        OR: [
          { createdByUserId: actor.id },
          { disposalRequest: { reviewedById: actor.id } },
          {
            disposalRequest: {
              statusHistory: {
                some: {
                  actorId: actor.id,
                  toStatus: { in: ['RECEIVED', 'IN_REVIEW'] },
                },
              },
            },
          },
        ],
      },
      query,
      false,
    );
  }

  // Uso interno: chamado somente dentro da transação da aprovação. Não há endpoint de concessão.
  async creditApprovedDisposal(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    disposalRequestId: string,
  ) {
    this.requireLibrary(actor);
    await tx.$queryRaw`SELECT "id" FROM "DisposalRequest" WHERE "id" = ${disposalRequestId}::uuid FOR UPDATE`;
    const request = await tx.disposalRequest.findUnique({
      where: { id: disposalRequestId },
    });
    if (
      !request ||
      request.status !== 'APPROVED' ||
      !request.approvedAt ||
      !request.checkedAt ||
      !request.receivedAt ||
      request.reviewedById !== actor.id ||
      request.requesterId === actor.id
    ) {
      throw new ForbiddenException(
        'O crédito exige um descarte aprovado por este usuário da Biblioteca, sem autoaprovação.',
      );
    }
    if (
      !request.totalWeightGramsSnapshot ||
      !request.conversionRateCoinsPerKgSnapshot?.equals(ECOCOINS_PER_KG)
    ) {
      throw new ConflictException(
        'O peso ou a taxa histórica da aprovação está inconsistente.',
      );
    }
    const previous = await tx.ecoCoinMovement.findUnique({
      where: { disposalRequestId },
    });
    if (previous)
      throw new ConflictException(
        'Este descarte já possui um crédito de EcoCoins.',
      );
    const student = await tx.user.findFirst({
      where: {
        id: request.requesterId,
        accessProfiles: {
          some: { accessProfile: { key: 'STUDENT', isActive: true } },
        },
      },
      select: { id: true },
    });
    if (!student)
      throw new BadRequestException(
        'O solicitante precisa manter um perfil de Estudante ativo para receber o crédito.',
      );

    // Gramas inteiras a 10 moedas/kg resultam em centésimos exatos, sem ponto flutuante.
    const amount = new Prisma.Decimal(request.totalWeightGramsSnapshot)
      .mul(ECOCOINS_PER_KG)
      .div(1000);
    if (!amount.isPositive() || amount.decimalPlaces() > 2)
      throw new ConflictException(
        'O crédito calculado não possui uma precisão válida.',
      );

    await tx.$executeRaw`
      INSERT INTO "EcoCoinWallet" ("id", "userId", "balance", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${request.requesterId}::uuid, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO NOTHING
    `;
    const wallets = await tx.$queryRaw<
      { id: string; balance: Prisma.Decimal }[]
    >`
      SELECT "id", "balance" FROM "EcoCoinWallet" WHERE "userId" = ${request.requesterId}::uuid FOR UPDATE
    `;
    const wallet = wallets[0];
    if (!wallet)
      throw new NotFoundException('Carteira de EcoCoins não encontrada.');
    const resultingBalance = new Prisma.Decimal(wallet.balance).plus(amount);
    if (resultingBalance.greaterThan(MAX_ECOCOIN_BALANCE))
      throw new ConflictException(
        'O crédito ultrapassaria o limite de saldo da carteira.',
      );
    const updated = await tx.ecoCoinWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });
    return tx.ecoCoinMovement.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amount,
        balanceAfter: updated.balance,
        disposalRequestId,
        createdByUserId: actor.id,
        createdAt: request.approvedAt,
        coinValueBrlSnapshot: ECOCOIN_VALUE_BRL,
        description:
          'Crédito pela aprovação de descarte de eletrônicos pela Biblioteca.',
      },
    });
  }

  private async list(
    scope: Prisma.EcoCoinMovementWhereInput,
    query: ListMovementsDto,
    ownWallet: boolean,
  ) {
    const where: Prisma.EcoCoinMovementWhereInput = {
      AND: [
        scope,
        ...(query.disposalRequestId
          ? [{ disposalRequestId: query.disposalRequestId }]
          : []),
      ],
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [movements, total] = await this.prisma.$transaction(
      [
        this.prisma.ecoCoinMovement.findMany({
          where,
          include: MOVEMENT_INCLUDE,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.ecoCoinMovement.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      data: movements.map((movement) => this.toResponse(movement, ownWallet)),
      total,
      page,
      pageSize,
    };
  }

  private toResponse(movement: MovementRecord, ownWallet: boolean) {
    return {
      id: movement.id,
      type: movement.type,
      typeLabel: movement.type === 'CREDIT' ? 'Crédito' : 'Débito',
      amount: movement.amount.toFixed(2),
      description: movement.description,
      createdAt: movement.createdAt,
      responsible: movement.createdBy,
      origin: {
        type: movement.redemptionKey
          ? 'XEROX_REDEMPTION'
          : movement.disposalRequestId
            ? 'DISPOSAL_APPROVAL'
            : 'LEGACY',
        label: movement.redemptionKey
          ? 'Resgate na Xerox'
          : movement.disposalRequestId
            ? 'Descarte aprovado'
            : 'Movimentação anterior',
        disposalRequestId: movement.disposalRequestId,
        weightGrams: movement.disposalRequest?.totalWeightGramsSnapshot ?? null,
        coinsPerKg:
          movement.disposalRequest?.conversionRateCoinsPerKgSnapshot?.toFixed(
            2,
          ) ?? null,
        coinValueBrl: movement.coinValueBrlSnapshot?.toFixed(2) ?? null,
      },
      ...(movement.redemptionKey
        ? {
            redemption: {
              idempotencyKey: movement.redemptionKey,
              valueBrl: movement.redemptionValueBrl?.toFixed(2),
              student: movement.wallet.user,
            },
          }
        : {}),
      ...(ownWallet
        ? { balanceAfter: movement.balanceAfter.toFixed(2) }
        : { student: movement.disposalRequest?.requester ?? null }),
    };
  }

  private requireXerox(actor: AuthenticatedUser) {
    if (
      !actor.roles.includes('XEROX') ||
      actor.roles.includes('ADMIN') ||
      actor.roles.includes('LIBRARY')
    ) {
      throw new ForbiddenException(
        'O registro de resgates é exclusivo da Xerox e não está disponível ao administrador técnico ou à Biblioteca.',
      );
    }
  }

  private requireStudent(actor: AuthenticatedUser) {
    if (!actor.roles.includes('STUDENT'))
      throw new ForbiddenException(
        'Somente estudantes podem consultar a própria carteira e movimentações.',
      );
  }

  private requireLibrary(actor: AuthenticatedUser) {
    if (
      !actor.roles.includes('LIBRARY') ||
      actor.roles.includes('ADMIN') ||
      actor.roles.includes('XEROX')
    ) {
      throw new ForbiddenException(
        'Esta operação é exclusiva da Biblioteca e não está disponível ao administrador técnico ou à Xerox.',
      );
    }
  }
}
