import { createSession, verifyPassword } from '../../server/auth';
import { ensureSchema, getPool, isDatabaseConfigurationError } from '../../server/database';
import { methodNotAllowed, readBody, type ApiRequest, type ApiResponse } from '../../server/types';
import { requireOrigin } from '../../server/auth';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  if (!requireOrigin(request, response)) return;
  const body = readBody(request);
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return response.status(400).json({ error: 'Enter your username and password.' });
  }

  try {
    await ensureSchema();
    const result = await getPool().query<{ id: string; username: string; password_hash: string }>(
      'SELECT id, username, password_hash FROM lunar_staff WHERE username = $1 LIMIT 1',
      [username],
    );
    const staff = result.rows[0];
    if (!staff || !(await verifyPassword(password, staff.password_hash))) {
      return response.status(401).json({ error: 'Username or password does not match.' });
    }

    await createSession(staff.id, response);
    return response.status(200).json({ user: { id: staff.id, username: staff.username } });
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return response.status(503).json({ error: 'Staff access is not configured yet.' });
    }
    console.error('Staff sign-in failed');
    return response.status(500).json({ error: 'Could not sign in right now.' });
  }
}
