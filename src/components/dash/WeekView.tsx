import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DAILY_LIMIT, downloadCsv, fmtTime, iso, mondayOf, money, orderBooked, orderPieces, parse, dispatch, sizeIndex, itemsText, useStore, weekDays, getState, isLive, statusOf, dayHours, OPEN_FROM, OPEN_TO, TIMES, type Order } from "@/lib/store";
import { Drawer } from "./Drawer";
import { OrderForm } from "./OrderForm";
import { OrderPanel } from "./OrderPanel";
import { unreadIn } from "./Inbox";
import { onOpenOrder } from "./bus";
import { toast } from "./Toast";

type Panel = { kind: "write"; date: string; order?: Order | undefined } | { kind: "bake"; date: string } | { kind: "numbers" } | null;
const WEEK = 7 * 864e5;
const weekOf = (date: string) => Math.round((mondayOf(0, parse(date)).getTime() - mondayOf(0).getTime()) / WEEK);
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

export function WeekView({ numbersOpen, setNumbersOpen, onMessages }: { numbersOpen: boolean; setNumbersOpen: (v: boolean) => void; onMessages?: () => void }) {
  const s = useStore();
  const [week, setWeek] = useState(0);
  const [sel, setSel] = useState(iso(new Date()));
  const [panel, setPanel] = useState<Panel>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set()); // ticked during this visit, so the strike animates
  const [just, setJust] = useState<Set<string>>(new Set()); // new on the board, so it slides in
  const [clock, setClock] = useState(nowMin());
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => { const t = setInterval(() => setClock(nowMin()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const ids = new Set(s.orders.map((o) => o.id));
    if (seen.current) {
      const added = [...ids].filter((i) => !seen.current!.has(i));
      if (added.length) { setJust(new Set(added)); setTimeout(() => setJust(new Set()), 1000); }
    }
    seen.current = ids;
  }, [s.orders]);

  const idx = sizeIndex(s.products);
  const days = weekDays(week);
  const first = days[0]!, last = days[5]!;
  const today = iso(new Date());
  const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const selDate = days.some((d) => iso(d) === sel) ? sel : iso(days[0]!);
  const weekOrders = s.orders.filter((o) => o.date >= iso(first) && o.date <= iso(last));
  const dayOrders = (k: string) => s.orders.filter((o) => o.date === k).sort((a, b) => (a.pending ? 0 : 1) - (b.pending ? 0 : 1) || a.time - b.time);
  const dayPieces = (k: string) => dayOrders(k).filter(isLive).reduce((n, o) => n + orderPieces(o, idx), 0);
  const dayList = dayOrders(selDate);
  const pending = s.orders.filter((o) => o.pending && !o.cancelled).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const threadOf = (id: string) => Object.values(s.threads ?? {}).find((t) => t.orderId === id);
  const unreadOrder = (id: string) => { const t = threadOf(id); return t ? unreadIn(t) : 0; };
  const unreadAll = Object.values(s.threads ?? {}).reduce((n, t) => n + unreadIn(t), 0);
  const confirmNew = (o: Order) => void dispatch({ t: "status", id: o.id, s: "confirm" }).then((r) => toast(r.ok ? `Confirmed ${o.name}. They can see it on their order page.` : r.error));
  const toggle = (id: string, v: boolean) => {
    setPicked((p) => new Set(p).add(id));
    void dispatch({ t: "done", id, v }).then((r) => { if (!r.ok) toast(r.error); });
  };
  const go = (n: number) => { if (n === week) return; setPicked(new Set()); setWeek(n); setSel(n === 0 ? iso(new Date()) : iso(weekDays(n)[0]!)); };
  const open = (o: Order) => { setWeek(weekOf(o.date)); setSel(o.date); setPanel({ kind: "write", date: o.date, order: o }); };
  // "Open order" from the Messages inbox.
  useEffect(() => onOpenOrder((id) => { const o = getState().orders.find((x) => x.id === id); if (o) open(o); }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sub = week === 0 ? "This week" : week === -1 ? "Last week" : week === 1 ? "Next week" : `${Math.abs(week)} weeks ${week < 0 ? "ago" : "ahead"}`;
  const active: Panel = numbersOpen ? { kind: "numbers" } : panel;
  const close = () => { setPanel(null); setNumbersOpen(false); };

  const exportCsv = () =>
    downloadCsv(`lunar-orders-${iso(first)}.csv`, [
      ["Date", "Time", "Name", "Phone", "Items", "Pieces", "Booked", "Note", "Source", "Picked up"],
      ...weekOrders.sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time).map((o) => [o.date, fmtTime(o.time), o.name, o.phone, itemsText(o, idx), orderPieces(o, idx), orderBooked(o, idx), o.note, o.source, s.done[o.id] ? "yes" : "no"]),
    ]);

  return (
    <>
      {(pending.length > 0 || unreadAll > 0) && (
        <div role="status" className="a-rise mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 bg-primary px-5 py-3.5 text-primary-foreground">
          {pending.length > 0 && (
            <button onClick={() => { const o = pending[0]!; setWeek(weekOf(o.date)); setSel(o.date); }} className="press text-left font-serif text-lg">
              {pending.length} new online order{pending.length > 1 ? "s" : ""} to confirm <span className="underline underline-offset-4">Show me</span>
            </button>
          )}
          {unreadAll > 0 && <button onClick={onMessages} className="press ml-auto bg-primary-foreground px-4 py-2 font-btn text-xs font-bold tracking-[0.12em] text-primary">{unreadAll} new message{unreadAll > 1 ? "s" : ""}</button>}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="font-serif text-xl text-foreground">{short(first)} to {short(last)}{week !== 0 && <span className="ml-2 text-base text-muted-foreground">{sub}</span>}</div>
        <div className="flex items-center gap-4">
          {week !== 0 && <button onClick={() => go(0)} className="press text-sm underline underline-offset-4">This week</button>}
          <button onClick={() => go(week - 1)} aria-label="Last week" className="press flex h-11 w-11 items-center justify-center border border-border hover:bg-secondary"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => go(week + 1)} aria-label="Next week" className="press flex h-11 w-11 items-center justify-center border border-border hover:bg-secondary"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div role="tablist" aria-label="Day" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {days.map((d) => {
          const k = iso(d), n = dayOrders(k).filter(isLive).length, wait = dayOrders(k).some((o) => o.pending && !o.cancelled), on = k === selDate;
          return (
            <button key={k} role="tab" aria-selected={on} onClick={() => setSel(k)}
              className={`press relative px-3 py-3 text-left ${on ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:border-primary"}`}>
              <span className={`block text-xs ${on ? "opacity-80" : "text-muted-foreground"}`}>{k === today ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className="block font-serif text-3xl leading-tight">{d.getDate()}</span>
              <span className={`block text-sm ${on ? "opacity-90" : "text-muted-foreground"}`}>{s.closed[k] && !n ? "Closed" : n ? `${n} order${n > 1 ? "s" : ""}` : "None"}</span>
              {wait && <span aria-label="Needs confirming" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>

      <div key={selDate} className="a-fade mt-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="font-serif text-3xl leading-tight text-foreground">{parse(selDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
            <p className="mt-1 text-muted-foreground">
              {dayList.length === 0 ? "No orders yet" : `${dayList.length} order${dayList.length > 1 ? "s" : ""}, ${dayPieces(selDate)} pieces`}
              {s.closed[selDate] && <span className="ml-2 text-foreground">Closed to online orders</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button onClick={() => setPanel({ kind: "bake", date: selDate })} className="press text-sm underline underline-offset-4">Bake list and pickup</button>
            <button onClick={() => setPanel({ kind: "write", date: selDate })} className="press bg-primary px-6 py-3 font-btn text-sm font-bold tracking-[0.12em] text-primary-foreground hover:bg-primary/90">Add an order</button>
          </div>
        </div>

        <ul className="mt-5 max-w-3xl space-y-3">
          {dayList.map((o) => {
            const st = statusOf(o, s.done), unread = unreadOrder(o.id);
            const gone = st === "cancelled" || st === "declined";
            const h = Math.floor(o.time / 60), mm = String(o.time % 60).padStart(2, "0");
            const go1 = (op: Parameters<typeof dispatch>[0], msg: string) => void dispatch(op).then((r) => toast(r.ok ? msg : r.error));
            return (
              <li key={o.id} className={`ent border bg-card ${st === "pending" ? "border-accent" : "border-border"} ${gone || st === "picked" ? "opacity-60" : ""} ${just.has(o.id) ? "just" : ""}`}>
                <div className="flex gap-4 p-4 sm:gap-6 sm:p-5">
                  <div className="w-20 shrink-0 text-right sm:w-24">
                    <div className="font-mono text-2xl font-medium leading-none text-foreground sm:text-3xl">{h % 12 || 12}:{mm}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{h < 12 ? "am" : "pm"}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-serif text-2xl font-semibold leading-tight text-foreground">{o.name}</span>
                      {st === "pending" && <span className="bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">New online order</span>}
                      {st === "ready" && <span className="text-sm font-semibold text-accent">Ready</span>}
                      {st === "picked" && <span className="text-sm text-muted-foreground">Picked up</span>}
                      {gone && <span className="text-sm text-muted-foreground">{st === "cancelled" ? "Cancelled by customer" : "Declined"}</span>}
                    </div>
                    <div className="mt-2 space-y-0.5 text-lg text-foreground/85">
                      {o.items.map((i, n) => { const m = idx.get(i.code); return <div key={n}>{i.qty} × {m ? m.product.name : i.code}{m && <span className="text-muted-foreground"> · box of {m.size.pieces}</span>}</div>; })}
                    </div>
                    {o.note && <p className="mt-2 font-serif text-lg italic text-primary">{o.note}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{o.source === "online" ? "Ordered online" : "Written by hand"}</span>
                      {o.phone && <a href={`tel:${o.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4 hover:text-foreground">{o.phone}</a>}
                      {unread > 0 && <button onClick={() => open(o)} className="press font-semibold text-accent">{unread} new message{unread > 1 ? "s" : ""}</button>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5">
                  {st === "pending" && <>
                    <button onClick={() => go1({ t: "status", id: o.id, s: "confirm" }, `Confirmed ${o.name}. They can see it on their order page.`)} className="press min-h-11 bg-primary px-6 font-btn text-sm font-bold tracking-[0.12em] text-primary-foreground hover:bg-primary/90">Confirm</button>
                    <button onClick={() => open(o)} className="press min-h-11 px-3 text-sm underline underline-offset-4">Decline</button>
                  </>}
                  {st === "confirmed" && <button onClick={() => go1({ t: "status", id: o.id, s: "ready" }, `${o.name} is marked ready.`)} className="press min-h-11 bg-primary px-6 font-btn text-sm font-bold tracking-[0.12em] text-primary-foreground hover:bg-primary/90">Mark ready</button>}
                  {st === "ready" && <>
                    <button onClick={() => { toggle(o.id, true); toast(`Picked up: ${o.name}`); }} className="press min-h-11 bg-primary px-6 font-btn text-sm font-bold tracking-[0.12em] text-primary-foreground hover:bg-primary/90">Picked up</button>
                    <button onClick={() => go1({ t: "status", id: o.id, s: "unready" }, "Back to confirmed.")} className="press min-h-11 px-3 text-sm underline underline-offset-4">Not ready yet</button>
                  </>}
                  {st === "picked" && <button onClick={() => toggle(o.id, false)} className="press min-h-11 px-3 text-sm underline underline-offset-4">Undo picked up</button>}
                  <button onClick={() => open(o)} className="press ml-auto min-h-11 px-3 text-sm underline underline-offset-4">Details</button>
                </div>
              </li>
            );
          })}
        </ul>
        {dayList.length === 0 && (
          <div className="mt-5 border border-dashed border-border px-6 py-14 text-center">
            <p className="font-serif text-2xl italic text-muted-foreground">{s.closed[selDate] ? "Closed to online orders." : "Nothing booked for this day."}</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <button onClick={() => void dispatch({ t: "closed", date: selDate, v: !s.closed[selDate] }).then((r) => toast(r.ok ? (s.closed[selDate] ? "Open to online orders again" : "Closed to online orders") : r.error))} className="press underline underline-offset-4">
            {s.closed[selDate] ? "Reopen this day to online orders" : "Close this day to online orders"}
          </button>
          <button onClick={() => setNumbersOpen(true)} className="press text-muted-foreground underline underline-offset-4 hover:text-foreground">Week totals</button>
          <button onClick={exportCsv} className="press text-muted-foreground underline underline-offset-4 hover:text-foreground">Export CSV</button>
        </div>
      </div>

      <Drawer open={!!active} onClose={close}>
        {active?.kind === "write" && (active.order
          ? <OrderPanel key={active.order.id} order={active.order} weekOffset={weekOf(active.order.date)} onDone={close} />
          : <OrderForm key={active.date} date={active.date} weekOffset={week} onDone={close} />)}
        {active?.kind === "bake" && BakeList({ date: active.date, onWrite: () => setPanel({ kind: "write", date: active.date }) })}
        {active?.kind === "numbers" && (() => {
          const max = Math.max(DAILY_LIMIT, ...days.map((d) => dayPieces(iso(d))));
          return (
            <div>
              <h2 className="pr-12 font-serif text-3xl text-foreground">{short(first)} to {short(last)}</h2>
              <div className="stagger mt-4 grid grid-cols-3">
                {[[weekOrders.length, "orders"], [weekOrders.reduce((n, o) => n + orderPieces(o, idx), 0), "pieces"], [money(weekOrders.reduce((n, o) => n + orderBooked(o, idx), 0)), "booked"]].map(([v, l]) => (
                  <div key={l}><div className="font-serif text-3xl text-foreground">{v}</div><div className="text-sm text-muted-foreground">{l}</div></div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {days.map((d, i) => {
                  const p = dayPieces(iso(d));
                  return (
                    <div key={iso(d)} className="flex items-center gap-3">
                      <span className="w-16 text-foreground">{d.toLocaleDateString("en-US", { weekday: "short" })} {d.getDate()}</span>
                      <div className="h-4 flex-1 bg-secondary"><div className={`growx h-full ${p > DAILY_LIMIT ? "bg-destructive" : "bg-primary"}`} style={{ width: `${(p / max) * 100}%`, animationDelay: `${i * 0.04}s` }} /></div>
                      <span className="w-10 text-right tabular-nums text-foreground">{p}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">Pieces booked per day. A day turns red above {DAILY_LIMIT}.</p>
            </div>
          );
        })()}
      </Drawer>
    </>
  );

  function BakeList({ date, onWrite }: { date: string; onWrite: () => void }) {
    const list = dayOrders(date).filter(isLive);
    const rows = new Map<string, { label: string; pieces: number; parts: Map<number, number> }>();
    list.forEach((o) => o.items.forEach((i) => {
      const m = idx.get(i.code); if (!m) return;
      const label = m.product.name;
      const r = rows.get(label) ?? { label, pieces: 0, parts: new Map() };
      r.pieces += i.qty * m.size.pieces;
      r.parts.set(m.size.pieces, (r.parts.get(m.size.pieces) ?? 0) + i.qty);
      rows.set(label, r);
    }));
    const total = dayPieces(date);
    const count = (st: string) => list.filter((o) => statusOf(o, s.done) === st).length;
    return (
      <div>
        <h2 className="pr-12 font-serif text-3xl leading-tight text-foreground">Bake list, {parse(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
        <div className={`a-rise mt-4 font-serif text-7xl leading-none tabular-nums ${total > DAILY_LIMIT ? "text-destructive" : "text-foreground"}`}>{total}</div>
        <p className="mt-1 text-muted-foreground">pieces across {list.length} order{list.length === 1 ? "" : "s"}, daily limit {DAILY_LIMIT}</p>
        {list.length > 0 && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {[["pending", "to confirm"], ["confirmed", "confirmed"], ["ready", "ready"], ["picked", "picked up"]].map(([k, l]) => `${count(k!)} ${l}`).join(" · ")}
          </p>
        )}
        <ul className="stagger mt-4">
          {[...rows.values()].sort((a, b) => b.pieces - a.pieces).map((r) => (
            <li key={r.label} className="border-t border-border py-3">
              <div className="flex justify-between font-serif text-xl text-foreground"><span>{r.label}</span><span className="tabular-nums">{r.pieces}</span></div>
              <div className="text-sm text-muted-foreground">{[...r.parts].sort((a, b) => b[0] - a[0]).map(([p, q]) => `${q} box${q > 1 ? "es" : ""} of ${p}`).join(", ")}</div>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="mt-6 text-muted-foreground">Nothing booked for this day yet.</p>}
        <button onClick={onWrite} className="press mt-6 bg-primary px-5 py-3 font-btn text-sm font-bold uppercase tracking-[0.12em] text-primary-foreground hover:opacity-90">Write an order</button>
        <DaySettings key={date} date={date} />
      </div>
    );
  }



}


// Where and when customers pick up on this day. The order page and the homepage show it straight away.
function DaySettings({ date }: { date: string }) {
  const s = useStore();
  const cur = dayHours(s.days?.[date]);
  const places = [...new Set(Object.values(s.days ?? {}).map((d) => d.place).filter(Boolean) as string[])];
  const [place, setPlace] = useState(s.days?.[date]?.place ?? "");
  const [from, setFrom] = useState(cur.from);
  const [to, setTo] = useState(cur.to);
  const closed = !!s.closed[date];
  const dirty = place !== (s.days?.[date]?.place ?? "") || from !== cur.from || to !== cur.to;
  const hours = [...new Set([...TIMES, OPEN_TO, OPEN_TO + 30, OPEN_TO + 60])];
  const sel = "border-b-2 border-border bg-transparent py-1.5 text-lg outline-none focus:border-primary";
  return (
    <section className="mt-10 border-t-2 border-primary pt-5">
      <h3 className="font-serif text-2xl font-medium text-foreground">Pickup for this day</h3>
      <p className="mb-4 text-sm text-muted-foreground">Customers see this on the order page and the homepage, the moment you save.</p>
      <label className="block"><span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Place</span>
        <input list="lunar-places" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={`${cur.place} (usual)`} className={`${sel} w-full`} />
        <datalist id="lunar-places">{places.map((p) => <option key={p} value={p} />)}</datalist>
      </label>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <label><span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">From</span>
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className={`${sel} w-full`}>{hours.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}</select></label>
        <label><span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">To</span>
          <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={`${sel} w-full`}>{hours.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}</select></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        {dirty && <button onClick={() => void dispatch({ t: "day", date, info: { place: place.trim() || undefined, from: from === OPEN_FROM ? undefined : from, to: to === OPEN_TO ? undefined : to } }).then((r) => toast(r.ok ? "Saved. Customers see the new pickup details now." : r.error))}
          className="press a-rise bg-primary px-5 py-3 font-btn text-sm font-bold uppercase tracking-[0.12em] text-primary-foreground">Save pickup details</button>}
        <button onClick={() => void dispatch({ t: "closed", date, v: !closed }).then((r) => toast(r.ok ? (closed ? "Open to online orders again" : "Closed to online orders") : r.error))}
          className={`press text-sm ${closed ? "font-semibold text-accent" : "text-foreground"} underline underline-offset-4`}>{closed ? "Closed to online orders. Reopen" : "Close this day to online orders"}</button>
      </div>
    </section>
  );
}
