import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';
import { findOfficialEquipment, OFFICIAL_EQUIPMENT } from './official-equipment.constants.js';

const EQUIPMENT_INCLUDE = {
  category: { select: { id: true, name: true, isActive: true } },
} satisfies Prisma.EquipmentInclude;

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEquipmentDto) {
    const official = findOfficialEquipment(dto.name);
    if (official && dto.averageWeightGrams !== official.weight) {
      throw new BadRequestException(`O peso oficial deste equipamento é fixo: ${official.weight} g por unidade.`);
    }
    await this.ensureActiveCategory(dto.categoryId);
    try {
      return await this.prisma.equipment.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          description: this.normalizeDescription(dto.description),
          averageWeightGrams: dto.averageWeightGrams,
          officialCatalogKey: official?.key ?? null,
        },
        include: EQUIPMENT_INCLUDE,
      });
    } catch (error) { this.handlePrismaError(error); }
  }

  findAll() {
    return this.prisma.equipment.findMany({
      include: EQUIPMENT_INCLUDE,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  findActive() {
    return this.prisma.equipment.findMany({
      where: { isActive: true, category: { isActive: true } },
      include: EQUIPMENT_INCLUDE,
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id }, include: EQUIPMENT_INCLUDE });
    if (!equipment) throw new NotFoundException('Equipamento não encontrado.');
    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Informe ao menos um campo para atualizar.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.equipment.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Equipamento não encontrado.');
        const byName = findOfficialEquipment(dto.name ?? existing.name);
        const official = existing.officialCatalogKey
          ? OFFICIAL_EQUIPMENT.find(({ key }) => key === existing.officialCatalogKey)
          : byName;
        if (existing.officialCatalogKey && byName && byName.key !== existing.officialCatalogKey) {
          throw new ConflictException('Um equipamento oficial não pode assumir a identidade de outro item da tabela.');
        }
        if (official && (dto.averageWeightGrams ?? existing.averageWeightGrams) !== official.weight) {
          throw new ForbiddenException(`O peso oficial deste equipamento é fixo: ${official.weight} g por unidade. Nenhum perfil pode alterá-lo.`);
        }
        const data: Prisma.EquipmentUpdateInput = {};
        if (dto.categoryId !== undefined) {
          await this.ensureActiveCategory(dto.categoryId, tx);
          data.category = { connect: { id: dto.categoryId } };
        }
        if (dto.name !== undefined) data.name = dto.name.trim();
        if (dto.description !== undefined) data.description = this.normalizeDescription(dto.description);
        if (dto.averageWeightGrams !== undefined) data.averageWeightGrams = dto.averageWeightGrams;
        if (official && !existing.officialCatalogKey) data.officialCatalogKey = official.key;
        return tx.equipment.update({ where: { id }, data, include: EQUIPMENT_INCLUDE });
      }, { isolationLevel: 'Serializable' });
    } catch (error) { this.handlePrismaError(error); }
  }

  async updateStatus(id: string, isActive: boolean) {
    try {
      return await this.prisma.equipment.update({ where: { id }, data: { isActive }, include: EQUIPMENT_INCLUDE });
    } catch (error) { this.handlePrismaError(error); }
  }

  private async ensureActiveCategory(categoryId: string, client: Prisma.TransactionClient = this.prisma) {
    const category = await client.category.findUnique({ where: { id: categoryId }, select: { isActive: true } });
    if (!category) throw new BadRequestException('A categoria não existe.');
    if (!category.isActive) throw new BadRequestException('Não é possível utilizar uma categoria inativa.');
  }

  private normalizeDescription(value?: string | null) { return value?.trim() || null; }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException('Já existe um equipamento com esse nome na categoria ou com essa identidade oficial.');
      if (error.code === 'P2025') throw new NotFoundException('Equipamento não encontrado.');
      if (error.code === 'P2003') throw new BadRequestException('A categoria não existe.');
      if (error.code === 'P2034' || error.code === 'P2004') throw new ConflictException('O catálogo foi alterado ou o peso oficial está protegido. Atualize a lista e tente novamente.');
    }
    throw error;
  }
}