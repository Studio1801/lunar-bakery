import { useEffect, useState } from "react";
import { toast } from "./Toast";
import { SEASONS, dispatch, uid, useStore, type Product, type Season } from "@/lib/store";

// Phone photos are huge. Shrink them so the site and the sheet stay quick.
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
const ALL = SEASONS.map((x) => x.key);

export function ProductsView() {
  const s = useStore();
  const [draft, setDraft] = useState<Product[]>(s.products);
  const [sure, setSure] = useState<string | null>(null);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(null), 3000); return () => clearTimeout(t); }, [sure]);
  useEffect(() => setDraft(s.products), [s.products]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(s.products);
  const upd = (pid: string, fn: (p: Product) => Product) => setDraft(draft.map((p) => (p.id === pid ? fn(p) : p)));
  const photo = (pid: string, f?: File) => { if (!f) return; shrink(f).then((d) => upd(pid, (p) => ({ ...p, photo: d }))).catch(() => toast("Could not read that photo.")); };
  const flip = (pid: string, k: Season) => upd(pid, (p) => { const now = p.seasons ?? ALL; return { ...p, seasons: ALL.filter((x) => (x === k ? !now.includes(x) : now.includes(x))) }; });

  return (
    <div className="border border-primary bg-card p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Menu</h2>
          <p className="text-sm text-muted-foreground">Everything you sell. Pick the seasons each one is on and it shows on the website that season. Edits go live when you press Save changes.</p>
        </div>
        <div className="flex gap-2">
          {dirty && <button onClick={() => setDraft(s.products)} className="press a-rise px-4 py-3 underline">Discard</button>}
          {dirty && <button onClick={() => void dispatch({ t: "products", products: draft }).then((r) => toast(r.ok ? "Saved. The order page shows it now." : r.error))} className="press a-rise bg-accent px-5 py-3 font-semibold text-accent-foreground">Save changes</button>}
          <button onClick={() => setDraft([...draft, { id: uid(), name: "New product", sizes: [{ id: uid(), pieces: 6, code: "xx6", price: 30, on: true }] }])} className="press bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90">Add a product</button>
        </div>
      </div>
      <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {draft.map((p) => (
          <div key={p.id} className="border border-primary">
            <label className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden border-b border-primary bg-secondary text-muted-foreground">
              {p.photo ? <img src={p.photo} alt={p.name} className="a-fade h-full w-full object-cover" /> : "Add a photo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => photo(p.id, e.target.files?.[0])} />
            </label>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <input value={p.name} onChange={(e) => upd(p.id, (x) => ({ ...x, name: e.target.value }))} className="w-full bg-transparent font-serif text-2xl text-foreground outline-none" />
                <button onClick={() => (sure === p.id ? (setDraft(draft.filter((x) => x.id !== p.id)), setSure(null)) : setSure(p.id))} className={`press shrink-0 text-xs ${sure === p.id ? "bg-destructive px-2 py-1 font-semibold text-destructive-foreground" : "text-muted-foreground underline"}`}>{sure === p.id ? "Tap again" : "remove"}</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Seasons">
                {SEASONS.map(({ key, label }) => { const on = (p.seasons ?? ALL).includes(key); return (
                  <button key={key} onClick={() => flip(p.id, key)} aria-pressed={on} className={`press-sm border px-3 py-1 text-xs font-btn font-bold tracking-[0.08em] ${on ? "border-primary bg-primary text-primary-foreground" : "border-primary/30 text-muted-foreground"}`}>{label}</button>
                ); })}
              </div>
              <div className="mt-3 grid grid-cols-[48px_1fr_80px_40px_20px] gap-2 border-b border-border pb-1 text-xs font-semibold text-muted-foreground"><span>Pieces</span><span>Code</span><span>Price</span><span /><span /></div>
              {p.sizes.map((z) => {
                const set = (patch: Partial<typeof z>) => upd(p.id, (x) => ({ ...x, sizes: x.sizes.map((y) => (y.id === z.id ? { ...y, ...patch } : y)) }));
                return (
                  <div key={z.id} className={`grid grid-cols-[48px_1fr_80px_40px_20px] items-center gap-2 border-b border-border py-2 ${z.on ? "" : "opacity-50"}`}>
                    <input type="number" value={z.pieces} onChange={(e) => set({ pieces: Number(e.target.value) })} className="w-full bg-transparent text-lg outline-none" />
                    <input value={z.code} onChange={(e) => set({ code: e.target.value })} className="code-chip w-24 outline-none" />
                    <span className="flex items-center text-lg"><span className="text-muted-foreground">$</span><input type="number" value={z.price} onChange={(e) => set({ price: Number(e.target.value) })} className="w-full bg-transparent outline-none" /></span>
                    <button onClick={() => set({ on: !z.on })} title={z.on ? "On sale" : "Sold out"} className="press-sm relative h-5 w-10 border-2 border-primary"><span className={`absolute left-0 top-0 h-full w-1/2 transition-[transform,background-color] duration-200 ease-[cubic-bezier(.3,.7,.2,1)] ${z.on ? "translate-x-0 bg-primary" : "translate-x-full bg-muted-foreground"}`} /></button>
                    <button onClick={() => upd(p.id, (x) => ({ ...x, sizes: x.sizes.filter((y) => y.id !== z.id) }))} className="text-muted-foreground hover:text-destructive">×</button>
                  </div>
                );
              })}
              <button onClick={() => upd(p.id, (x) => ({ ...x, sizes: [...x.sizes, { id: uid(), pieces: 12, code: "", price: 0, on: true }] }))} className="mt-2 text-sm text-muted-foreground hover:text-foreground">Add a size</button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-lg text-sm text-muted-foreground">Each card is one item with its sizes. The season buttons decide where it shows on the home page (none selected hides it there, but it can still be ordered). Switch a size off to mark it sold out. Removing keeps old orders as they were.</p>
    </div>
  );
}
