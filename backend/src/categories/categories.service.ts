import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    await this.ensureNameAvailable(name);

    try {
      return await this.prisma.category.create({
        data: { name, description: this.normalizeDescription(dto.description) },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findActive() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found.');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const data: Prisma.CategoryUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      await this.ensureNameAvailable(data.name, id);
    }
    if (dto.description !== undefined) {
      data.description = this.normalizeDescription(dto.description);
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateStatus(id: string, isActive: boolean) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: { isActive },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private async ensureNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Category name is already in use.');
    }
  }

  private normalizeDescription(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Category name is already in use.');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Category not found.');
      }
    }
    throw error;
  }
}