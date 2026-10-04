import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Ticket, Film } from "lucide-react";
import posterAsset from "@/assets/festival-poster-2026.png.asset.json";
import { Button } from "@/components/ui/button";
import { Atmosphere, SiteFooter, SiteHeader, useReveal } from "@/components/festival/Chrome";
import { BookingDialog } from "@/components/festival/BookingDialog";
import { supabase } from "@/integrations/supabase/client";
import { POSTERS, TOTAL_SEATS, VENUE, bookedSet, formatDate, moviesQuery, seatsQuery, shortDate, type Movie } from "@/lib/movies";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ESOFT Halloween Film Festival — Book Your Seat" },
      { name: "description", content: "10 horror films. One hall. One Halloween experience. Book your seat at the ESOFT Halloween Film Festival, A2-4 Lecture Hall." },
      { property: "og:title", content: "ESOFT Halloween Film Festival — Book Your Seat" },
      { property: "og:description", content: "10 horror films. One hall. One Halloween experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function useSeatsLive() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("seats-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "seats" }, () =>
        qc.invalidateQueries({ queryKey: ["seats"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}

function Index() {
  const { data: movies } = useQuery(moviesQuery);
  const { data: seats } = useQuery(seatsQuery);
  const [active, setActive] = useState<Movie | null>(null);
  useSeatsLive();
  useReveal();

  const avail = (m: Movie) => TOTAL_SEATS - bookedSet(seats, m.id).size;

  return (
    <div className="grain relative min-h-screen overflow-x-hidden bg-background">
      <Atmosphere />
      <SiteHeader />

      {/* HERO */}
      <section id="home" className="relative -mt-16 overflow-hidden bg-curtain pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-rise text-center lg:text-left">
            <p className="text-xs uppercase tracking-[0.5em] text-muted-foreground">10 Iconic Movies · 1 Unforgettable Experience</p>
            <h1 className="mt-6 font-display uppercase leading-[0.9]">
              <span className="block text-6xl text-foreground sm:text-7xl lg:text-8xl">ESOFT</span>
              <span className="block text-5xl text-foreground sm:text-7xl lg:text-8xl">Halloween</span>
              <span className="mt-2 block animate-flicker font-brush text-5xl text-gold sm:text-7xl lg:text-8xl" style={{ textShadow: "0 0 30px var(--gold)" }}>
                Film Festival
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-lg text-lg text-muted-foreground lg:mx-0">
              10 Horror Films. One Hall. One Halloween Experience.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm lg:justify-start">
              <span className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-gold" />October 23 – 30</span>
              <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-gold" />ESOFT Metro Campus · {VENUE}</span>
              <span className="flex items-center gap-2"><Clock className="h-5 w-5 text-gold" />12.30 P.M – 5.30 P.M</span>
            </div>
            <Button asChild variant="blood" size="lg" className="mt-10 h-14 px-10 text-base">
              <a href="#movies"><Film />Explore Movies</a>
            </Button>
          </div>
          <div className="relative mx-auto w-full max-w-md animate-rise [animation-delay:0.2s]">
            <div className="absolute -inset-6 rounded-2xl bg-primary/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-xl border border-gold/30 shadow-glow">
              <img src={posterAsset.url} alt="ESOFT Halloween Film Festival official poster" className="w-full animate-slow-zoom" />
            </div>
          </div>
        </div>
      </section>

      {/* MOVIES */}
      <section id="movies" className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle kicker="Now Screening" title="Festival Movies" />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(movies ?? []).map((m, i) => {
            const a = avail(m);
            const sold = a <= 0;
            return (
              <article
                key={m.id}
                className="reveal group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-glow"
                style={{ transitionDelay: `${(i % 5) * 70}ms` }}
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-background/70 p-2">
                  <img
                    src={POSTERS[m.poster]}
                    alt={`${m.title} poster`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.025]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded bg-background/80 px-2 py-1 font-display text-[10px] tracking-widest text-gold">
                    #{String(m.id).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <h3 className="font-display text-base uppercase leading-tight">{m.title}</h3>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-gold" />{formatDate(m.date)}</p>
                    <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-gold" />{m.time}{m.duration && ` · ${m.duration}`}</p>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{m.description}</p>
                  <div className="mt-auto space-y-3 pt-2">
                    <SeatBar available={a} />
                    <Button variant={sold ? "soldout" : "blood"} className="w-full" disabled={sold} onClick={() => setActive(m)}>
                      {sold ? "Sold Out" : (<><Ticket />Book Ticket</>)}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="schedule" className="relative z-10 scroll-mt-20 border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionTitle kicker="Five nights of fear" title="Film Schedule" />
          <ol className="relative mt-12 space-y-4 before:absolute before:bottom-0 before:left-[1.15rem] before:top-0 before:w-px before:bg-gradient-to-b before:from-primary before:via-gold/40 before:to-transparent sm:before:left-[1.4rem]">
            {(movies ?? []).map((m) => {
              const a = avail(m);
              return (
                <li key={m.id} className="reveal relative grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:gap-6">
                  <span className="z-10 mt-4 grid h-10 w-10 place-items-center rounded-full border border-gold/50 bg-background font-display text-xs text-gold sm:h-12 sm:w-12">
                    {String(m.id).padStart(2, "0")}
                  </span>
                  <div className="glass flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-background/70 p-1">
                        <img src={POSTERS[m.poster]} alt={`${m.title} poster`} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display uppercase">{m.title}</p>
                        <p className="text-xs uppercase tracking-widest text-gold">{shortDate(m.date)} · {m.time}</p>
                        <p className="text-xs text-muted-foreground">{VENUE}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className={cn("text-xs font-semibold uppercase tracking-widest", a > 0 ? "text-seat-available" : "text-destructive")}>
                        {a} / {TOTAL_SEATS} seats
                      </span>
                      <Button size="sm" variant={a > 0 ? "ghostly" : "soldout"} disabled={a <= 0} onClick={() => setActive(m)}>
                        {a > 0 ? "Book" : "Sold Out"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="relative z-10 mx-auto max-w-4xl scroll-mt-20 px-4 py-24 text-center sm:px-6">
        <SectionTitle kicker="About the festival" title="One hall. Ten nightmares." />
        <p className="reveal mt-8 text-lg leading-relaxed text-muted-foreground">
          The ESOFT Halloween Film Festival brings ten iconic horror films to the A2-4 Lecture Hall at ESOFT Metro Campus.
          Each screening has just <span className="text-gold">30 seats</span>, and every student can book up to two — so grab
          a friend, pick your seats, and face the dark together.
        </p>
        <p className="reveal mt-10 inline-block -rotate-2 bg-[image:var(--gradient-gold)] px-8 py-3 font-brush text-2xl text-gold-foreground shadow-gold">
          See you at the film festival!
        </p>
      </section>

      <SiteFooter />
      <BookingDialog movie={active} onClose={() => setActive(null)} />
    </div>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="reveal text-center">
      <p className="text-xs uppercase tracking-[0.5em] text-primary">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl uppercase text-glow sm:text-5xl">{title}</h2>
    </div>
  );
}

function SeatBar({ available }: { available: number }) {
  const pct = (available / TOTAL_SEATS) * 100;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest">
        <span className={available > 0 ? "text-seat-available" : "text-destructive"}>
          {available} / {TOTAL_SEATS} seats available
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", pct > 20 ? "bg-seat-available" : "bg-destructive")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
