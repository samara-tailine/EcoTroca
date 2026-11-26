import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export const GOOGLE_COOKIE = 'ecotroca_google_challenge';
export const GOOGLE_COOKIE_PATH = '/api/auth/google';
@Injectable()
export class GoogleChallengeService {
  constructor(private readonly config: ConfigService) {}
  private signature(value: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update('ecotroca:google:' + value)
      .digest();
  }
  issue() {
    const nonce = randomBytes(32).toString('base64url');
    const value = Buffer.from(
      JSON.stringify({ nonce, expires: Date.now() + 300000 }),
    ).toString('base64url');
    return {
      nonce,
      cookie: value + '.' + this.signature(value).toString('base64url'),
    };
  }
  read(header?: string) {
    try {
      const cookie = header
        ?.split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith(GOOGLE_COOKIE + '='))
        ?.slice(GOOGLE_COOKIE.length + 1);
      if (!cookie || cookie.length > 1024) throw new Error();
      const parts = cookie.split('.');
      if (parts.length !== 2) throw new Error();
      const actual = Buffer.from(parts[1], 'base64url'),
        expected = this.signature(parts[0]);
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new Error();
      const payload = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      );
      if (
        typeof payload.nonce !== 'string' ||
        payload.nonce.length !== 43 ||
        typeof payload.expires !== 'number' ||
        payload.expires <= Date.now()
      )
        throw new Error();
      return payload.nonce as string;
    } catch {
      throw new UnauthorizedException(
        'A confirmação do Google expirou. Tente novamente.',
      );
    }
  }
}
