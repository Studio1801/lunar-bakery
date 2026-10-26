import { useEffect, useMemo, useRef, useState } from "react";
import { dispatch, fmtTime, iso, parse, TIMES, uid, useStore, type Drop } from "@/lib/store";
import { toast } from "./Toast";

const field = "w-full border border-primary/40 bg-background px-3 py-3 text-base outline-none focus:border-primary";
const when = (d: string) => parse(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export function DropsView() {
  const s = useStore();
  const [draft, setDraft] = useState<Drop[]>(s.drops ?? []);
  const [state, setState] = useState<"saved" | "saving" | "edit">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mine = useRef(false);
  const today = iso(new Date());

  // Take in changes from other devices, but never overwrite what is being typed.
  useEffect(() => { if (!mine.current) setDraft(s.drops ?? []); }, [s.drops]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const places = useMemo(() => [...new Set([...(s.drops ?? []).map((d) => d.place), ...Object.values(s.days ?? {}).map((d) => d.place ?? "")].filter(Boolean))], [s.drops, s.days]);

  const push = (next: Drop[]) => {
    setDraft(next); mine.current = true; setState("edit");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState("saving");
      void dispatch({ t: "drops", drops: next }).then((r) => { mine.current = false; setState(r.ok ? "saved" : "edit"); if (!r.ok) toast(r.error); });
    }, 700);
  };
  const upd = (id: string, patch: Partial<Drop>) => push(draft.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const add = () => push([...draft, { id: uid(), date: today, place: "", from: 11 * 60, to: 16 * 60 }]);

  const sorted = [...draft].sort((a, b) => a.date.localeCompare(b.date));
  const next = sorted.find((d) => d.date >= today);

  return (
    <div className="border border-primary bg-card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Next drop</h2>
          <p className="max-w-xl text-sm text-muted-foreground">Where you will be next, like a market or a pop-up. It shows on the website as soon as it saves. Past dates hide themselves.</p>
        </div>
        <div className="flex items-center gap-4">
          <span aria-live="polite" className="text-sm text-muted-foreground">{state === "saved" ? "Saved" : "Saving..."}</span>
          <button onClick={add} className="press bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90">Add a date</button>
        </div>
      </div>

      {sorted.length === 0 && <p className="border border-dashed border-primary/40 p-8 text-center text-muted-foreground">Nothing announced. The website hides this section until you add a date.</p>}

      <datalist id="drop-places">{places.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="stagger grid gap-4 md:grid-cols-2">
        {sorted.map((d) => {
          const past = d.date < today;
          return (
            <div key={d.id} className={`border border-primary p-5 ${past ? "opacity-60" : ""}`}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <p className="font-serif text-xl text-foreground">{when(d.date)}</p>
                <span className="text-xs font-btn font-bold tracking-[0.08em] text-muted-foreground">{past ? "PAST" : d === next ? "NEXT UP" : "LATER"}</span>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm text-muted-foreground">Date
                  <input type="date" value={d.date} onChange={(e) => e.target.value && upd(d.id, { date: e.target.value })} className={field} />
                </label>
                <label className="grid gap-1 text-sm text-muted-foreground">Where
                  <input list="drop-places" value={d.place} placeholder="Maum Market, Ferry Building" onChange={(e) => upd(d.id, { place: e.target.value })} className={field} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["from", "to"] as const).map((k) => (
                    <label key={k} className="grid gap-1 text-sm text-muted-foreground">{k === "from" ? "From" : "Until"}
                      <select value={d[k] ?? ""} onChange={(e) => upd(d.id, { [k]: e.target.value === "" ? undefined : Number(e.target.value) })} className={field}>
                        <option value="">Not set</option>
                        {TIMES.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <label className="grid gap-1 text-sm text-muted-foreground">Note for customers (optional)
                  <input value={d.note ?? ""} maxLength={240} placeholder="Pre-order for pickup at the booth" onChange={(e) => upd(d.id, { note: e.target.value })} className={field} />
                </label>
              </div>
              <button onClick={() => push(draft.filter((x) => x.id !== d.id))} className="press mt-4 text-sm text-muted-foreground underline">Remove this date</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
