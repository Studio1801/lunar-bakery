import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_PLACE, OPEN_FROM, OPEN_TO, custOp, custStatus, fmtTime, fromLine, inSeason, me, parse, remember, seasonNow, secret, uid, useCustomerSync, useMine, usePublic, type Msg } from "@/lib/store";
import { Conversation } from "@/components/chat/Conversation";

/*
 * "Chat with us": a launcher in the corner of every customer page. It opens a small card
 * (chat, email, order), and the chat itself has quick answers for the usual questions.
 * Quick answers stay on this device. Anything typed goes to Jennie's Messages tab, and her replies come back here.
 */
export function ChatBubble({ lift }: { lift?: boolean }) {
  useCustomerSync();
  const mine = useMine();
  const pub = usePublic();
  const [view, setView] = useState<"closed" | "card" | "chat">("closed");
  const open = view === "chat";
  const setOpen = (o: boolean) => setView(o ? "chat" : "closed");
  const [local, setLocal] = useState<Msg[]>([]);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => { setMounted(true); setName(me().name ?? ""); }, []);

  const key = mounted ? me().threads.find((t) => t.id.startsWith("c-")) : undefined;
  const thread = key ? mine.threads.find((t) => t.id === key.id) : undefined;
  const orderThreads = mine.threads.filter((t) => t.orderId);
  const unreadOf = (t: { msgs: { from: string }[]; custSeen: number }) => t.msgs.slice(t.custSeen).filter((m) => m.from === "bakery").length;
  const unread = (thread ? unreadOf(thread) : 0) + orderThreads.reduce((n, t) => n + unreadOf(t), 0);

  // Opening the chat marks the bakery's replies as read.
  useEffect(() => {
    if (open && thread && key && unreadOf(thread)) void custOp({ t: "read", thread: thread.id, token: key.token });
  }, [open, thread?.msgs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const send = async (text: string) => {
    const k = key ?? { id: "c-" + uid(), token: secret() };
    // Keep the key first, so the reply check right after sending already knows this conversation.
    if (!key) remember("threads", k, { name: name.trim() || undefined });
    return custOp({ t: "say", thread: k.id, token: k.token, text, name: name.trim() || undefined, phone: me().phone });
  };

  const say = (q: string, a: string) => {
    const t = Date.now();
    setLocal((l) => [...l, { id: "q" + uid(), from: "customer", text: q, at: t }, { id: "a" + uid(), from: "bakery", text: a, at: t + 1 }]);
  };
  const season = seasonNow();
  const menuLine = () => {
    const here = pub.products.filter((p) => p.name.trim() && inSeason(p, season));
    return here.length ? `This ${season}: ${here.map((p) => `${p.name}${fromLine(p) ? ` (${fromLine(p)})` : ""}`).join(", ")}. You can order any of it online for pickup.` : "The menu is being updated. Check back soon, or ask us below.";
  };
  const chips = [
    { label: "What's on the menu", pick: () => say("What's on the menu?", menuLine()) },
    { label: "Pickup and hours", pick: () => say("Where do I pick up?", `Pickup is at ${DEFAULT_PLACE}, usually ${fmtTime(OPEN_FROM)} to ${fmtTime(OPEN_TO)}. Pop-up days can differ, and the order page shows each day's place and hours.`) },
    { label: "Custom cake", pick: () => say("I'd like a custom cake", "Cakes are made to order and quoted by Jennie. Write the date you need it, how many people, and any flavors you have in mind, and she will answer here.") },
    { label: "Allergies", pick: () => say("I have an allergy", "Tell us what you need to avoid and Jennie will answer before you order, since ingredients change with the seasons.") },
    { label: "Place an order", pick: () => { window.location.href = "/order"; } },
  ];
  const shown = [...(thread?.msgs ?? []), ...local].sort((a, b) => a.at - b.at);

  if (!mounted) return null;
  return createPortal(
    <>
      {view === "card" && (
        <div role="dialog" aria-label="Contact Lunar Bakery" className={`a-popin fixed right-4 z-40 w-[min(320px,calc(100vw-32px))] rounded-3xl bg-background p-5 shadow-xl ${lift ? "bottom-40 lg:bottom-24" : "bottom-24"}`}>
          <p className="font-serif text-xl font-medium leading-tight text-foreground">Questions? Cakes? Allergies?</p>
          <p className="mt-1 text-sm text-muted-foreground">Write to us here and Jennie answers, usually the same day.</p>
          <button onClick={() => setView("chat")} className="press mt-4 flex w-full flex-col items-center rounded-full bg-primary px-5 py-3 text-primary-foreground">
            <span className="font-semibold">Chat here</span><span className="text-xs opacity-80">Orders or questions, right here</span>
          </button>
          <a href="mailto:lunarbakerysf@gmail.com" className="press mt-2 block rounded-full bg-secondary px-5 py-3 text-center font-semibold text-foreground">Email us</a>
          <a href="/order" className="press mt-2 block rounded-full bg-secondary px-5 py-3 text-center font-semibold text-foreground">Order online</a>
        </div>
      )}
      {open && (
        <div role="dialog" aria-label="Message Lunar Bakery" className={`a-popin fixed right-4 z-40 flex max-h-[min(640px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl bg-background shadow-xl ${lift ? "bottom-40 lg:bottom-24" : "bottom-24"}`}>
          <div className="flex items-center gap-3 bg-primary px-5 py-4 text-primary-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-lg font-semibold text-accent-foreground" aria-hidden="true">L</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">Lunar Bakery</p>
              <p className="flex items-center gap-1.5 text-xs opacity-85"><span className="h-2 w-2 rounded-full bg-green-400" />Replies here, usually the same day</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="press flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg leading-none">×</button>
          </div>
          {orderThreads.length > 0 && (
            <div className="border-b border-border px-5 py-3">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">About your orders</p>
              {orderThreads.slice(-3).map((t) => {
                const o = mine.orders.find((x) => x.id === t.orderId);
                if (!o) return null;
                const n = unreadOf(t);
                return (
                  <a key={t.id} href={`/o/${o.id}?k=${o.token}`} onClick={() => setOpen(false)} className="flex items-center justify-between py-1 text-sm hover:text-accent">
                    <span className="underline underline-offset-4">{parse(o.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, {fmtTime(o.time)} · {custStatus(o)}</span>
                    {n > 0 && <span className="ml-2 rounded-full bg-accent px-2 font-mono text-[11px] text-accent-foreground">{n} new</span>}
                  </a>
                );
              })}
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            {!key && (
              <label className="mt-3 block text-sm text-muted-foreground">Your name (optional)
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1 w-full border-b-2 border-border bg-transparent py-1.5 text-foreground outline-none focus:border-primary" />
              </label>
            )}
            <Conversation soft msgs={shown} side="customer" them="Lunar" onSend={send} chips={chips}
              empty="Hi! Tap a question below, or write to us. Jennie answers right here." placeholder="Type a message" />
          </div>
        </div>
      )}
      <button onClick={() => setView((v) => (v === "closed" ? "card" : "closed"))} aria-expanded={view !== "closed"} aria-label={view !== "closed" ? "Close messages" : unread ? `Messages, ${unread} new` : "Chat with Lunar"}
        className={`press fixed right-4 z-40 flex items-center gap-2 rounded-full bg-primary py-3 pl-4 pr-5 text-primary-foreground ${lift ? "bottom-24 lg:bottom-6" : "bottom-6"}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        <span className="text-sm font-semibold">{view !== "closed" ? "Close" : "Chat with us"}</span>
        {unread > 0 && view === "closed" && <span key={unread} className="a-chip absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[11px] text-accent-foreground">{unread}</span>}
      </button>
    </>,
    document.body,
  );
}
