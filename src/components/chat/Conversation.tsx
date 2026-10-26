import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Msg } from "@/lib/store";

/*
 * One conversation, used on both sides: the customer's order page and chat bubble,
 * and the bakery's inbox. "side" is who is looking, so their own messages sit on the right.
 */
const clock = (at: number) => new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const dayLabel = (at: number) => {
  const d = new Date(at), t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

export function Conversation({ msgs, side, onSend, placeholder, them, empty, tall, soft, chips }: {
  msgs: Msg[]; side: "customer" | "bakery"; onSend: (text: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  placeholder?: string; them: string; empty?: string; tall?: boolean;
  /** Rounder bubbles and a round send button, for the website chat. */
  soft?: boolean;
  /** Quick replies shown above the message box. */
  chips?: { label: string; pick: () => void }[];
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const count = useRef(msgs.length);
  const [fresh, setFresh] = useState<string | null>(null);

  // Stay at the bottom as messages arrive; mark the newest one so it can slide in.
  useLayoutEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: count.current ? "smooth" : "auto" });
    if (msgs.length > count.current) setFresh(msgs[msgs.length - 1]?.id ?? null);
    count.current = msgs.length;
  }, [msgs.length, sending]);
  useEffect(() => { if (!fresh) return; const t = setTimeout(() => setFresh(null), 700); return () => clearTimeout(t); }, [fresh]);
  // Grow the box with the text, up to a few lines.
  useLayoutEffect(() => { const b = box.current; if (b) { b.style.height = "auto"; b.style.height = Math.min(b.scrollHeight, 132) + "px"; } }, [text]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(t); setText(""); setErr("");
    const r = await onSend(t);
    setSending(null);
    if (!r.ok) { setErr(r.error); setText(t); }
    box.current?.focus();
  };

  let lastDay = "";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={list} className={`flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-1 py-3 ${tall ? "max-h-[62vh] min-h-[300px]" : "max-h-[46vh] min-h-[180px]"}`} aria-live="polite">
        {!msgs.length && !sending && <p className="px-2 py-8 text-center font-serif italic text-muted-foreground">{empty ?? "No messages yet."}</p>}
        {msgs.map((m, i) => {
          const mine = m.from === side;
          const d = dayLabel(m.at);
          const showDay = d !== lastDay; lastDay = d;
          const next = msgs[i + 1];
          const tail = !next || next.from !== m.from || next.at - m.at > 5 * 60_000;
          return (
            <div key={m.id}>
              {showDay && <div className="py-2 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{d}</div>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"} ${fresh === m.id ? "a-rise" : ""}`}>
                <div className={`max-w-[82%] px-3.5 py-2 text-[15px] leading-[1.4] ${soft ? "rounded-2xl" : ""} ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
              {tail && <div className={`mt-0.5 px-1 text-[11px] text-muted-foreground ${mine ? "text-right" : ""}`}>{mine ? "You" : them} · {clock(m.at)}</div>}
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-end">
            <div className={`max-w-[82%] bg-primary/70 px-3.5 py-2 text-[15px] leading-[1.4] text-primary-foreground ${soft ? "rounded-2xl" : ""}`}><p className="whitespace-pre-wrap break-words">{sending}</p></div>
          </div>
        )}
      </div>
      {err && <p key={err} className="a-rise px-1 pb-1 text-sm text-destructive">{err}</p>}
      {chips && chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 pt-1 [scrollbar-width:none]">
          {chips.map((c) => (
            <button key={c.label} type="button" onClick={c.pick} className="press-sm shrink-0 rounded-full border border-primary px-3.5 py-1.5 text-sm text-primary hover:bg-primary hover:text-primary-foreground">{c.label}</button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2 border-t border-border pt-3">
        <textarea ref={box} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? "Write a message"} aria-label="Message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          className={`min-h-[44px] flex-1 resize-none border border-border bg-card py-2.5 ${soft ? "rounded-3xl px-4" : "px-3"} text-[15px] leading-[1.4] outline-none focus:border-primary`} />
        {soft
          ? <button disabled={!text.trim() || !!sending} aria-label="Send" className="press flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12l16-8-6 17-3-7-7-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></button>
          : <button disabled={!text.trim() || !!sending} className="press h-[44px] bg-primary px-4 font-btn text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-40">Send</button>}
      </form>
    </div>
  );
}
