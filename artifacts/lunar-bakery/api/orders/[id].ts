import { randomUUID } from 'node:crypto';
import { getStaffUser, requireOrigin } from '../../server/auth';
import { ensureSchema, getPool, isDatabaseConfigurationError } from '../../server/database';
import { methodNotAllowed, readBody, type ApiRequest, type ApiResponse } from '../../server/types';

const ALLOWED_STATUSES = ['new', 'confirmed', 'ready', 'picked_up', 'cancelled'];

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'PATCH') return methodNotAllowed(response, ['PATCH']);
  if (!requireOrigin(request, response)) return;
  try {
    const staff = await getStaffUser(request);
    if (!staff) return response.status(401).json({ error: 'Sign in to update orders.' });

    const id = request.query?.id;
    const body = readBody(request);
    const status = typeof body.status === 'string' ? body.status : '';
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
      return response.status(400).json({ error: 'Choose a valid order.' });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return response.status(400).json({ error: 'Choose a valid order status.' });
    }

    await ensureSchema();
    const database = getPool();
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query<{ status: string }>(
        'SELECT status FROM lunar_orders WHERE id = $1 FOR UPDATE',
        [id],
      );
      const order = current.rows[0];
      if (!order) {
        await client.query('ROLLBACK');
        return response.status(404).json({ error: 'That order could not be found.' });
      }
      if (order.status === 'cancelled' && status !== 'cancelled') {
        await client.query('ROLLBACK');
        return response.status(409).json({ error: 'Cancelled orders cannot be reopened here.' });
      }
      if (order.status === status) {
        await client.query('COMMIT');
        return response.status(200).json({ ok: true, status });
      }

      await client.query(
        'UPDATE lunar_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, id],
      );
      await client.query(
        `INSERT INTO lunar_order_events (
           id, order_id, actor_id, event_type, from_status, to_status, detail
         ) VALUES ($1, $2, $3, 'status_changed', $4, $5, $6)`,
        [randomUUID(), id, staff.id, order.status, status, `Changed by ${staff.username}`],
      );
      await client.query('COMMIT');
      return response.status(200).json({ ok: true, status });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return response.status(503).json({ error: 'Order storage is not configured yet.' });
    }
    console.error('Order status update failed');
    return response.status(500).json({ error: 'Could not update that order.' });
  }
}
