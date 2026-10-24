import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { formatPrice, getCurrentSeason, SEASONAL_MENU } from '@/lib/order-catalog';

type OrderType = 'pastry' | 'custom_cake';
type FormValues = {
  customerName: string;
  email: string;
  phone: string;
  pickupDate: string;
  pickupWindow: string;
  notes: string;
  website: string;
};

const PICKUP_WINDOWS = ['10 am–12 pm', '12–2 pm', '2–4 pm', '4–6 pm'];

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSuggestedPickupDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return localDateString(date);
}

function getLastAvailablePickupDate() {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return localDateString(date);
}

export default function OrderPage() {
  const isCakeRequest = new URLSearchParams(window.location.search).get('type') === 'cake';
  const orderType: OrderType = isCakeRequest ? 'custom_cake' : 'pastry';
  const menu = SEASONAL_MENU[getCurrentSeason()];
  const [step, setStep] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [values, setValues] = useState<FormValues>({
    customerName: '',
    email: '',
    phone: '',
    pickupDate: getSuggestedPickupDate(),
    pickupWindow: '',
    notes: '',
    website: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const items = useMemo(
    () =>
      menu
        .filter((item) => quantities[item.id] > 0)
        .map((item) => ({ ...item, quantity: quantities[item.id] })),
    [menu, quantities],
  );
  const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  function setField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function adjustQuantity(productId: string, change: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(24, (current[productId] ?? 0) + change));
      return { ...current, [productId]: next };
    });
  }

  function continueToDetails() {
    if (!isCakeRequest && items.length === 0) {
      setError('Choose at least one pastry to continue.');
      return;
    }
    setError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function continueToReview() {
    const form = document.querySelector<HTMLFormElement>('#pickup-details');
    if (!form?.reportValidity()) return;
    if (isCakeRequest && values.notes.trim().length < 8) {
      setError('Add a few details about the cake you have in mind.');
      return;
    }
    setError('');
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitOrder() {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType,
          customerName: values.customerName,
          email: values.email,
          phone: values.phone,
          pickupDate: values.pickupDate,
          pickupWindow: values.pickupWindow,
          notes: values.notes,
          website: values.website,
          items: items.map(({ id, quantity }) => ({ productId: id, quantity })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'We could not save your request.');
      }
      setOrderNumber(payload.orderNumber);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'We could not save your request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (orderNumber) {
    return (
      <main className="min-h-screen bg-background text-primary px-5 py-12 md:py-20">
        <section className="mx-auto max-w-xl rounded-2xl bg-white/70 p-7 shadow-sm md:p-10">
          <h1 className="font-serif text-4xl md:text-5xl">
            {isCakeRequest ? 'Your cake request is in.' : 'Your order request is in.'}
          </h1>
          <p className="mt-5 text-primary/70">
            We’ll follow up to confirm the pickup details. No payment has been collected online.
          </p>
          <div className="mt-8 rounded-xl bg-background p-5">
            <p className="text-sm text-primary/60">Reference</p>
            <p className="mt-1 font-serif text-2xl">{orderNumber}</p>
          </div>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Back to Lunar Bakery
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-primary px-4 pb-14 pt-6 md:px-8 md:pt-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="font-serif text-xl text-primary hover:text-secondary">
            Lunar Bakery
          </Link>
          <Link href="/" className="text-sm text-primary/60 hover:text-primary">
            Back to the bakery
          </Link>
        </div>

        <header className="mb-8 md:mb-10">
          <h1 className="font-serif text-4xl md:text-5xl">
            {isCakeRequest ? 'Tell us about your cake.' : 'A little pastry for later.'}
          </h1>
          <p className="mt-3 max-w-2xl text-primary/65">
            {isCakeRequest
              ? 'Share the occasion and the cake you have in mind. We’ll confirm availability and pricing with you.'
              : 'Choose your pastries, request a pickup window, and review everything before sending.'}
          </p>
        </header>

        <div className="mb-8 grid grid-cols-3 gap-2" aria-label="Order steps">
          {['Choose', 'Pickup', 'Review'].map((label, index) => {
            const number = index + 1;
            const active = step === number;
            const completed = step > number;
            return (
              <div
                key={label}
                aria-current={active ? 'step' : undefined}
                className={[
                  'rounded-xl px-3 py-3 text-center text-sm transition',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : completed
                      ? 'bg-secondary/15 text-primary'
                      : 'bg-white/60 text-primary/55',
                ].join(' ')}
              >
                <span className="mr-2 font-semibold">{number}</span>
                {label}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <section className="rounded-2xl bg-white/70 p-5 shadow-sm md:p-8">
            {isCakeRequest ? (
              <div className="rounded-xl bg-background p-6">
                <h2 className="font-serif text-2xl">Custom celebration cake</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary/65">
                  We’ll discuss size, flavor, design, and price with you after you send the request.
                  Add the details on the next step.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl">Choose your pastries</h2>
                    <p className="mt-1 text-sm text-primary/60">
                      This season’s menu · up to 48 pastries per request
                    </p>
                  </div>
                  <span className="text-sm text-primary/60">{items.length} selected</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {menu.map((item) => {
                    const quantity = quantities[item.id] ?? 0;
                    return (
                      <article
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-background p-4"
                      >
                        <div>
                          <h3 className="font-serif text-lg">{item.name}</h3>
                          <p className="mt-1 text-sm text-primary/60">
                            {formatPrice(item.priceCents)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(item.id, -1)}
                            aria-label={`Remove one ${item.name}`}
                            disabled={quantity === 0}
                            className="grid h-9 w-9 place-items-center rounded-full border border-primary/20 text-lg disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center tabular-nums">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => adjustQuantity(item.id, 1)}
                            aria-label={`Add one ${item.name}`}
                            disabled={quantity === 24 || itemCount >= 48}
                            className="grid h-9 w-9 place-items-center rounded-full bg-primary text-lg text-primary-foreground disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
            <div className="mt-7 flex justify-end">
              <button
                type="button"
                onClick={continueToDetails}
                className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Continue to pickup
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-2xl bg-white/70 p-5 shadow-sm md:p-8">
            <h2 className="font-serif text-2xl">Pickup and contact</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary/65">
              Lunar is a pop-up bakery. Your date and time are preferences; we’ll confirm the pickup
              location and availability with you.
            </p>
            <form id="pickup-details" className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Your name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={values.customerName}
                  onChange={(event) => setField('customerName', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                />
              </label>
              <label className="text-sm">
                Email address
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={values.email}
                  onChange={(event) => setField('email', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                />
              </label>
              <label className="text-sm">
                Phone number <span className="text-primary/50">(optional)</span>
                <input
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  value={values.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                />
              </label>
              <label className="text-sm">
                Preferred pickup date
                <input
                  required
                  type="date"
                  min={localDateString(new Date())}
                  max={getLastAvailablePickupDate()}
                  value={values.pickupDate}
                  onChange={(event) => setField('pickupDate', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Preferred pickup window
                <select
                  required
                  value={values.pickupWindow}
                  onChange={(event) => setField('pickupWindow', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                >
                  <option value="">Choose a window</option>
                  {PICKUP_WINDOWS.map((window) => (
                    <option key={window} value={window}>{window}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                {isCakeRequest ? 'Occasion, size, flavors, and design ideas' : 'Anything we should know?'}
                <textarea
                  required={isCakeRequest}
                  minLength={isCakeRequest ? 8 : undefined}
                  maxLength={800}
                  rows={4}
                  value={values.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  placeholder={isCakeRequest ? 'Tell us a little about the celebration and cake.' : 'Allergies, notes for the bakery, or a message.'}
                  className="mt-2 w-full resize-y rounded-xl border border-primary/15 bg-background px-4 py-3 outline-none focus:border-secondary"
                />
              </label>
              <label aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(event) => setField('website', event.target.value)}
                />
              </label>
            </form>

            {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
            <div className="mt-7 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-primary/20 px-6 py-3 text-sm hover:bg-background"
              >
                Back
              </button>
              <button
                type="button"
                onClick={continueToReview}
                className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Review request
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="rounded-2xl bg-white/70 p-5 shadow-sm md:p-8">
            <h2 className="font-serif text-2xl">Review your request</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_0.85fr]">
              <div className="rounded-xl bg-background p-5">
                <h3 className="font-semibold">Your selection</h3>
                {isCakeRequest ? (
                  <div className="mt-4">
                    <p className="font-serif text-lg">Custom celebration cake</p>
                    <p className="mt-1 text-sm text-primary/60">Price to be confirmed</p>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-4 text-sm">
                        <span>{item.quantity} × {item.name}</span>
                        <span>{formatPrice(item.priceCents * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {!isCakeRequest && (
                  <div className="mt-5 flex justify-between pt-4 text-sm font-semibold">
                    <span>Estimated total</span>
                    <span>{formatPrice(totalCents)}</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-background p-5">
                <h3 className="font-semibold">Pickup preference</h3>
                <p className="mt-3 text-sm">{values.pickupDate} · {values.pickupWindow}</p>
                <p className="mt-5 text-sm font-semibold">Contact</p>
                <p className="mt-2 text-sm">{values.customerName}</p>
                <p className="text-sm text-primary/65">{values.email}</p>
                {values.phone && <p className="text-sm text-primary/65">{values.phone}</p>}
                {values.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-primary/65">{values.notes}</p>}
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-primary/60">
              Sending this request does not collect payment or confirm a pickup. Lunar will follow
              up to confirm availability, the exact location, and any quoted price.
            </p>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <div className="mt-7 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full border border-primary/20 px-6 py-3 text-sm hover:bg-background"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting}
                className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Sending…' : 'Send order request'}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
