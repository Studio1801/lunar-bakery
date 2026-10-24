import { useState } from 'react';
import { Link } from 'wouter';
import logo from '@assets/lunar_logo.png';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Menu', href: '#menu' },
    { label: 'Our Story', href: '#story' },
    { label: 'Visit', href: '#visit' },
  ];

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-background border-b border-border/40">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">

        {/* Desktop: Logo left */}
        <div className="hidden md:flex items-center w-1/3">
          <Link href="/" className="block w-36 md:w-40 shrink-0">
            <img src={logo} alt="Lunar Artisan Baked Goods" className="w-full h-auto mix-blend-multiply" />
          </Link>
        </div>

        {/* Desktop: Nav center */}
        <nav className="hidden md:flex items-center justify-center gap-10 w-1/3">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm font-sans tracking-[0.15em] uppercase text-primary/70 hover:text-primary transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Desktop: CTA right */}
        <div className="hidden md:flex items-center justify-end w-1/3">
          <Link
            href="/order"
            className="inline-block bg-primary text-primary-foreground text-sm font-bold px-5 py-3 hover:bg-primary/90 transition-colors"
          >
            Order for pickup
          </Link>
        </div>

        {/* Mobile: Hamburger left + logo center + ORDER right */}
        <div className="flex md:hidden items-center justify-between w-full">
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex flex-col gap-[5px] p-1"
            aria-label="Toggle menu"
          >
            <span className="block w-6 h-[2px] bg-primary" />
            <span className="block w-6 h-[2px] bg-primary" />
            <span className="block w-6 h-[2px] bg-primary" />
          </button>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 w-28">
            <img src={logo} alt="Lunar Artisan Baked Goods" className="w-full h-auto mix-blend-multiply" />
          </Link>

          <Link
            href="/order"
            className="inline-block bg-primary text-primary-foreground text-xs font-bold px-4 py-2"
          >
            Order
          </Link>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-t border-border/40 px-6 py-6 flex flex-col gap-5">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm font-sans tracking-[0.15em] uppercase text-primary/80 text-left hover:text-primary transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
