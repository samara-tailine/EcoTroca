import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';

const EQUIPMENT_INCLUDE = {
  category: { select: { id: true, name: true, isActive: true } },
} satisfies Prisma.EquipmentInclude;

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEquipmentDto) {
    await this.ensureActiveCategory(dto.categoryId);
    try {
      return await this.prisma.equipment.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          description: this.normalizeDescription(dto.description),
          averageWeightGrams: dto.averageWeightGrams,
        },
        include: EQUIPMENT_INCLUDE,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
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
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: EQUIPMENT_INCLUDE,
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }
    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    const data: Prisma.EquipmentUpdateInput = {};

    if (dto.categoryId !== undefined) {
      await this.ensureActiveCategory(dto.categoryId);
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = this.normalizeDescription(dto.description);
    }
    if (dto.averageWeightGrams !== undefined) {
      data.averageWeightGrams = dto.averageWeightGrams;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    try {
      return await this.prisma.equipment.update({
        where: { id },
        data,
        include: EQUIPMENT_INCLUDE,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateStatus(id: string, isActive: boolean) {
    try {
      return await this.prisma.equipment.update({
        where: { id },
        data: { isActive },
        include: EQUIPMENT_INCLUDE,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private async ensureActiveCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { isActive: true },
    });
    if (!category) {
      throw new BadRequestException('Category does not exist.');
    }
    if (!category.isActive) {
      throw new BadRequestException('Cannot use an inactive category.');
    }
  }

  private normalizeDescription(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'An equipment with this name already exists in the category.',
        );
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Equipment not found.');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Category does not exist.');
      }
    }
    throw error;
  }
}