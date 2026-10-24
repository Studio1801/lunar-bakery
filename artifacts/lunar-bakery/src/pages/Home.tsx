import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { motion, type Variants } from 'framer-motion';
import { formatPrice, getCurrentSeason, SEASONAL_MENU, SEASONS, type MenuSeason } from '@/lib/order-catalog';
import heroImage from '@assets/lunar_og.jpg';
import imgKouignTray from '@assets/lunar_kouign_tray.jpg';
import imgNatasKouigns from '@assets/lunar_natas_kouigns.jpg';
import imgKouignGold from '@assets/lunar_kouign_gold.jpg';
import imgGiftBox from '@assets/lunar_gift_box.jpg';
import imgAfternoonTea from '@assets/lunar_afternoon_tea.jpg';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const MENU_IMAGES: Record<MenuSeason, string[]> = {
  spring: [
    imgGiftBox,
    imgNatasKouigns,
    imgKouignTray,
    imgKouignGold,
  ],
  summer: [
    heroImage,
    imgKouignTray,
    imgNatasKouigns,
    imgKouignGold,
  ],
  fall: [
    imgNatasKouigns,
    imgKouignGold,
    imgGiftBox,
    imgKouignTray,
  ],
  winter: [
    imgGiftBox,
    imgKouignTray,
    imgNatasKouigns,
    imgKouignGold,
  ],
};

