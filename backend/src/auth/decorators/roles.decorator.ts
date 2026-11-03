import { SetMetadata } from '@nestjs/common';
import { AccessProfileKey } from '../../users/access-profile.constants.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AccessProfileKey[]) =>
  SetMetadata(ROLES_KEY, roles);