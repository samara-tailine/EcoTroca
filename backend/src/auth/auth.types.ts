import { AccessProfileKey } from '../users/access-profile.constants.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: AccessProfileKey[];
}