import { createFileRoute } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ChatBubble } from "@/components/site/ChatBubble";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · Lunar Bakery" },
      { name: "description", content: "Lunar is a woman-owned micro-bakery in San Francisco, blending French technique with Taiwanese flavours." },
      { property: "og:title", content: "About · Lunar Bakery" },
      { property: "og:image", content: "/images/og.jpg" },
    ],
  }),
  component: About,
});

const rise: Variants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };
const stagger: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } };
const btn = "press inline-flex items-center justify-center px-10 py-4 text-sm font-btn font-bold uppercase tracking-[0.12em]";

function About() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-primary">
      <Header />
      <main className="flex-grow px-6 py-16 md:py-24">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto flex max-w-[1200px] flex-col gap-12 md:flex-row md:gap-16">
          <motion.div variants={rise} className="w-full shrink-0 md:w-5/12">
            <div className="aspect-[4/5] overflow-hidden"><img src="/images/afternoon-tea.jpg" alt="Lunar Bakery afternoon tea spread" className="h-full w-full object-cover" /></div>
          </motion.div>
          <motion.div variants={rise} className="flex w-full flex-col justify-center md:w-7/12">
            <h1 className="mb-8 font-serif text-5xl leading-[0.95] tracking-[-0.02em] md:text-6xl">About <span className="italic text-accent">Lunar</span></h1>
            <p className="mb-5 text-[17px] leading-[1.6] text-primary/75">
              Lunar is a woman-owned micro-bakery in San Francisco, run by Jennie, its owner and solo baker. She grew up in a Hakka-Taiwanese family in New York, trained in pastry school and in kitchens like Tartine, Arsicault and Miette, and started Lunar in 2020.
            </p>
            <p className="mb-8 text-[17px] leading-[1.6] text-primary/75">
              We pop up across the Bay Area, moving with the seasons. Every menu blends French technique with the Taiwanese flavours Jennie grew up with, made by hand with the best ingredients she can find.
            </p>
            <div className="mb-10 flex gap-4">
              <div className="w-[3px] shrink-0 self-stretch bg-primary" />
              <p className="font-serif text-xl italic leading-[1.45] text-primary/80">"My hope is that each bite brings a moment of comfort, joy, and connection."</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a href="/order" className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>Order for pickup</a>
              <a href="/#visit" className={`${btn} border border-primary text-primary hover:bg-primary hover:text-primary-foreground`}>Find us</a>
            </div>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
      <ChatBubble />
    </div>
  );
}
