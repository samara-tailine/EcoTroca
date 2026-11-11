import { EcocoinsService } from '../ecocoins/ecocoins.service.js';
import { ECOCOINS_PER_KG } from '../ecocoins/ecocoin.constants.js';
import {
  CheckDisposalDto,
  DisposalDivergenceDto,
} from './dto/check-disposal.dto.js';
import {
  PHYSICAL_CONDITIONS,
  FUNCTIONALITIES,
} from './disposal-item.constants.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { DisposalStatus } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DISPOSAL_STATUS_LABELS } from './disposal-status.constants.js';
import { CreateDisposalDto } from './dto/create-disposal.dto.js';
import {
  DisposalDecisionDto,
  DisposalNotesDto,
} from './dto/disposal-notes.dto.js';
import { ListDisposalsDto } from './dto/list-disposals.dto.js';

const DISPOSAL_INCLUDE = {
  requester: {
    select: { id: true, name: true, email: true, studentIdentifier: true },
  },
  reviewedBy: { select: { id: true, name: true } },
  items: {
    include: {
      equipment: { select: { id: true, name: true } },
      divergence: {
        include: { recordedBy: { select: { id: true, name: true } } },
      },
    },
    orderBy: { id: 'asc' as const },
  },
  statusHistory: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.DisposalRequestInclude;

type DisposalRecord = Prisma.DisposalRequestGetPayload<{
  include: typeof DISPOSAL_INCLUDE;
}>;
type Action = 'receive' | 'check' | 'approve' | 'reject';
const TRANSITIONS: Record<
  Action,
  { from: DisposalStatus[]; to: DisposalStatus }
> = {
  receive: { from: ['PENDING'], to: 'RECEIVED' },
  check: { from: ['RECEIVED'], to: 'IN_REVIEW' },
  approve: { from: ['IN_REVIEW'], to: 'APPROVED' },
  reject: { from: ['PENDING', 'RECEIVED', 'IN_REVIEW'], to: 'REJECTED' },
};

@Injectable()
export class DisposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ecocoinsService: EcocoinsService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateDisposalDto) {
    this.requireStudent(actor);
    if (
      dto.items.some(
        (item) =>
          !PHYSICAL_CONDITIONS.includes(item.physicalCondition) ||
          !FUNCTIONALITIES.includes(item.functionality),
      )
    ) {
      throw new BadRequestException(
        'Selecione uma condição física e um funcionamento entre as opções padronizadas.',
      );
    }
    const ids = dto.items.map(({ equipmentId }) => equipmentId);
    if (!ids.length || new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Informe ao menos um equipamento, sem repetições.',
      );
    }
    try {
      const request = await this.prisma.$transaction(async (tx) => {
        // Compartilha o bloqueio com outras leituras, mas impede desativação ou
        // troca de categoria enquanto o snapshot da solicitação é criado.
        await tx.$queryRaw`
          SELECT e."id" FROM "Equipment" e JOIN "Category" c ON c."id" = e."categoryId"
          WHERE e."id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
          ORDER BY e."id" FOR SHARE OF e, c
        `;
        const equipment = await tx.equipment.findMany({
          where: {
            id: { in: ids },
            isActive: true,
            category: { isActive: true },
          },
          select: { id: true, name: true, averageWeightGrams: true },
        });
        if (equipment.length !== ids.length) {
          throw new BadRequestException(
            'Um ou mais equipamentos não existem, estão inativos ou pertencem a uma categoria inativa.',
          );
        }
        const byId = new Map(equipment.map((item) => [item.id, item]));
        const items = dto.items.map((item) => {
          const record = byId.get(item.equipmentId)!;
          return {
            equipmentId: record.id,
            equipmentNameSnapshot: record.name,
            quantity: item.quantity,
            averageWeightGramsSnapshot: record.averageWeightGrams,
            physicalCondition: item.physicalCondition.trim(),
            functionality: item.functionality.trim(),
            photoUrl: item.photoUrl ?? null,
          };
        });
        const totalWeightGramsSnapshot = this.calculateTotalWeight(items);
        return tx.disposalRequest.create({
          data: {
            requesterId: actor.id,
            totalWeightGramsSnapshot,
            items: { create: items },
            statusHistory: {
              create: { actorId: actor.id, toStatus: 'PENDING' },
            },
          },
          include: DISPOSAL_INCLUDE,
        });
      });
      return this.toResponse(request);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(actor: AuthenticatedUser, query: ListDisposalsDto) {
    const where: Prisma.DisposalRequestWhereInput = {
      ...this.visibility(actor),
      ...(query.status ? { status: query.status } : {}),
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [requests, total] = await this.prisma.$transaction(
      [
        this.prisma.disposalRequest.findMany({
          where,
          include: DISPOSAL_INCLUDE,
          orderBy: [{ requestedAt: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.disposalRequest.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      data: requests.map((request) => this.toResponse(request)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(actor: AuthenticatedUser, id: string) {
    const request = await this.prisma.disposalRequest.findFirst({
      where: { id, ...this.visibility(actor) },
      include: DISPOSAL_INCLUDE,
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada.');
    return this.toResponse(request);
  }

  receive(actor: AuthenticatedUser, id: string, dto: DisposalNotesDto) {
    return this.transition(actor, id, 'receive', dto.notes);
  }

  check(actor: AuthenticatedUser, id: string, dto: CheckDisposalDto) {
    return this.transition(
      actor,
      id,
      'check',
      dto.notes,
      dto.divergences ?? [],
    );
  }

  approve(actor: AuthenticatedUser, id: string, dto: DisposalDecisionDto) {
    return this.transition(actor, id, 'approve', this.justification(dto));
  }

  reject(actor: AuthenticatedUser, id: string, dto: DisposalDecisionDto) {
    return this.transition(actor, id, 'reject', this.justification(dto));
  }

  private async transition(
    actor: AuthenticatedUser,
    id: string,
    action: Action,
    notes?: string,
    divergences: DisposalDivergenceDto[] = [],
  ) {
    this.requireLibrary(actor);
    try {
      const request = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "DisposalRequest" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const current = await tx.disposalRequest.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!current)
          throw new NotFoundException('Solicitação não encontrada.');
        const rule = TRANSITIONS[action];
        if (!rule.from.includes(current.status)) {
          throw new ConflictException(
            'Esta operação não é permitida no status atual da solicitação.',
          );
        }
        if (action === 'check' && !current.receivedAt) {
          throw new ConflictException(
            'Registre o recebimento antes de conferir os equipamentos.',
          );
        }
        if (action === 'approve') {
          if (current.requesterId === actor.id) {
            throw new ForbiddenException(
              'Não é permitido aprovar a própria solicitação de descarte.',
            );
          }
          if (!current.receivedAt || !current.checkedAt) {
            throw new ConflictException(
              'A aprovação exige recebimento e conferência registrados.',
            );
          }
          const total = this.calculateTotalWeight(current.items);
          if (current.totalWeightGramsSnapshot !== total) {
            throw new ConflictException(
              'O peso histórico da solicitação está inconsistente e precisa ser revisado.',
            );
          }
        }
        const now = new Date();
        if (action === 'check' && divergences.length) {
          const itemIds = new Set(current.items.map((item) => item.id));
          const suppliedIds = divergences.map(
            (divergence) => divergence.itemId,
          );
          if (
            divergences.length > 100 ||
            new Set(suppliedIds).size !== suppliedIds.length ||
            suppliedIds.some((itemId) => !itemIds.has(itemId))
          ) {
            throw new BadRequestException(
              'Cada divergência deve referenciar um item desta solicitação, sem repetições.',
            );
          }
          for (const divergence of divergences) {
            if (
              !divergence.description?.trim() ||
              divergence.description.length > 2000 ||
              (divergence.quantityObserved !== undefined &&
                (!Number.isInteger(divergence.quantityObserved) ||
                  divergence.quantityObserved < 0 ||
                  divergence.quantityObserved > 2147483647)) ||
              (divergence.physicalConditionObserved !== undefined &&
                !PHYSICAL_CONDITIONS.includes(
                  divergence.physicalConditionObserved,
                )) ||
              (divergence.functionalityObserved !== undefined &&
                !FUNCTIONALITIES.includes(divergence.functionalityObserved))
            ) {
              throw new BadRequestException(
                'Informe uma descrição e valores padronizados válidos para a divergência.',
              );
            }
          }
          await tx.disposalItemDivergence.createMany({
            data: divergences.map((divergence) => ({
              disposalItemId: divergence.itemId,
              recordedById: actor.id,
              description: divergence.description.trim(),
              quantityObserved: divergence.quantityObserved,
              physicalConditionObserved: divergence.physicalConditionObserved,
              functionalityObserved: divergence.functionalityObserved,
              createdAt: now,
            })),
          });
        }
        const decision = action === 'approve' || action === 'reject';
        const updated = await tx.disposalRequest.updateMany({
          where: { id, status: current.status },
          data: {
            status: rule.to,
            ...(action === 'receive' ? { receivedAt: now } : {}),
            ...(action === 'check' ? { checkedAt: now } : {}),
            ...(action === 'approve'
              ? {
                  approvedAt: now,
                  conversionRateCoinsPerKgSnapshot: ECOCOINS_PER_KG,
                }
              : {}),
            ...(decision
              ? { reviewedAt: now, reviewedById: actor.id, reviewNotes: notes }
              : {}),
          },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            'A solicitação foi alterada por outra operação. Atualize os dados e tente novamente.',
          );
        if (action === 'approve')
          await this.ecocoinsService.creditApprovedDisposal(tx, actor, id);
        await tx.disposalStatusHistory.create({
          data: {
            disposalRequestId: id,
            actorId: actor.id,
            fromStatus: current.status,
            toStatus: rule.to,
            notes,
            createdAt: now,
          },
        });
        return tx.disposalRequest.findUniqueOrThrow({
          where: { id },
          include: DISPOSAL_INCLUDE,
        });
      });
      return this.toResponse(request);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private calculateTotalWeight(
    items: { quantity: number; averageWeightGramsSnapshot: number }[],
  ) {
    if (
      !items.length ||
      items.some(
        (item) =>
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          !Number.isInteger(item.averageWeightGramsSnapshot) ||
          item.averageWeightGramsSnapshot < 1,
      )
    ) {
      throw new BadRequestException(
        'Os itens precisam ter quantidade e peso histórico positivos.',
      );
    }
    const total = items.reduce(
      (sum, item) =>
        sum + BigInt(item.quantity) * BigInt(item.averageWeightGramsSnapshot),
      0n,
    );
    if (total > 2147483647n)
      throw new BadRequestException(
        'O peso total excede o limite de 2.147.483.647 gramas por solicitação.',
      );
    return Number(total);
  }

  private justification(dto: DisposalDecisionDto) {
    const value = dto.justification?.trim();
    if (!value)
      throw new BadRequestException(
        'Informe uma justificativa para a decisão.',
      );
    return value;
  }

  private requireStudent(actor: AuthenticatedUser) {
    if (!actor.roles.includes('STUDENT'))
      throw new ForbiddenException(
        'Somente estudantes podem criar solicitações de descarte.',
      );
  }

  private isLibrary(actor: AuthenticatedUser) {
    return (
      actor.roles.includes('LIBRARY') &&
      !actor.roles.includes('ADMIN') &&
      !actor.roles.includes('XEROX')
    );
  }

  private requireLibrary(actor: AuthenticatedUser) {
    if (!this.isLibrary(actor))
      throw new ForbiddenException(
        'Esta operação é exclusiva do Administrador da Biblioteca e não está disponível a perfis técnicos ou da Xerox.',
      );
  }

  private visibility(
    actor: AuthenticatedUser,
  ): Prisma.DisposalRequestWhereInput {
    if (this.isLibrary(actor)) return {};
    if (actor.roles.includes('STUDENT')) return { requesterId: actor.id };
    throw new ForbiddenException(
      'Seu perfil não possui permissão para consultar solicitações de descarte.',
    );
  }

  private toResponse(request: DisposalRecord) {
    return {
      ...request,
      statusLabel: DISPOSAL_STATUS_LABELS[request.status],
      statusHistory: request.statusHistory.map((entry) => ({
        ...entry,
        fromStatusLabel: entry.fromStatus
          ? DISPOSAL_STATUS_LABELS[entry.fromStatus]
          : null,
        toStatusLabel: DISPOSAL_STATUS_LABELS[entry.toStatus],
      })),
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025')
        throw new NotFoundException('Solicitação não encontrada.');
      if (error.code === 'P2002')
        throw new ConflictException(
          'O descarte já possui crédito ou um item foi repetido na solicitação ou na conferência.',
        );
      if (error.code === 'P2003')
        throw new BadRequestException(
          'O usuário ou equipamento informado não está mais disponível.',
        );
      if (error.code === 'P2004')
        throw new BadRequestException(
          'Os dados não atendem às opções padronizadas ou às regras de aprovação do descarte.',
        );
      if (error.code === 'P2034')
        throw new ConflictException(
          'A solicitação foi alterada em outra operação. Atualize os dados e tente novamente.',
        );
    }
    throw error;
  }
}
