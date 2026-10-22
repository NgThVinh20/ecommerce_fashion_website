import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '@prisma/client';

export interface TokenPayload {
  sub: number;      // id_user
  role: UserRole;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
}
