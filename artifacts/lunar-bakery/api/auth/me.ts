import { getStaffUser } from '../../server/auth';
import { isDatabaseConfigurationError } from '../../server/database';
import { methodNotAllowed, type ApiRequest, type ApiResponse } from '../../server/types';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  response.setHeader('Cache-Control', 'no-store');
  try {
    const user = await getStaffUser(request);
    if (!user) return response.status(401).json({ error: 'Sign in to continue' });
    return response.status(200).json({ user });
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return response.status(503).json({ error: 'Staff access is not configured yet.' });
    }
    console.error('Staff session check failed');
    return response.status(500).json({ error: 'Could not verify staff access' });
  }
}
