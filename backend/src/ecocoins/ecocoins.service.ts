import { calculateObservedWeight } from '../disposals/observed-weight.js';
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
  ECOCOINS_PER_KG,
  ECOCOIN_VALUE_BRL,
  MAX_ECOCOIN_BALANCE,
} from './ecocoin.constants.js';
import { ListMovementsDto } from './dto/list-movements.dto.js';

const MOVEMENT_INCLUDE = {
  payment: true,
  wallet: {
    select: { userId: true, user: { select: { id: true, name: true } } },
  },
  createdBy: { select: { id: true, name: true } },
  disposalRequest: {
    select: {
      id: true,
      totalWeightGramsSnapshot: true,
      totalWeightGramsObserved: true,
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
      !request.totalWeightGramsObserved ||
      !request.conversionRateCoinsPerKgSnapshot?.equals(ECOCOINS_PER_KG)
    ) {
      throw new ConflictException(
        'O peso ou a taxa histórica da aprovação está inconsistente.',
      );
    }
    const checkedItems = await tx.disposalItem.findMany({
      where: { disposalRequestId },
      select: { quantityObserved: true, averageWeightGramsSnapshot: true },
    });
    if (
      calculateObservedWeight(checkedItems) !== request.totalWeightGramsObserved
    )
      throw new ConflictException(
        'O crédito exige conferência completa e peso conferido consistente.',
      );
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
    const amount = new Prisma.Decimal(request.totalWeightGramsObserved)
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
        type: movement.paymentId
          ? 'STUDENT_PAYMENT'
          : movement.redemptionKey
            ? 'XEROX_REDEMPTION'
            : movement.disposalRequestId
              ? 'DISPOSAL_APPROVAL'
              : 'LEGACY',
        label: movement.paymentId
          ? 'Pagamento à Xerox'
          : movement.redemptionKey
            ? 'Resgate na Xerox'
            : movement.disposalRequestId
              ? 'Descarte aprovado'
              : 'Movimentação anterior',
        disposalRequestId: movement.disposalRequestId,
        weightGrams:
          movement.disposalRequest?.totalWeightGramsObserved ??
          movement.disposalRequest?.totalWeightGramsSnapshot ??
          null,
        coinsPerKg:
          movement.disposalRequest?.conversionRateCoinsPerKgSnapshot?.toFixed(
            2,
          ) ?? null,
        coinValueBrl: movement.coinValueBrlSnapshot?.toFixed(2) ?? null,
      },
      ...(movement.payment
        ? {
            payment: {
              id: movement.payment.id,
              valueBrl: movement.payment.valueBrl.toFixed(3),
            },
          }
        : {}),
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
