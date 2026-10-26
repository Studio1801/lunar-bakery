import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { DAILY_LIMIT, SEASONS, dayHours, fromLine, inSeason, seasonNow, fmtTime, iso, money, parse, useCustomerSync, usePublic, useSyncStatus, type Season } from "@/lib/store";
import { ChatBubble } from "@/components/site/ChatBubble";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lunar Bakery · French pastry, Taiwanese soul" },
      { name: "description", content: "Hand-crafted French pastries with Taiwanese flavours, inspired by the seasons. A San Francisco pop-up bakery. Order boxes for pickup online." },
      { property: "og:title", content: "Lunar Bakery · French pastry, Taiwanese soul" },
      { property: "og:description", content: "Hand-crafted seasonal pastries from a San Francisco pop-up bakery. Order boxes for pickup online." },
      { property: "og:image", content: "/images/og.jpg" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

// Same motion as the Replit design: soft rise, gentle stagger.
const fadeInUp: Variants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };
const stagger: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } };

const MAP = "https://maps.google.com/?q=2948+Folsom+St,+San+Francisco,+CA+94110";
const IG = "https://www.instagram.com/lunarbakerysf/";

const btn = "press inline-flex items-center justify-center px-10 py-4 text-sm font-btn font-bold uppercase tracking-[0.12em]";
const btnSolid = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnLine = `${btn} border border-primary text-primary hover:bg-primary hover:text-primary-foreground`;
const eyebrow = "mb-3 text-xs font-mono font-medium uppercase tracking-[0.08em] text-accent";

