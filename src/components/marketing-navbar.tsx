"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const desktopNavLinks = [
  { label: "Why PMFreak", href: "/#why-pmfreak" },
  { label: "Intelligence", href: "/#intelligence" },
  { label: "Trust", href: "/#trust" },
  { label: "Who Buys", href: "/#who-buys" },
  { label: "Pricing", href: "/pricing" },
];

const mobileNavLinks = [
  { label: "Why PMFreak", href: "/#why-pmfreak" },
  { label: "Intelligence", href: "/#intelligence" },
  { label: "Trust", href: "/#trust" },
  { label: "Who Buys", href: "/#who-buys" },
  { label: "Pricing", href: "/pricing" },
];

export function MarketingNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((open) => !open);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fffaf2]/95 shadow-[0_6px_20px_rgba(15,12,9,0.06)] backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center px-5 py-4 md:grid-cols-[1fr_auto_1fr] md:px-8 md:py-5">
        <Link href="/" className="inline-flex items-center" aria-label="PM Freak Home">
          <Image src="/LOGO.png" alt="PM Freak" width={220} height={56} priority className="h-16 w-auto object-contain md:h-20" />
        </Link>

        <nav className="hidden items-center justify-center gap-7 md:flex" aria-label="Main">
          {desktopNavLinks.map((link) => (
            <Link key={link.label} href={link.href} className="text-sm font-medium text-[#15120f]/75 transition hover:text-[#15120f]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden justify-self-end md:block">
          <Link href="/signup" className="inline-flex items-center rounded-full bg-[#b8a58c] px-5 py-2.5 text-sm font-semibold text-[#15120f]">
            Create Account
          </Link>
        </div>

        <div className="flex justify-self-end md:hidden">
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-[#fffaf2] text-[#15120f]" aria-label="Toggle menu" aria-controls="mobile-main-menu" aria-expanded={isOpen} onClick={toggleMenu}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {isOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[2px] md:hidden" aria-label="Close mobile menu" onClick={closeMenu} />
      ) : null}

      <div id="mobile-main-menu" className={`grid transition-all duration-300 ease-out md:hidden ${isOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}>
        <div className="relative z-50 overflow-hidden px-4 pb-4">
          <div className="mt-2 flex flex-col gap-1 rounded-2xl border border-black/10 bg-[#fffaf2] p-3 shadow-xl">
            {mobileNavLinks.map((link) => (
              <Link key={link.label} href={link.href} className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#15120f]/85 transition-colors hover:bg-[#f5ecdb] hover:text-[#15120f]" onClick={closeMenu}>
                {link.label}
              </Link>
            ))}

            <Link href="/signup" className="mt-2 inline-flex w-full justify-center rounded-full bg-[#b8a58c] px-4 py-3 text-sm font-semibold text-[#15120f] shadow-[0_10px_24px_rgba(25,18,11,0.16)]" onClick={closeMenu}>
              Start Freak Mode
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
