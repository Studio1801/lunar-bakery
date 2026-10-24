import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import logo from '@assets/lunar_logo.png';
import { formatPrice } from '@/lib/order-catalog';

type StaffUser = { id: string; username: string };
type OrderStatus = 'new' | 'confirmed' | 'ready' | 'picked_up' | 'cancelled';
type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
};
type OrderEvent = {
  eventType: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  detail: string;
  actor: string | null;
  createdAt: string;
};
type BakeryOrder = {
  id: string;
  orderNumber: string;
  orderType: 'pastry' | 'custom_cake';
  customerName: string;
  email: string;
  phone: string | null;
  pickupDate: string;
  pickupWindow: string;
  notes: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
  events: OrderEvent[];
};
type AuthMode = 'login' | 'register';

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  ready: 'Ready',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  return start;
}

function displayDay(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function safeCsv(value: unknown) {
  let text = String(value ?? '').replaceAll('"', '""');
  if (/^[\t\r\n]/.test(text) || /^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text}"`;
}

function downloadCsv(orders: BakeryOrder[]) {
  const columns = [
    'Order number',
    'Type',
    'Pickup date',
    'Pickup window',
    'Customer',
    'Email',
    'Phone',
    'Items',
    'Total',
    'Status',
    'Notes',
  ];
  const rows = orders.map((order) => [
    order.orderNumber,
    order.orderType === 'custom_cake' ? 'Custom cake inquiry' : 'Pastry order',
    order.pickupDate,
    order.pickupWindow,
    order.customerName,
    order.email,
    order.phone || '',
    order.items.map((item) => `${item.quantity} x ${item.productName}`).join('; ') || 'Quote pending',
    order.orderType === 'custom_cake' ? 'Quote pending' : (order.totalCents / 100).toFixed(2),
    STATUS_LABELS[order.status],
    order.notes,
  ]);
  const csv = [columns, ...rows].map((row) => row.map(safeCsv).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lunar-orders-${localDateString(new Date())}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function StaffPage() {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState('');
  const [orders, setOrders] = useState<BakeryOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const weekStart = useMemo(() => {
    const date = startOfWeek(new Date());
    date.setDate(date.getDate() + weekOffset * 7);
    return date;
  }, [weekOffset]);
  const weekEnd = useMemo(() => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 6);
    return date;
  }, [weekStart]);
  const from = localDateString(weekStart);
  const to = localDateString(weekEnd);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        return { date, key: localDateString(date) };
      }),
    [weekStart],
  );
  const loadOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const response = await fetch(`/api/orders?from=${from}&to=${to}`, {
        credentials: 'same-origin',
      });
      const payload = await response.json();
      if (response.status === 401) {
        setUser(null);
        setAuthError('Your staff session ended. Sign in again to view orders.');
        return;
      }
      if (!response.ok) throw new Error(payload.error || 'Could not load the order board.');
      setOrders(payload.orders ?? []);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Could not load the order board.');
    } finally {
      setOrdersLoading(false);
    }
  }, [from, to, user]);

  useEffect(() => {
    let isCurrent = true;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json();
        if (!isCurrent) return;
        if (response.ok) {
          setUser(payload.user);
        } else if (response.status !== 401) {
          setAuthError(payload.error || 'Staff access is not configured yet.');
        }
      })
      .catch(() => {
        if (isCurrent) setAuthError('Could not reach the order service.');
      })
      .finally(() => {
        if (isCurrent) setAuthLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (user) void loadOrders();
  }, [loadOrders, user]);

  useEffect(() => {
    if (!selectedDay || selectedDay < from || selectedDay > to) {
      const today = localDateString(new Date());
      setSelectedDay(today >= from && today <= to ? today : from);
    }
  }, [from, selectedDay, to]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setAuthError('');
    try {
      const response = await fetch(`/api/auth/${authMode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password, joinCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not sign in.');
      setUser(payload.user);
      setPassword('');
      setJoinCode('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setIsBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    setUser(null);
    setOrders([]);
    setAuthMode('login');
  }

  async function setOrderStatus(order: BakeryOrder, status: OrderStatus) {
    setOrdersError('');
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update this order.');
      await loadOrders();
      setExpandedOrder(order.id);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Could not update this order.');
    }
  }

  const dayOrders = useMemo(
    () => orders.filter((order) => order.pickupDate === selectedDay),
    [orders, selectedDay],
  );
  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return dayOrders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [order.orderNumber, order.customerName, order.email, order.phone ?? '']
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [dayOrders, search, statusFilter]);
  const bakeList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of dayOrders) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items) {
        counts.set(item.productName, (counts.get(item.productName) ?? 0) + item.quantity);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dayOrders]);
  const pickupCount = orders.filter((order) => order.status !== 'picked_up' && order.status !== 'cancelled').length;
  const completedCount = orders.filter((order) => order.status === 'picked_up').length;

  if (authLoading) {
    return <div className="min-h-screen bg-background px-6 py-16 text-center text-primary/60">Loading staff access…</div>;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-primary md:px-8 md:py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link href="/" className="block w-36">
              <img src={logo} alt="Lunar Bakery" className="h-auto w-full mix-blend-multiply" />
            </Link>
            <Link href="/" className="text-sm text-primary/60 hover:text-primary">Back to the bakery</Link>
          </div>
          <section className="rounded-2xl bg-white/75 p-6 shadow-sm md:p-8">
            <h1 className="font-serif text-3xl">
              {authMode === 'login' ? 'Welcome back.' : 'Create a staff login.'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-primary/60">
              {authMode === 'login'
                ? 'Sign in to manage pickup orders and the daily bake list.'
                : 'Use the owner’s join code to create a staff account.'}
            </p>
            <form onSubmit={submitAuth} className="mt-6 grid gap-4">
              <label className="text-sm">
                Username
                <input
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                />
              </label>
              <label className="text-sm">
                Password
                <input
                  required
                  minLength={12}
                  maxLength={128}
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                />
              </label>
              {authMode === 'register' && (
                <label className="text-sm">
                  Owner join code
                  <input
                    required
                    type="password"
                    autoComplete="off"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                  />
                </label>
              )}
              {authError && <p role="alert" className="text-sm text-red-700">{authError}</p>}
              <button
                type="submit"
                disabled={isBusy}
                className="mt-1 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {isBusy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="mt-5 text-sm text-primary/65 underline decoration-primary/25 underline-offset-4 hover:text-primary"
            >
              {authMode === 'login' ? 'New here? Create a login' : 'Already have a login? Sign in'}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-primary md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="block w-32">
              <img src={logo} alt="Lunar Bakery" className="h-auto w-full mix-blend-multiply" />
            </Link>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl">Pickup board</h1>
              <p className="mt-1 text-sm text-primary/60">Signed in as {user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full border border-primary/20 px-4 py-2 text-sm hover:bg-white/70">
              View storefront
            </Link>
            <button type="button" onClick={signOut} className="px-3 py-2 text-sm text-primary/65 hover:text-primary">
              Sign out
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl bg-white/70 p-5">
            <p className="text-sm text-primary/60">Orders this week</p>
            <p className="mt-2 font-serif text-3xl">{orders.length}</p>
          </article>
          <article className="rounded-2xl bg-white/70 p-5">
            <p className="text-sm text-primary/60">Still to prepare or hand off</p>
            <p className="mt-2 font-serif text-3xl">{pickupCount}</p>
          </article>
          <article className="rounded-2xl bg-white/70 p-5">
            <p className="text-sm text-primary/60">Picked up</p>
            <p className="mt-2 font-serif text-3xl">{completedCount}</p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl bg-white/70 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl">Orders by pickup date</h2>
              <p className="mt-1 text-sm text-primary/60">
                {displayDay(weekStart)} – {displayDay(weekEnd)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset((value) => value - 1)}
                aria-label="Previous week"
                className="grid h-10 w-10 place-items-center rounded-full border border-primary/20 text-lg hover:bg-background"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
                className="rounded-full border border-primary/20 px-4 py-2 text-sm hover:bg-background disabled:opacity-40"
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((value) => value + 1)}
                aria-label="Next week"
                className="grid h-10 w-10 place-items-center rounded-full border border-primary/20 text-lg hover:bg-background"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => downloadCsv(orders)}
                disabled={orders.length === 0}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {weekDays.map(({ date, key }) => {
              const count = orders.filter((order) => order.pickupDate === key).length;
              const active = selectedDay === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={[
                    'rounded-xl px-3 py-3 text-left transition',
                    active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary/15',
                  ].join(' ')}
                >
                  <span className="block text-sm">{displayDay(date)}</span>
                  <span className={`mt-1 block text-xs ${active ? 'text-primary-foreground/70' : 'text-primary/55'}`}>
                    {count} {count === 1 ? 'order' : 'orders'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="min-w-0 rounded-2xl bg-white/70 p-4 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl">{selectedDay ? displayDay(new Date(`${selectedDay}T12:00:00`)) : 'Orders'}</h2>
                <p className="mt-1 text-sm text-primary/60">
                  {dayOrders.length} {dayOrders.length === 1 ? 'request' : 'requests'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Search orders"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find an order"
                  className="w-40 rounded-full border border-primary/15 bg-background px-4 py-2 text-sm outline-none focus:border-secondary"
                />
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-full border border-primary/15 bg-background px-4 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {ordersError && <p role="alert" className="mt-4 text-sm text-red-700">{ordersError}</p>}
            {ordersLoading ? (
              <p className="py-10 text-center text-sm text-primary/55">Loading orders…</p>
            ) : visibleOrders.length === 0 ? (
              <div className="mt-5 rounded-xl bg-background px-5 py-10 text-center">
                <p className="font-serif text-xl">No orders for this view.</p>
                <p className="mt-2 text-sm text-primary/60">New requests will appear here when customers place them.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleOrders.map((order) => (
                  <article
                    key={order.id}
                    className={[
                      'rounded-xl bg-background p-4 transition',
                      order.status === 'picked_up' ? 'opacity-65' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      aria-expanded={expandedOrder === order.id}
                      className="grid w-full gap-3 text-left md:grid-cols-[minmax(0,1fr)_160px_120px] md:items-center"
                    >
                      <span>
                        <span className={`block font-semibold ${order.status === 'picked_up' ? 'line-through decoration-primary/40' : ''}`}>
                          {order.customerName}
                        </span>
                        <span className="mt-1 block text-xs text-primary/55">
                          {order.orderNumber} · {order.orderType === 'custom_cake' ? 'Cake inquiry' : 'Pastry order'}
                        </span>
                      </span>
                      <span className="text-sm text-primary/65">
                        {order.pickupWindow}
                      </span>
                      <span className="flex items-center justify-between gap-2 md:justify-end">
                        <span
                          className={[
                            'rounded-full px-3 py-1 text-xs',
                            order.status === 'picked_up'
                              ? 'bg-primary/10 text-primary/60'
                              : order.status === 'new'
                                ? 'bg-secondary/20 text-primary'
                                : 'bg-white text-primary/75',
                          ].join(' ')}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                        <span aria-hidden="true" className="text-primary/45">{expandedOrder === order.id ? '−' : '+'}</span>
                      </span>
                    </button>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <span className="text-primary/65">
                        {order.orderType === 'custom_cake'
                          ? 'Quote pending'
                          : order.items.map((item) => `${item.quantity} × ${item.productName}`).join(' · ')}
                      </span>
                      <span className="font-semibold">
                        {order.orderType === 'custom_cake' ? 'Quote pending' : formatPrice(order.totalCents)}
                      </span>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="mt-4 grid gap-5 rounded-xl bg-white/75 p-4 md:grid-cols-2">
                        <div className="space-y-2 text-sm">
                          <p><span className="text-primary/55">Email:</span> {order.email}</p>
                          <p><span className="text-primary/55">Phone:</span> {order.phone || 'Not provided'}</p>
                          {order.notes && (
                            <p className="whitespace-pre-wrap">
                              <span className="text-primary/55">Notes:</span> {order.notes}
                            </p>
                          )}
                          {order.status !== 'picked_up' && order.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => void setOrderStatus(order, 'picked_up')}
                              className="mt-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                              Mark picked up
                            </button>
                          )}
                          {order.status === 'new' && (
                            <button
                              type="button"
                              onClick={() => void setOrderStatus(order, 'confirmed')}
                              className="ml-2 mt-2 rounded-full border border-primary/20 px-4 py-2 text-xs hover:bg-background"
                            >
                              Confirm request
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => void setOrderStatus(order, 'ready')}
                              className="ml-2 mt-2 rounded-full border border-primary/20 px-4 py-2 text-xs hover:bg-background"
                            >
                              Mark ready
                            </button>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'picked_up' && (
                            <button
                              type="button"
                              onClick={() => void setOrderStatus(order, 'cancelled')}
                              className="ml-2 mt-2 rounded-full border border-red-700/20 px-4 py-2 text-xs text-red-700 hover:bg-red-50"
                            >
                              Cancel order
                            </button>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">Order history</h3>
                          <ol className="mt-2 space-y-2">
                            {order.events.map((event, index) => (
                              <li key={`${event.createdAt}-${index}`} className="text-xs leading-relaxed text-primary/65">
                                <span className="font-medium text-primary">
                                  {event.toStatus ? STATUS_LABELS[event.toStatus] : 'Request received'}
                                </span>
                                {' · '}
                                {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}
                                {event.actor && ` · ${event.actor}`}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-2xl bg-primary p-5 text-primary-foreground md:p-6">
            <h2 className="font-serif text-2xl">Bake list</h2>
            <p className="mt-2 text-sm text-primary-foreground/65">
              {selectedDay ? displayDay(new Date(`${selectedDay}T12:00:00`)) : 'Selected day'}
            </p>
            {bakeList.length === 0 ? (
              <p className="mt-6 text-sm text-primary-foreground/60">No pastries to prepare yet.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {bakeList.map(([name, quantity]) => (
                  <li key={name} className="flex justify-between gap-4 text-sm">
                    <span>{name}</span>
                    <span className="font-semibold tabular-nums">{quantity}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-xs leading-relaxed text-primary-foreground/55">
              Cake inquiries are listed separately and excluded from pastry counts.
            </p>
            <button
              type="button"
              onClick={() => void loadOrders()}
              className="mt-6 rounded-full border border-primary-foreground/25 px-4 py-2 text-sm hover:bg-primary-foreground/10"
            >
              Refresh board
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
