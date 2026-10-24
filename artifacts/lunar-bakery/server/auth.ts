import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { ensureSchema, getPool } from './database';
import type { ApiRequest, ApiResponse } from './types';

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = 'lunar_staff_session';
const SESSION_LENGTH_DAYS = 14;

export type StaffUser = { id: string; username: string };

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function getCookie(request: ApiRequest, name: string) {
  const header = request.headers.cookie;
  if (!header) return undefined;
  const entry = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

function cookieValue(token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, 'hex');
  const actual = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function joinCodeMatches(candidate: string, expected: string | undefined) {
  if (!expected) return false;
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return (
    candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes)
  );
}

export async function createSession(userId: string, response: ApiResponse) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_DAYS * 24 * 60 * 60 * 1000);
  await getPool().query(
    `INSERT INTO lunar_sessions (token_hash, staff_id, expires_at)
     VALUES ($1, $2, $3)`,
    [hashToken(token), userId, expiresAt],
  );
  response.setHeader(
    'Set-Cookie',
    cookieValue(token, SESSION_LENGTH_DAYS * 24 * 60 * 60),
  );
}

export async function getStaffUser(request: ApiRequest): Promise<StaffUser | null> {
  await ensureSchema();
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;

  const result = await getPool().query<StaffUser>(
    `SELECT staff.id, staff.username
       FROM lunar_sessions AS sessions
       JOIN lunar_staff AS staff ON staff.id = sessions.staff_id
      WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()
      LIMIT 1`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function endSession(request: ApiRequest, response: ApiResponse) {
  const token = getCookie(request, COOKIE_NAME);
  if (token) {
    await ensureSchema();
    await getPool().query('DELETE FROM lunar_sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  response.setHeader('Set-Cookie', cookieValue('', 0));
}

export function newStaffId() {
  return randomUUID();
}

export function requireOrigin(request: ApiRequest, response: ApiResponse) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    response.status(403).json({ error: 'Request origin is not allowed' });
    return false;
  }
}