export default function Home() {
  const [activeSeason, setActiveSeason] = useState<MenuSeason>(getCurrentSeason);

  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Header />

      <main className="flex-grow">

        {/* ── 01 HERO ─────────────────────────────────────────────── */}
        <section id="hero" className="w-full">
          {/* Full-width photo */}
          <div className="w-full overflow-hidden" style={{ maxHeight: '60vh', minHeight: 280 }}>
            <img
              src={heroImage}
              alt="Freshly baked Pastel de Nata"
              className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-[2500ms] ease-out"
              style={{ maxHeight: '60vh', minHeight: 280, objectPosition: 'center 60%' }}
            />
          </div>

          {/* Text + CTAs */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center text-center px-6 pt-12 pb-16 md:pt-16 md:pb-20"
          >
            <motion.div variants={fadeInUp} className="w-20 h-[3px] bg-primary mb-7" />

            <motion.h1
              variants={fadeInUp}
              className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.08] mb-5 max-w-2xl"
            >
              French pastry,{' '}
              <span className="italic text-secondary">Taiwanese soul.</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-base md:text-lg text-primary/60 font-sans max-w-md leading-relaxed mb-10"
            >
              Hand-crafted seasonal pastries, found only if you're paying attention.
              San Francisco · Est. 2020.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <Link
                href="/order"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold px-10 py-4 hover:bg-primary/90 transition-colors"
              >
                Order for pickup
              </Link>
              <button
                onClick={() => {
                  document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center border border-primary text-primary text-sm font-bold tracking-[0.15em] uppercase px-10 py-4 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                This Season's Menu
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 02 CREDIBILITY ───────────────────────────────────────── */}
        <section className="w-full border-t border-b border-border/60 px-6 py-5">
          <div className="max-w-[1200px] mx-auto flex flex-wrap items-center gap-3 md:gap-4">
            <span className="inline-flex items-center border border-primary/30 text-primary text-xs font-bold tracking-[0.12em] uppercase px-4 py-2">
              Est. 2020
            </span>
            <span className="inline-flex items-center border border-primary/30 text-primary text-xs font-bold tracking-[0.12em] uppercase px-4 py-2">
              Featured In SF Chronicle
            </span>
            <span className="inline-flex items-center border border-primary/30 text-primary text-xs font-bold tracking-[0.12em] uppercase px-4 py-2">
              ★★★★★ on Yelp
            </span>
            <span className="inline-flex items-center gap-2 border border-primary/30 text-primary text-xs font-bold tracking-[0.12em] uppercase px-4 py-2">
              <span className="w-2 h-2 rounded-full border-2 border-primary inline-block" />
              Third-Culture Bakery
            </span>
          </div>
        </section>

        {/* ── 03 THIS SEASON ───────────────────────────────────────── */}
        <section id="menu" className="w-full px-6 py-20 md:py-28">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeInUp}
              className="mb-10"
            >
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-secondary mb-3">03</p>
              <h2 className="font-serif text-3xl md:text-4xl mb-8">This Season's Menu</h2>

              {/* Season tabs */}
              <div className="flex flex-wrap gap-0">
                {SEASONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSeason(key)}
                    className={[
                      'text-sm font-bold tracking-[0.12em] uppercase px-6 py-2 border transition-colors',
                      activeSeason === key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-primary border-primary/30 hover:border-primary',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Product grid */}
            <motion.div
              key={activeSeason}
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
            >
              {SEASONAL_MENU[activeSeason].map((item, index) => (
                <motion.div key={item.id} variants={fadeInUp} className="group flex flex-col">
                  <div className="relative overflow-hidden bg-muted aspect-square">
                    <img
                      src={MENU_IMAGES[activeSeason][index]}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <span className="absolute bottom-3 right-3 bg-background text-primary text-xs font-bold tracking-wide px-2 py-1 border border-border/60">
                      {formatPrice(item.priceCents)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-sans text-primary leading-snug">{item.name}</p>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-10">
              <Link
                href="/order"
                className="inline-flex items-center text-sm font-bold text-primary border border-primary px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                View full menu and pre-order
              </Link>
            </div>
          </div>
        </section>

        {/* ── 04 ORDER CAKES ───────────────────────────────────────── */}
        <section id="order" className="w-full px-6 py-20 md:py-28 border-t border-border/40">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="flex flex-col md:flex-row gap-10 md:gap-16 items-start"
            >
              {/* Left: image */}
              <motion.div variants={fadeInUp} className="w-full md:w-5/12 shrink-0">
                <div className="overflow-hidden aspect-[4/3]">
                  <img
                    src={imgGiftBox}
                    alt="Custom celebration cake gift box"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </motion.div>

              {/* Right: form */}
              <motion.div variants={fadeInUp} className="w-full md:w-7/12 flex flex-col">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-secondary mb-3">04</p>
                <h2 className="font-serif text-3xl md:text-4xl mb-4">Order Cakes</h2>
                <p className="text-primary/60 text-sm leading-relaxed mb-8 max-w-sm">
                  Planning a celebration? Tell us what you have in mind and we’ll follow up about availability and pricing.
                </p>

                <Link
                  href="/order?type=cake"
                  className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold px-10 py-4 hover:bg-primary/90 transition-colors self-start"
                >
                  Request a cake
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── 05 OUR STORY ─────────────────────────────────────────── */}
        <section id="story" className="w-full px-6 py-20 md:py-28 border-t border-border/40">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="flex flex-col md:flex-row gap-10 md:gap-16 items-start"
            >
              {/* Left: image */}
              <motion.div variants={fadeInUp} className="w-full md:w-5/12 shrink-0">
                <div className="overflow-hidden aspect-[4/3]">
                  <img
                    src={imgAfternoonTea}
                    alt="Lunar Bakery afternoon tea spread"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </motion.div>

              {/* Right: text */}
              <motion.div variants={fadeInUp} className="w-full md:w-7/12 flex flex-col">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-secondary mb-3">05</p>
                <h2 className="font-serif text-3xl md:text-4xl mb-6">Our Story</h2>
                <p className="text-primary/70 text-sm leading-relaxed mb-4">
                  Lunar is a third-culture bakery rooted in San Francisco. We bring together the precision of French pastry and the warmth of Taiwanese baking tradition — raised on both and belonging fully to each.
                </p>
                <p className="text-primary/70 text-sm leading-relaxed mb-8">
                  We operate as a pop-up, moving with the seasons and appearing at curated spaces across the Bay Area. Every menu reflects what is fresh, what is right now, and our ongoing curiosity about where these two baking worlds can meet.
                </p>

                {/* Blockquote */}
                <div className="flex gap-4 mb-10">
                  <div className="w-[3px] bg-primary shrink-0 self-stretch" />
                  <p className="font-serif italic text-lg text-primary/80 leading-relaxed">
                    "We bake the way we grew up — caught between two cultures, finding something new in between."
                  </p>
                </div>

                <a
                  href="https://www.instagram.com/lunarbakerysf/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm font-bold tracking-[0.15em] uppercase text-primary border border-primary px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-colors self-start"
                >
                  Read More
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── 06 VISIT ─────────────────────────────────────────────── */}
        <section id="visit" className="w-full px-6 py-20 md:py-28 border-t border-border/40">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
              className="flex flex-col md:flex-row gap-10 md:gap-16 items-start"
            >
              {/* Left: address */}
              <motion.div variants={fadeInUp} className="w-full md:w-5/12 flex flex-col">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-secondary mb-3">06</p>
                <h2 className="font-serif text-3xl md:text-4xl mb-6">Visit Us</h2>
                <p className="font-serif text-lg text-primary mb-1">Lunar Bakery — Pop-up</p>
                <p className="text-primary/60 text-sm leading-relaxed mb-1">2948 Folsom St</p>
                <p className="text-primary/60 text-sm leading-relaxed mb-8">San Francisco, CA 94110</p>

                <p className="text-primary/60 text-sm leading-relaxed mb-2">
                  We operate as a pop-up — no permanent storefront. Follow{' '}
                  <a
                    href="https://www.instagram.com/lunarbakerysf/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-secondary transition-colors"
                  >
                    @lunarbakerysf
                  </a>{' '}
                  for upcoming locations and dates.
                </p>

                <div className="mt-8">
                  <a
                    href="https://maps.google.com/?q=2948+Folsom+St,+San+Francisco,+CA+94110"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-bold tracking-[0.15em] uppercase text-primary border border-primary px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Get Directions
                  </a>
                </div>
              </motion.div>

              {/* Right: map */}
              <motion.div variants={fadeInUp} className="w-full md:w-7/12">
                <div className="w-full overflow-hidden border border-border/40" style={{ height: 300 }}>
                  <iframe
                    title="Lunar Bakery location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d787.1855944578!2d-122.41427!3d37.74886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808f7e5843b49c3b%3A0x9a7c4e4b6c0e1e5a!2s2948%20Folsom%20St%2C%20San%20Francisco%2C%20CA%2094110!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
                    width="100%"
                    height="300"
                    style={{ border: 0, filter: 'grayscale(40%) contrast(1.05)' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
