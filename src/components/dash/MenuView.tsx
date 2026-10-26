import { useEffect, useRef, useState } from "react";
import { dispatch, menuOf, seasonOf, SEASONS, uid, useStore, type Menu, type MenuItem, type Season } from "@/lib/store";
import { toast } from "./Toast";

// Phone photos are huge. Shrink them here so the homepage stays quick.
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("unreadable")); i.src = url; });
    const k = Math.min(1, 720 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally { URL.revokeObjectURL(url); }
}

const bare = (price: string) => price.replace(/^\$/, "");

export function MenuView() {
  const s = useStore();
  const [menu, setMenu] = useState<Menu>(menuOf(s));
  const [showing, setShowing] = useState<Season>(seasonOf(s));
  const [tab, setTab] = useState<Season>(seasonOf(s));
  const [status, setStatus] = useState<"saved" | "waiting" | "saving">("saved");
  const [sure, setSure] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(false);
  const rev = useRef(0);
  const latest = useRef({ menu, showing });
  latest.current = { menu, showing };

  // Changes made on another device show up here, unless an edit of ours is still waiting to save.
  useEffect(() => { if (!pending.current) { setMenu(menuOf(s)); setShowing(seasonOf(s)); } }, [s.menu, s.season]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(null), 3000); return () => clearTimeout(t); }, [sure]);

  const save = (m: Menu, sh: Season, mine: number) => {
    setStatus("saving");
    void dispatch({ t: "menu", menu: m, season: sh }).then((r) => {
      if (rev.current !== mine) return; // a newer edit is already on its way
      pending.current = false;
      if (r.ok) setStatus("saved"); else { setStatus("waiting"); toast(r.error); }
    });
  };
  const edit = (m: Menu, sh: Season = showing) => {
    setMenu(m); setShowing(sh);
    pending.current = true; setStatus("waiting");
    const mine = ++rev.current;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(m, sh, mine), 700);
  };
  // Leaving the tab with an edit still waiting: save it now.
  useEffect(() => () => { clearTimeout(timer.current); if (pending.current) void dispatch({ t: "menu", menu: latest.current.menu, season: latest.current.showing }); }, []);

  const list = menu[tab];
  const setList = (next: MenuItem[]) => edit({ ...menu, [tab]: next });
  const patch = (id: string, p: Partial<MenuItem>) => setList(list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const move = (n: number, d: number) => { const to = n + d; if (to < 0 || to >= list.length) return; const next = [...list]; [next[n], next[to]] = [next[to]!, next[n]!]; setList(next); };
  const photo = (id: string, f?: File) => { if (!f) return; shrink(f).then((p) => patch(id, { photo: p })).catch(() => toast("Could not read that photo.")); };
  const label = SEASONS.find((x) => x.key === tab)!.label;

  const field = "w-full border-b-2 border-border bg-transparent py-1.5 text-lg text-foreground outline-none focus:border-primary";
  return (
    <div className="border border-primary bg-card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Menu</h2>
          <p className="max-w-xl text-sm text-muted-foreground">What visitors see under "This Season's Menu" on the website. Changes save by themselves and show up on the website within a few seconds.</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span aria-live="polite">{status === "saved" ? "All changes saved" : "Saving..."}</span>
          <a href="/#menu" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">View on website ↗</a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border pb-5">
        <div className="flex flex-wrap" role="tablist">
          {SEASONS.map(({ key, label: l }) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`press border px-5 py-2 text-sm font-btn font-bold uppercase tracking-[0.12em] ${tab === key ? "border-primary bg-primary text-primary-foreground" : "border-primary/30 text-primary hover:border-primary"}`}>
              {l}{showing === key && <span className="ml-2 text-[10px] opacity-70">on site</span>}
            </button>
          ))}
        </div>
        {showing !== tab
          ? <button onClick={() => edit(menu, tab)} className="press text-sm text-foreground underline underline-offset-4">Open the website on {label}</button>
          : <span className="text-sm text-muted-foreground">The website opens on {label}. Visitors can still switch seasons.</span>}
      </div>

      <ul className="stagger mt-2 divide-y divide-border">
        {list.map((it, n) => (
          <li key={it.id} className="grid grid-cols-[88px_1fr] items-center gap-4 py-4 sm:grid-cols-[88px_1fr_110px_auto]">
            <label className="flex aspect-square w-[88px] cursor-pointer items-center justify-center overflow-hidden bg-secondary text-center text-xs text-muted-foreground">
              {it.photo ? <img src={it.photo} alt="" className="h-full w-full object-cover" /> : "Add photo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { photo(it.id, e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Name</span>
              <input value={it.name} maxLength={80} onChange={(e) => patch(it.id, { name: e.target.value })} placeholder="Pastry name" className={field} />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Price</span>
              <span className="flex items-center border-b-2 border-border focus-within:border-primary"><span className="text-lg text-muted-foreground">$</span>
                <input value={bare(it.price)} maxLength={10} inputMode="decimal" onChange={(e) => patch(it.id, { price: e.target.value.trim() ? `$${e.target.value.replace(/^\$/, "")}` : "" })} className="w-full bg-transparent py-1.5 text-lg text-foreground outline-none" /></span>
            </label>
            <div className="col-span-2 flex items-center gap-4 text-sm text-muted-foreground sm:col-span-1">
              <button onClick={() => move(n, -1)} disabled={n === 0} aria-label="Move up" className="press px-1 hover:text-foreground disabled:opacity-30">↑</button>
              <button onClick={() => move(n, 1)} disabled={n === list.length - 1} aria-label="Move down" className="press px-1 hover:text-foreground disabled:opacity-30">↓</button>
              <button onClick={() => (sure === it.id ? (setList(list.filter((x) => x.id !== it.id)), setSure(null)) : setSure(it.id))}
                className={`press ${sure === it.id ? "font-semibold text-destructive" : "underline underline-offset-2 hover:text-destructive"}`}>{sure === it.id ? "Tap again to remove" : "remove"}</button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center font-serif text-lg italic text-muted-foreground">Nothing on the {label} menu yet.</li>}
      </ul>

      <button onClick={() => setList([...list, { id: uid(), name: "", price: "" }])} className="press mt-4 bg-primary px-6 py-3 text-sm font-btn font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90">Add an item</button>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground">Items show in this order, four to a row. Boxes people can order and their prices live in the Products tab.</p>
    </div>
  );
}
