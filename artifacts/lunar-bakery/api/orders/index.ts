import { randomBytes, randomUUID } from 'node:crypto';
import { SEASONAL_MENU } from '../../src/lib/order-catalog';
import { getStaffUser, requireOrigin } from '../../server/auth';
import { ensureSchema, getPool, isDatabaseConfigurationError } from '../../server/database';
import {
  methodNotAllowed,
  readBody,
  type ApiRequest,
  type ApiResponse,
} from '../../server/types';

const PICKUP_WINDOWS = ['10 am–12 pm', '12–2 pm', '2–4 pm', '4–6 pm'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const products = Object.values(SEASONAL_MENU).flat();

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateIsAvailable(value: string) {
  if (!validDate(value)) return false;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const requested = Date.parse(`${value}T00:00:00.000Z`);
  const daysAhead = (requested - today) / (24 * 60 * 60 * 1000);
  return daysAhead >= 0 && daysAhead <= 90;
}

async function listOrders(request: ApiRequest, response: ApiResponse) {
  const staff = await getStaffUser(request);
  if (!staff) return response.status(401).json({ error: 'Sign in to view orders.' });

  const from = request.query?.from;
  const to = request.query?.to;
  if (
    typeof from !== 'string' ||
    typeof to !== 'string' ||
    !validDate(from) ||
    !validDate(to) ||
    from > to
  ) {
    return response.status(400).json({ error: 'Choose a valid date range.' });
  }
  const rangeLength = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
    (24 * 60 * 60 * 1000);
  if (rangeLength > 31) {
    return response.status(400).json({ error: 'Choose a range of 32 days or less.' });
  }
  response.setHeader('Cache-Control', 'no-store');

  const result = await getPool().query(
    `SELECT
       orders.id,
       orders.order_number AS "orderNumber",
       orders.order_type AS "orderType",
       orders.customer_name AS "customerName",
       orders.email,
       orders.phone,
       TO_CHAR(orders.pickup_date, 'YYYY-MM-DD') AS "pickupDate",
       orders.pickup_window AS "pickupWindow",
       orders.notes,
       orders.status,
       orders.total_cents AS "totalCents",
       orders.created_at AS "createdAt",
       orders.updated_at AS "updatedAt",
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'productId', items.product_id,
             'productName', items.product_name,
             'quantity', items.quantity,
             'unitPriceCents', items.unit_price_cents
           )
         ) FILTER (WHERE items.id IS NOT NULL),
         '[]'::json
       ) AS items,
       COALESCE(
         (
           SELECT JSON_AGG(
             JSON_BUILD_OBJECT(
               'eventType', events.event_type,
               'fromStatus', events.from_status,
               'toStatus', events.to_status,
               'detail', events.detail,
               'actor', staff.username,
               'createdAt', events.created_at
             ) ORDER BY events.created_at
           )
           FROM lunar_order_events AS events
           LEFT JOIN lunar_staff AS staff ON staff.id = events.actor_id
           WHERE events.order_id = orders.id
         ),
         '[]'::json
       ) AS events
     FROM lunar_orders AS orders
     LEFT JOIN lunar_order_items AS items ON items.order_id = orders.id
     WHERE orders.pickup_date BETWEEN $1 AND $2
     GROUP BY orders.id
     ORDER BY orders.pickup_date ASC, orders.pickup_window ASC, orders.created_at ASC`,
    [from, to],
  );
  return response.status(200).json({ orders: result.rows });
}

async function createOrder(request: ApiRequest, response: ApiResponse) {
  if (!requireOrigin(request, response)) return;
  const body = readBody(request);
  if (typeof body.website === 'string' && body.website.trim()) {
    return response.status(201).json({ ok: true });
  }

  const orderType = body.orderType === 'custom_cake' ? 'custom_cake' : 'pastry';
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
  const pickupDate = typeof body.pickupDate === 'string' ? body.pickupDate : '';
  const pickupWindow = typeof body.pickupWindow === 'string' ? body.pickupWindow : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  if (customerName.length < 2 || customerName.length > 120) {
    return response.status(400).json({ error: 'Enter a name between 2 and 120 characters.' });
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return response.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!dateIsAvailable(pickupDate)) {
    return response.status(400).json({ error: 'Choose a pickup date within the next 90 days.' });
  }
  if (!PICKUP_WINDOWS.includes(pickupWindow)) {
    return response.status(400).json({ error: 'Choose one of the available pickup windows.' });
  }
  if (notes.length > 800) {
    return response.status(400).json({ error: 'Keep your note under 800 characters.' });
  }
  if (orderType === 'custom_cake' && notes.length < 8) {
    return response.status(400).json({ error: 'Add a few details about the cake you have in mind.' });
  }

  const requestedItems = Array.isArray(body.items) ? body.items : [];
  const items: { productId: string; productName: string; quantity: number; unitPriceCents: number }[] = [];
  if (orderType === 'pastry') {
    if (requestedItems.length < 1 || requestedItems.length > 16) {
      return response.status(400).json({ error: 'Choose at least one pastry.' });
    }
    for (const requestedItem of requestedItems) {
      if (!requestedItem || typeof requestedItem !== 'object') {
        return response.status(400).json({ error: 'One of the selected pastries is not available.' });
      }
      const item = requestedItem as Record<string, unknown>;
      const product = products.find((candidate) => candidate.id === item.productId);
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 24) {
        return response.status(400).json({ error: 'One of the selected pastries is not available.' });
      }
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPriceCents: product.priceCents,
      });
    }
    if (items.reduce((sum, item) => sum + item.quantity, 0) > 48) {
      return response.status(400).json({ error: 'Please keep each request to 48 pastries or fewer.' });
    }
  }

  const totalCents = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );

  try {
    await ensureSchema();
    const database = getPool();
    const client = await database.connect();
    const id = randomUUID();
    const orderNumber = `LUN-${pickupDate.replaceAll('-', '')}-${randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO lunar_orders (
           id, order_number, order_type, customer_name, email, phone,
           pickup_date, pickup_window, notes, total_cents
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          orderNumber,
          orderType,
          customerName,
          email,
          phone || null,
          pickupDate,
          pickupWindow,
          notes,
          totalCents,
        ],
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO lunar_order_items (
             id, order_id, product_id, product_name, quantity, unit_price_cents
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            randomUUID(),
            id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPriceCents,
          ],
        );
      }
      await client.query(
        `INSERT INTO lunar_order_events (id, order_id, event_type, to_status, detail)
         VALUES ($1, $2, 'order_created', 'new', $3)`,
        [randomUUID(), id, orderType === 'custom_cake' ? 'Custom cake inquiry received' : 'Pickup order received'],
      );
      await client.query('COMMIT');
      return response.status(201).json({ orderNumber, orderType });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return response.status(503).json({ error: 'Online ordering is being set up. Please try again soon.' });
    }
    console.error('Order could not be saved');
    return response.status(500).json({ error: 'We could not save your request. Please try again.' });
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === 'GET') return await listOrders(request, response);
    if (request.method === 'POST') return await createOrder(request, response);
    return methodNotAllowed(response, ['GET', 'POST']);
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return response.status(503).json({ error: 'Order storage is not configured yet.' });
    }
    console.error('Order request failed');
    return response.status(500).json({ error: 'Something went wrong with orders.' });
  }
}
