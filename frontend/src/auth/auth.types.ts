export interface SessionUser {
  id: string;
  name: string;
  email: string;
  accessProfiles: { key: string; name: string }[];
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  user: SessionUser;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: SessionUser;
}