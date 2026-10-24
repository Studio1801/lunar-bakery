import logo from '@assets/lunar_logo.png';
import { Link } from 'wouter';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-primary text-primary-foreground py-14 px-6 border-t border-primary/20">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-start gap-12">

        {/* Logo + tagline */}
        <div className="flex flex-col">
          <div className="bg-primary-foreground/10 p-3 inline-block mb-5 w-36">
            <img src={logo} alt="Lunar Artisan Baked Goods" className="w-full h-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <p className="font-serif italic text-primary-foreground/70 text-sm mb-1">
            French pastry, Taiwanese soul.
          </p>
          <p className="text-xs tracking-[0.18em] uppercase text-secondary/70">
            San Francisco · Est. 2020
          </p>
        </div>

        {/* 3 link columns */}
        <div className="flex flex-col sm:flex-row gap-10 sm:gap-16">
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-primary-foreground/50 mb-1">
              Order
            </h4>
            <Link
              href="/order"
              className="text-sm text-primary-foreground/70 hover:text-white transition-colors"
            >
              Order online
            </Link>
            <span className="text-sm text-primary-foreground/70">Custom Cakes</span>
            <span className="text-sm text-primary-foreground/70">Catering</span>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-primary-foreground/50 mb-1">
              Connect
            </h4>
            <a
              href="https://www.instagram.com/lunarbakerysf/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-foreground/70 hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="mailto:lunarbakerysf@gmail.com"
              className="text-sm text-primary-foreground/70 hover:text-white transition-colors"
            >
              Email Us
            </a>
            <Link
              href="/staff"
              className="text-sm text-primary-foreground/70 hover:text-white transition-colors"
            >
              Staff dashboard
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-primary-foreground/50 mb-1">
              Visit
            </h4>
            <a
              href="https://maps.google.com/?q=2948+Folsom+St,+San+Francisco,+CA+94110"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-foreground/70 hover:text-white transition-colors"
            >
              2948 Folsom St, SF
            </a>
            <span className="text-sm text-primary-foreground/70">Pop-up only</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto mt-12 pt-6 border-t border-primary-foreground/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-primary-foreground/30">
        <span>© {year} Lunar Bakery. All rights reserved.</span>
        <span>lunarbakerysf@gmail.com</span>
      </div>
    </footer>
  );
}