function Home() {
  useCustomerSync();
  const pub = usePublic();
  const [picked, setPicked] = useState<Season | null>(null);
  const season: Season = picked ?? seasonNow();
  // Arriving from another page with a #section link: glide to it once the page has drawn.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h) setTimeout(() => document.getElementById(h)?.scrollIntoView({ behavior: "smooth" }), 150);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-primary">
      <Header />
      <main className="flex-grow">
        {/* 01 HERO */}
        <section id="hero" className="w-full">
          <div className="w-full overflow-hidden" style={{ maxHeight: "40vh", minHeight: 198 }}>
            <motion.img initial={{ scale: 1.06, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              src="/images/hero-natas.jpg" alt="A tray of freshly baked pastel de nata" fetchPriority="high"
              className="h-full w-full object-cover" style={{ maxHeight: "40vh", minHeight: 198, objectPosition: "center 55%" }} />
          </div>
          <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col items-center px-6 pb-12 pt-8 text-center md:pb-14 md:pt-10">
            <motion.div variants={fadeInUp} className="mb-5 h-[3px] w-16 bg-primary" />
            <motion.h1 variants={fadeInUp} className="mb-4 max-w-3xl font-serif text-[2.25rem] leading-[0.95] tracking-[-0.02em] md:text-[3.375rem] lg:text-[4.5rem]">
              French pastry, <span className="italic text-accent">Taiwanese soul.</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="mb-7 max-w-md text-base leading-[1.45] text-primary/60 md:text-lg">
              Hand-crafted seasonal pastries, found only if you're paying attention. San Francisco · Est. 2020.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <a href="/order" className={btnSolid}>Order for pickup »</a>
              <a href="#menu" onClick={(e) => { e.preventDefault(); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); }} className={btnLine}>This Season's Menu</a>
            </motion.div>
          </motion.div>
        </section>

        {/* 02 CREDIBILITY */}
        <section className="w-full border-y border-border/60 px-6 py-5">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-3 md:gap-4">
            {["Est. 2020", "Featured In SF Chronicle", "★★★★★ on Yelp"].map((t) => (
              <span key={t} className="inline-flex items-center border border-primary/30 px-4 py-2 text-xs font-btn font-bold uppercase tracking-[0.12em]">{t}</span>
            ))}
            <span className="inline-flex items-center gap-2 border border-primary/30 px-4 py-2 text-xs font-btn font-bold uppercase tracking-[0.12em]">
              <span className="inline-block h-2 w-2 rounded-full border-2 border-primary" />Third-Culture Bakery
            </span>
          </div>
        </section>

        {/* 03 THIS SEASON */}
        <section id="menu" className="w-full scroll-mt-16 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-[1200px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeInUp} className="mb-10">
              <p className={eyebrow}>03</p>
              <h2 className="mb-8 font-serif text-4xl tracking-[-0.01em] md:text-5xl">This Season's Menu</h2>
              <div className="flex flex-wrap" role="tablist">
                {SEASONS.map(({ key, label }) => (
                  <button key={key} role="tab" aria-selected={season === key} onClick={() => setPicked(key)}
                    className={`press border px-6 py-2 text-sm font-btn font-bold uppercase tracking-[0.12em] ${season === key ? "border-primary bg-primary text-primary-foreground" : "border-primary/30 text-primary hover:border-primary"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
            <motion.div key={season} initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {pub.products.filter((item) => item.name.trim() && inSeason(item, season)).map((item) => (
                <motion.div key={item.id} variants={fadeInUp} className="group flex flex-col">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {item.photo && <img src={item.photo} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                    {fromLine(item) && <span className="absolute bottom-3 right-3 bg-background px-2 py-1 text-xs font-semibold tracking-wide">{fromLine(item)}</span>}
                  </div>
                  <p className="mt-3 text-sm leading-snug">{item.name}</p>
                </motion.div>
              ))}
            </motion.div>
            <div className="mt-10"><a href="/order" className={`${btnLine} px-8 py-3`}>View Full Menu & Pre-order</a></div>
          </div>
        </section>

        {/* 04 ORDER, live from the shop's own product list */}
        <CakeSection />

        {/* 05 OUR STORY */}
        <section id="story" className="w-full scroll-mt-16 border-t border-border/40 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-[1200px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="flex flex-col items-start gap-10 md:flex-row md:gap-16">
              <motion.div variants={fadeInUp} className="w-full shrink-0 md:w-5/12">
                <div className="aspect-[4/3] overflow-hidden"><img src="/images/afternoon-tea.jpg" alt="Lunar Bakery afternoon tea spread" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" /></div>
              </motion.div>
              <motion.div variants={fadeInUp} className="flex w-full flex-col md:w-7/12">
                <p className={eyebrow}>05</p>
                <h2 className="mb-6 font-serif text-4xl tracking-[-0.01em] md:text-5xl">Our Story</h2>
                <p className="mb-4 text-[15px] leading-[1.5] text-primary/70">
                  Lunar is a woman-owned micro-bakery in San Francisco, run by Jennie, its owner and solo baker. She grew up in a Hakka-Taiwanese family in New York, trained in pastry school and in kitchens like Tartine, Arsicault and Miette, and started Lunar in 2020.
                </p>
                <p className="mb-8 text-[15px] leading-[1.5] text-primary/70">
                  We pop up across the Bay Area, moving with the seasons. Every menu blends French technique with the Taiwanese flavours Jennie grew up with, made by hand with the best ingredients she can find.
                </p>
                <div className="mb-10 flex gap-4">
                  <div className="w-[3px] shrink-0 self-stretch bg-primary" />
                  <p className="font-serif text-lg italic leading-[1.45] text-primary/80">"My hope is that each bite brings a moment of comfort, joy, and connection."</p>
                </div>
                <a href="/about" className={`${btnLine} self-start px-8 py-3`}>Read More</a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 06 VISIT */}
        <section id="visit" className="w-full scroll-mt-16 border-t border-border/40 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-[1200px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="flex flex-col items-start gap-10 md:flex-row md:gap-16">
              <motion.div variants={fadeInUp} className="flex w-full flex-col md:w-5/12">
                <p className={eyebrow}>06</p>
                <h2 className="mb-6 font-serif text-4xl tracking-[-0.01em] md:text-5xl">Visit Us</h2>
                <p className="mb-1 font-serif text-lg">Lunar Bakery, Pop-up</p>
                <p className="mb-1 text-sm leading-[1.45] text-primary/60">2948 Folsom St</p>
                <p className="mb-8 text-sm leading-[1.45] text-primary/60">San Francisco, CA 94110</p>
                <p className="mb-2 text-sm leading-[1.45] text-primary/60">
                  We operate as a pop-up with no permanent storefront. Follow <a href={IG} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">@lunarbakerysf</a> for upcoming locations and dates.
                </p>
                <div className="mt-8"><a href={MAP} target="_blank" rel="noopener noreferrer" className={`${btnLine} px-8 py-3`}>Get Directions</a></div>
              </motion.div>
              <motion.div variants={fadeInUp} className="w-full md:w-7/12">
                <div className="w-full overflow-hidden border border-border/40" style={{ height: 300 }}>
                  <iframe title="Lunar Bakery location" src="https://www.google.com/maps?q=2948+Folsom+St,+San+Francisco,+CA+94110&output=embed"
                    width="100%" height="300" style={{ border: 0, filter: "grayscale(40%) contrast(1.05)" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
                <UpcomingDays />
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
      <ChatBubble />
    </div>
  );
}

// The next pickup days, straight from the bakery's own schedule in the dashboard.
function UpcomingDays() {
  useCustomerSync();
  const pub = usePublic();
  const sync = useSyncStatus();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || sync === "loading") return <div className="mt-8 space-y-px">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skel h-14" />)}</div>;
  const days: string[] = [];
  const d = new Date(); d.setHours(12, 0, 0, 0);
  while (days.length < 6) { const k = iso(d); if (d.getDay() !== 0 && !pub.closed[k]) days.push(k); d.setDate(d.getDate() + 1); }
  return (
    <div className="mt-8">
      <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.08em] text-primary/60">Upcoming pickups</p>
      <ul className="stagger divide-y divide-border border-y border-border">
        {days.map((k) => {
          const h = dayHours(pub.days[k]);
          const full = (pub.load[k] ?? 0) >= DAILY_LIMIT - 6;
          return (
            <li key={k}>
              <a href="/order" className="group flex items-baseline gap-4 py-3">
                <span className="w-28 shrink-0 font-serif text-lg">{parse(k).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                <span className="flex-1 text-sm text-primary/70">{h.place} · {fmtTime(h.from)} to {fmtTime(h.to)}</span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${full ? "text-primary/40" : "text-accent group-hover:underline"}`}>{full ? "Full" : "Order »"}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Custom cake requests. There is no cake database yet, so sending opens the visitor's email
// with their name and address filled in, addressed to the bakery.
function CakeSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Hi Lunar,\n\nI'd like to order a custom cake.\n\nName: ${name}\nEmail: ${email}\n`;
    window.location.href = `mailto:lunarbakerysf@gmail.com?subject=${encodeURIComponent("Custom cake order")}&body=${encodeURIComponent(body)}`;
  };
  const field = "block w-full bg-transparent px-6 py-5 text-[17px] text-primary outline-none placeholder:text-muted-foreground focus:bg-secondary/50";
  return (
    <section id="order" className="w-full scroll-mt-16 border-t border-border/40 bg-background px-6 py-20 text-primary md:py-28">
      <div className="mx-auto max-w-[1200px]">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="flex flex-col items-start gap-10 md:flex-row md:items-center md:gap-16">
          <motion.div variants={fadeInUp} className="w-full md:w-1/2">
            <div className="aspect-[4/3] overflow-hidden"><img src="/images/gift-box.jpg" alt="A box of pastries with a small decorated cake" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: "center 58%" }} /></div>
          </motion.div>
          <motion.form variants={fadeInUp} onSubmit={send} className="w-full md:w-1/2">
            <p className={eyebrow}>04</p>
            <h2 className="mb-4 font-serif text-4xl tracking-[-0.01em] md:text-5xl">Order Cakes</h2>
            <p className="mb-8 max-w-md text-[15px] leading-[1.6] text-primary/70">
              Now accepting custom cake orders for October & November 2026. Fill out your details and we'll be in touch to discuss your order.
            </p>
            <div className="mb-8 divide-y divide-border border border-border">
              <input required aria-label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
              <input required type="email" aria-label="Email address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={field} />
            </div>
            <button type="submit" className={btnSolid}>Order cake</button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
}
