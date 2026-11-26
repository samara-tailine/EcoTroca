import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { isEmail } from 'class-validator';
@Injectable()
export class GoogleTokenService {
  private readonly client = new OAuth2Client();
  constructor(private readonly config: ConfigService) {}
  get clientId() {
    return this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() ?? '';
  }
  async verify(credential: string, nonce: string) {
    if (!this.clientId)
      throw new ServiceUnavailableException(
        'O acesso com Google ainda não está configurado.',
      );
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (
        !payload ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(
          payload.iss,
        ) ||
        payload.aud !== this.clientId ||
        !payload.exp ||
        payload.exp <= Date.now() / 1000 ||
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        payload.sub.length > 255 ||
        (payload as typeof payload & { nonce?: string }).nonce !== nonce ||
        !nonce ||
        payload.email_verified !== true ||
        !payload.email ||
        !isEmail(payload.email) ||
        payload.email.length > 320
      )
        throw new Error('Invalid claims');
      const email = payload.email.trim().toLowerCase();
      return {
        subject: payload.sub,
        email,
        name: (payload.name?.trim() || email.split('@')[0]).slice(0, 160),
      };
    } catch {
      throw new UnauthorizedException(
        'Não foi possível validar o acesso com Google. Tente novamente.',
      );
    }
  }
}
