import { emailDomainConfiguration } from './email-domain.policy.js';
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from './auth.types.js';
import { Public } from './decorators/public.decorator.js';
import { GoogleAuthDto, LinkGoogleDto } from './dto/google-auth.dto.js';
import { GoogleAuthService } from './google-auth.service.js';
import { GoogleTokenService } from './google-token.service.js';
import {
  GoogleChallengeService,
  GOOGLE_COOKIE,
  GOOGLE_COOKIE_PATH,
} from './google-challenge.service.js';
@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly google: GoogleAuthService,
    private readonly tokens: GoogleTokenService,
    private readonly challenges: GoogleChallengeService,
    private readonly config: ConfigService,
  ) {}
  private options() {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: GOOGLE_COOKIE_PATH,
    };
  }
  @Public()
  @Get('config')
  configuration(
    @Res({ passthrough: true }) response: Response,
    @Query('emailPolicyOnly') emailPolicyOnly?: string,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    const emailPolicy = emailDomainConfiguration();
    if (emailPolicyOnly === 'true') return { emailPolicy };
    if (!this.tokens.clientId) return { enabled: false, emailPolicy };
    const challenge = this.challenges.issue();
    response.cookie(GOOGLE_COOKIE, challenge.cookie, {
      ...this.options(),
      maxAge: 300000,
    });
    return {
      enabled: true,
      emailPolicy,
      clientId: this.tokens.clientId,
      nonce: challenge.nonce,
    };
  }
  @Public()
  @Post()
  async login(
    @Body() dto: GoogleAuthDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const nonce = this.challenges.read(request.headers.cookie);
    try {
      return await this.google.login(dto.credential, nonce);
    } finally {
      response.clearCookie(GOOGLE_COOKIE, this.options());
    }
  }
  @Get('status')
  status(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.google.status(request.user);
  }
  @Post('link')
  async link(
    @Body() dto: LinkGoogleDto,
    @Req() request: Request & { user: AuthenticatedUser },
    @Res({ passthrough: true }) response: Response,
  ) {
    const nonce = this.challenges.read(request.headers.cookie);
    try {
      return await this.google.link(
        request.user,
        dto.credential,
        dto.password,
        nonce,
      );
    } finally {
      response.clearCookie(GOOGLE_COOKIE, this.options());
    }
  }
}
