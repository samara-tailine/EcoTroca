import { BadRequestException } from '@nestjs/common';
import type { AccessProfileKey } from './access-profile.constants.js';

export function assertCompatibleAccessProfiles(
  keys: readonly AccessProfileKey[],
): void {
  if (
    keys.includes('ADMIN') &&
    (keys.includes('LIBRARY') || keys.includes('XEROX'))
  ) {
    throw new BadRequestException(
      'O perfil Administrador técnico não pode ser combinado com Administrador da Biblioteca ou Administrador da Xerox.',
    );
  }
  if (keys.includes('LIBRARY') && keys.includes('XEROX')) {
    throw new BadRequestException(
      'Os perfis Administrador da Biblioteca e Administrador da Xerox não podem coexistir na mesma conta.',
    );
  }
}
