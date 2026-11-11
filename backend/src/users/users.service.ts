import { assertCompatibleAccessProfiles } from './access-profile.policy.js';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ACCESS_PROFILE_DEFINITIONS,
  AccessProfileKey,
} from './access-profile.constants.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { RegisterUserDto } from '../auth/dto/register-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { hashPassword } from '../auth/password-hasher.js';

const USER_INCLUDE = {
  accessProfiles: {
    include: {
      accessProfile: {
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type UserRecord = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await Promise.all(
      ACCESS_PROFILE_DEFINITIONS.map((profile) =>
        this.prisma.accessProfile.upsert({
          where: { key: profile.key },
          update: {
            name: profile.name,
            description: profile.description,
          },
          create: profile,
        }),
      ),
    );
  }

  async create(dto: CreateUserDto) {
    return this.createWithProfiles(
      dto,
      dto.accessProfileKeys ?? ['STUDENT'],
    );
  }

  async registerPublic(dto: RegisterUserDto) {
    return this.createWithProfiles(dto, ['STUDENT']);
  }

  private async createWithProfiles(
    dto: RegisterUserDto,
    accessProfileKeys: AccessProfileKey[],
  ) {
    assertCompatibleAccessProfiles(accessProfileKeys);
    const profiles = await this.prisma.accessProfile.findMany({
      where: {
        key: { in: accessProfileKeys },
        isActive: true,
      },
      select: { id: true },
    });

    if (profiles.length !== new Set(accessProfileKeys).size) {
      throw new BadRequestException(
        'Um ou mais perfis de acesso não existem ou estão inativos.',
      );
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash,
          studentIdentifier: this.normalizeStudentIdentifier(
            dto.studentIdentifier,
          ),
          accessProfiles: {
            create: profiles.map((profile) => ({
              accessProfile: { connect: { id: profile.id } },
            })),
          },
        },
        include: USER_INCLUDE,
      });

      return this.toResponse(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: USER_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: string) {
    return this.toResponse(await this.findUser(id));
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      data.email = dto.email.trim().toLowerCase();
    }

    if (dto.studentIdentifier !== undefined) {
      data.studentIdentifier = this.normalizeStudentIdentifier(
        dto.studentIdentifier,
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Informe ao menos um campo para atualizar.');
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        include: USER_INCLUDE,
      });

      return this.toResponse(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateStatus(id: string, isActive: boolean) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { isActive },
        include: USER_INCLUDE,
      });

      return this.toResponse(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getAccessProfiles() {
    return this.prisma.accessProfile.findMany({
      where: { isActive: true },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
      },
      orderBy: { key: 'asc' },
    });
  }

  async setAccessProfiles(id: string, accessProfileKeys: AccessProfileKey[]) {
    assertCompatibleAccessProfiles(accessProfileKeys);
    try {
      await this.prisma.$transaction(async (transaction) => {
        // Evita que duas substituições de perfis da mesma conta se misturem.
        const users = await transaction.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "User" WHERE "id" = ${id}::uuid FOR UPDATE
        `;
        if (!users.length) throw new NotFoundException('Usuário não encontrado.');
        const profiles = await transaction.accessProfile.findMany({
          where: { key: { in: accessProfileKeys }, isActive: true },
          select: { id: true, key: true },
        });
        if (profiles.length !== new Set(accessProfileKeys).size) {
          throw new BadRequestException('Um ou mais perfis de acesso não existem ou estão inativos.');
        }
        await transaction.userAccessProfile.deleteMany({ where: { userId: id } });
        if (profiles.length) {
          await transaction.userAccessProfile.createMany({
            data: profiles.map((profile) => ({ userId: id, accessProfileId: profile.id })),
          });
        }
      }, { isolationLevel: 'Serializable' });
      return await this.findOne(id);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
  private async findUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  private normalizeStudentIdentifier(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toResponse(user: UserRecord) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      studentIdentifier: user.studentIdentifier,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      accessProfiles: user.accessProfiles.map(({ accessProfile }) => accessProfile),
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        const fields = Array.isArray(target) ? target : [target];
        const message = fields.some((field) =>
          String(field).toLowerCase().includes('email'),
        )
          ? 'O e-mail já está cadastrado.'
          : 'O e-mail ou a identificação do estudante já está em uso.';

        throw new ConflictException(message);
      }

      if (error.code === 'P2004') {
        throw new ConflictException('A combinação de perfis técnicos e operacionais não é permitida.');
      }
      if (error.code === 'P2034') {
        throw new ConflictException('Os perfis foram alterados em outra operação. Atualize os dados e tente novamente.');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Usuário não encontrado.');
      }
    }

    throw error;
  }
}