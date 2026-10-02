import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  ["Home", "#home"],
  ["Movies", "#movies"],
  ["Schedule", "#schedule"],
  ["Book Tickets", "#movies"],
  ["About", "#about"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-500",
        scrolled ? "glass border-x-0 border-t-0" : "bg-transparent",
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:flex lg:justify-between">
        <a href="#home" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blood font-display text-sm shadow-glow">E</span>
          <span className="truncate font-display text-xs uppercase tracking-wider sm:text-sm">
            ESOFT <span className="text-gold">Halloween</span> Film Festival
          </span>
        </a>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map(([l, h]) =>
            l === "Book Tickets" ? (
              <a key={l} href={h} className="rounded-md bg-blood px-4 py-2 font-display text-xs uppercase tracking-wider shadow-glow transition hover:brightness-125">
                {l}
              </a>
            ) : (
              <a key={l} href={h} className="text-sm uppercase tracking-widest text-muted-foreground transition hover:text-gold">
                {l}
              </a>
            ),
          )}
        </nav>
        <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="glass flex flex-col border-x-0 px-6 py-4 lg:hidden">
          {NAV.map(([l, h]) => (
            <a key={l} href={h} onClick={() => setOpen(false)} className="py-3 text-sm uppercase tracking-widest text-muted-foreground hover:text-gold">
              {l}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="font-display text-lg uppercase tracking-wider">
          ESOFT <span className="text-gold">Halloween</span> Film Festival
        </p>
        <p className="text-sm text-muted-foreground">A2-4 Lecture Hall · ESOFT Metro Campus</p>
        <p className="font-brush text-xl text-gold">"An unforgettable Halloween cinema experience."</p>
        <p className="mt-4 text-xs text-muted-foreground/70">© {new Date().getFullYear()} ESOFT Metro Campus. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function Atmosphere() {
  const [embers] = useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      left: (i * 37) % 100,
      dur: 14 + ((i * 7) % 12),
      delay: (i * 1.3) % 14,
    })),
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -inset-x-1/4 bottom-[-10%] h-[50vh] animate-fog rounded-full bg-foreground/[0.04] blur-3xl" />
      <div className="absolute -inset-x-1/4 top-1/3 h-[40vh] animate-fog rounded-full bg-phantom/10 blur-3xl [animation-delay:-12s]" />
      {embers.map((e, i) => (
        <span key={i} className="ember-particle" style={{ left: `${e.left}%`, animationDuration: `${e.dur}s`, animationDelay: `${e.delay}s` }} />
      ))}
    </div>
  );
}

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}
