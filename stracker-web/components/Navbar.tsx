"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActivitySquare } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/watchlist", label: "Watchlist" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <ActivitySquare className="h-5 w-5 text-saffron" strokeWidth={2} />
          <span className="font-display text-[17px] font-semibold tracking-tight text-text">
            Stracker
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wide text-text-faint sm:inline">
            NIFTY 50 SENTIMENT
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-sm px-3 py-1.5 font-mono text-[13px] uppercase tracking-wide transition-colors ${
                  active
                    ? "bg-saffron-dim text-saffron"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
