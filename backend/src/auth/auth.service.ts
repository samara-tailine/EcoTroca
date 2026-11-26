import { assertInstitutionalEmail } from './email-domain.policy.js';
import type { AuthenticatedUser } from './auth.types.js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { verifyPassword } from './password-hasher.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async currentUser(actor: AuthenticatedUser) {
    const user = await this.usersService.findOne(actor.id);
    if (!user.isActive)
      throw new UnauthorizedException('Conta inválida ou inativa.');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      accessProfiles: user.accessProfiles.filter((profile) =>
        actor.roles.includes(profile.key as AuthenticatedUser['roles'][number]),
      ),
    };
  }

  async register(dto: RegisterUserDto) {
    return this.usersService.registerPublic(dto);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    assertInstitutionalEmail(email, true);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user?.isActive || !user.passwordHash) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    let passwordMatches = false;
    try {
      passwordMatches = await verifyPassword(user.passwordHash, dto.password);
    } catch {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.createSession(user.id);
  }

  async createSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true },
    });
    if (!user?.isActive)
      throw new UnauthorizedException('Conta inválida ou inativa.');
    assertInstitutionalEmail(user.email, true);
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    if (secret.length < 32) {
      throw new Error('JWT_SECRET deve conter pelo menos 32 caracteres.');
    }

    const expiresIn = 3600;
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: await this.usersService.findOne(user.id),
    };
  }
}
