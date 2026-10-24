import {
  createSession,
  hashPassword,
  joinCodeMatches,
  newStaffId,
  requireOrigin,
} from '../../server/auth';
import { ensureSchema, getPool, isDatabaseConfigurationError } from '../../server/database';
import { methodNotAllowed, readBody, type ApiRequest, type ApiResponse } from '../../server/types';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  if (!requireOrigin(request, response)) return;
  const body = readBody(request);
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const joinCode = typeof body.joinCode === 'string' ? body.joinCode : '';
  const configuredJoinCode = process.env.ADMIN_JOIN_CODE;

  if (!configuredJoinCode) {
    return response.status(503).json({ error: 'Staff account setup is not configured yet.' });
  }
  if (!USERNAME_PATTERN.test(username)) {
    return response.status(400).json({
      error: 'Use 3–32 letters, numbers, hyphens, or underscores for the username.',
    });
  }
  if (password.length < 12 || password.length > 128) {
    return response.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
  }
  if (!joinCodeMatches(joinCode, configuredJoinCode)) {
    return response.status(403).json({ error: 'That owner join code is not valid.' });
  }

  try {
    await ensureSchema();
    const id = newStaffId();
    const passwordHash = await hashPassword(password);
    await getPool().query(
      'INSERT INTO lunar_staff (id, username, password_hash) VALUES ($1, $2, $3)',
      [id, username, passwordHash],
    );
    await createSession(id, response);
    return response.status(201).json({ user: { id, username } });
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return response.status(503).json({ error: 'Staff account setup is not configured yet.' });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return response.status(409).json({ error: 'That username is already in use.' });
    }
    console.error('Staff account creation failed');
    return response.status(500).json({ error: 'Could not create the staff account.' });
  }
}
