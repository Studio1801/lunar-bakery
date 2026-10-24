import { endSession, requireOrigin } from '../../server/auth';
import { isDatabaseConfigurationError } from '../../server/database';
import { methodNotAllowed, type ApiRequest, type ApiResponse } from '../../server/types';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  if (!requireOrigin(request, response)) return;
  try {
    await endSession(request, response);
    return response.status(200).json({ ok: true });
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return response.status(503).json({ error: 'Staff access is not configured yet.' });
    }
    console.error('Staff sign-out failed');
    return response.status(500).json({ error: 'Could not sign out right now.' });
  }
}
