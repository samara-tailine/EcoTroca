import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessProfileKey } from '../users/access-profile.constants.js';
import { AuthenticatedUser } from './auth.types.js';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.getOrThrow<string>('JWT_SECRET');
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        accessProfiles: {
          where: { accessProfile: { isActive: true } },
          select: { accessProfile: { select: { key: true } } },
        },
      },
    });

    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid or inactive account.');
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.accessProfiles.map(
        ({ accessProfile }) => accessProfile.key as AccessProfileKey,
      ),
    };
  }
}