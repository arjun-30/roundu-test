import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';

export type UserRole = 'customer' | 'provider' | 'admin';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  phone?: string;
  v?: number; // session version
}

const ISSUER = 'roundu-api';
const AUDIENCE = 'roundu-app';

function getAccessSecret(): string {
  const s = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set and at least 32 characters');
  }
  return s;
}

function getRefreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters');
  }
  return s;
}

export function signAccessToken(
  payload: { sub: string; role: UserRole; phone?: string; v?: number },
  expiresIn: string = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
): string {
  const opts: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'], issuer: ISSUER, audience: AUDIENCE };
  return jwt.sign(payload, getAccessSecret(), opts);
}

export function signRefreshToken(
  payload: { sub: string; role: UserRole },
  expiresIn: string = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
): string {
  const opts: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'], issuer: ISSUER, audience: AUDIENCE };
  return jwt.sign(payload, getRefreshSecret(), opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getAccessSecret(), { issuer: ISSUER, audience: AUDIENCE }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getRefreshSecret(), { issuer: ISSUER, audience: AUDIENCE }) as AccessTokenPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  const decoded = jwt.decode(token);
  return typeof decoded === 'object' ? decoded : null;
}
