import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-lg bg-pulse glow-cyan" />
            <div className="absolute inset-[3px] rounded-md bg-background grid place-items-center">
              <span className="font-display text-[11px] font-bold text-aurora">NX</span>
            </div>
          </div>
          <span className="font-display text-sm tracking-[0.3em] text-foreground/90">NEXUS</span>
        </Link>

        <nav
          className={`hidden md:flex items-center gap-1 rounded-full px-2 py-1.5 transition-all ${scrolled ? "glass-strong" : ""}`}
        >
          {[
            { label: "Predict", href: "#predict" },
            { label: "Analytics", href: "#analytics" },
            { label: "Assistant", href: "#assistant" },
            { label: "Wearables", href: "#wearables" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="#cta"
          className="group relative inline-flex items-center gap-2 rounded-full glass-strong px-5 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-foreground transition-all hover:bg-white/10"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
          Request Access
        </a>
      </div>
    </header>
  );
}
