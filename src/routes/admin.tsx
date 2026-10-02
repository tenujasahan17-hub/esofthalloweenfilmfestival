import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, LogOut, Search, Film, Ticket, Armchair, Users, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeatLegend, SeatMap } from "@/components/festival/SeatMap";
import { adminLogin, getAdminBookings, type AdminBooking } from "@/lib/admin.functions";
import { POSTERS, TOTAL_SEATS, formatDate, moviesQuery, type Movie } from "@/lib/movies";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ESOFT Halloween Film Festival" },
      { name: "description", content: "Organiser dashboard for ESOFT Halloween Film Festival bookings." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Dashboard — ESOFT Halloween Film Festival" },
      { property: "og:description", content: "Organiser dashboard for festival bookings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const TOKEN_KEY = "hff-admin-token";

function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setToken(sessionStorage.getItem(TOKEN_KEY));
    setReady(true);
  }, []);
  const logout = () => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); };
  if (!ready) return <div className="min-h-screen bg-background" />;
  return token ? <Dashboard token={token} onLogout={logout} /> : <Login onLogin={(t) => { sessionStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;
}

function Login({ onLogin }: { onLogin: (t: string) => void }) {
  const login = useServerFn(adminLogin);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await login({ data: { password: pw } });
      if (r.ok && r.token) onLogin(r.token);
      else toast.error("Incorrect password");
    } catch { toast.error("Login failed, try again"); }
    setBusy(false);
  };
  return (
    <div className="grid min-h-screen place-items-center bg-curtain px-4">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-5 rounded-xl p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blood shadow-glow"><Lock className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-xl uppercase">Admin Access</h1>
          <p className="mt-1 text-sm text-muted-foreground">ESOFT Halloween Film Festival</p>
        </div>
        <Input type="password" autoFocus placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 text-center" maxLength={100} />
        <Button variant="blood" size="lg" className="w-full" disabled={busy || !pw}>
          {busy && <Loader2 className="animate-spin" />}Log in
        </Button>
      </form>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const fetchBookings = useServerFn(getAdminBookings);
  const { data: movies } = useQuery(moviesQuery);
  const { data: bookings, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-bookings", token],
    queryFn: () => fetchBookings({ data: { token } }),
    refetchInterval: 20_000,
    retry: false,
  });
  useEffect(() => { if (error) { toast.error("Session expired — please log in again"); onLogout(); } }, [error]);

  const [q, setQ] = useState("");
  const [movieFilter, setMovieFilter] = useState<number | "all">("all");
  const [seatMovie, setSeatMovie] = useState<Movie | null>(null);
  const [seatInfo, setSeatInfo] = useState<{ seat: string; b: AdminBooking } | null>(null);

  const list = bookings ?? [];
  const sold = (id: number) => list.filter((b) => b.movie_id === id && b.status === "Confirmed").reduce((n, b) => n + b.seats.length, 0);
  const totalTickets = list.reduce((n, b) => n + b.seats.length, 0);
  const totalSeats = (movies?.length ?? 10) * TOTAL_SEATS;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((b) => {
      if (movieFilter !== "all" && b.movie_id !== movieFilter) return false;
      if (!s) return true;
      return [b.booking_id, b.e_number, b.student_name, b.phone, b.batch, b.movie_title, ...b.seats].some((v) => v.toLowerCase().includes(s));
    });
  }, [list, q, movieFilter]);

  const movieById = (id: number) => movies?.find((m) => m.id === id);

  const seatMapBooked = useMemo(() => {
    const map = new Map<string, AdminBooking>();
    if (seatMovie) list.filter((b) => b.movie_id === seatMovie.id).forEach((b) => b.seats.forEach((s) => map.set(s, b)));
    return map;
  }, [seatMovie, list]);

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6">
          <h1 className="truncate font-display text-sm uppercase sm:text-lg">
            ESOFT Halloween Film Festival <span className="text-gold">– Admin Dashboard</span>
          </h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh"><RefreshCw className={cn(isFetching && "animate-spin")} /></Button>
            <Button variant="ghostly" size="sm" onClick={onLogout}><LogOut />Log out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat icon={Film} label="Total Movies" value={movies?.length ?? 0} />
          <Stat icon={Users} label="Total Bookings" value={list.length} />
          <Stat icon={Ticket} label="Tickets Sold" value={totalTickets} />
          <Stat icon={Armchair} label="Available Seats" value={totalSeats - totalTickets} />
          <Stat icon={Armchair} label="Occupied Seats" value={totalTickets} accent />
        </section>

        <section>
          <h2 className="mb-5 font-display text-xl uppercase">Movie Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(movies ?? []).map((m) => {
              const s = sold(m.id);
              const count = list.filter((b) => b.movie_id === m.id).length;
              const pct = Math.round((s / TOTAL_SEATS) * 100);
              return (
                <div key={m.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <img src={POSTERS[m.poster]} alt="" className="h-32 w-22 shrink-0 rounded-md object-cover" style={{ width: "5.5rem" }} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[10px] uppercase tracking-widest text-gold">Movie {String(m.id).padStart(2, "0")}</p>
                    <p className="truncate font-display uppercase">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.time}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <Mini k="Bookings" v={count} />
                      <Mini k="Sold" v={`${s}/${TOTAL_SEATS}`} />
                      <Mini k="Available" v={TOTAL_SEATS - s} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={pct} className="h-1.5" />
                      <span className="text-xs font-semibold text-gold">{pct}%</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="blood" className="h-7 text-[10px]" onClick={() => { setMovieFilter(m.id); document.getElementById("bookings")?.scrollIntoView({ behavior: "smooth" }); }}>View bookings</Button>
                      <Button size="sm" variant="ghostly" className="h-7 text-[10px]" onClick={() => setSeatMovie(m)}>Seat map</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="bookings" className="scroll-mt-24">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display text-xl uppercase">Bookings <span className="text-sm text-muted-foreground">({filtered.length})</span></h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search E No, name, phone, ID, seat, batch…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9 sm:w-80" />
              </div>
              <select
                value={movieFilter}
                onChange={(e) => setMovieFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All movies</option>
                {(movies ?? []).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Booking ID", "Movie", "Date", "Time", "E Number", "Name", "Phone", "Batch", "Seats", "Booked At", "Status"].map((h) => (
                    <TableHead key={h} className="whitespace-nowrap text-xs uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="py-10 text-center text-muted-foreground">No bookings found.</TableCell></TableRow>
                )}
                {filtered.map((b) => {
                  const m = movieById(b.movie_id);
                  return (
                    <TableRow key={b.booking_id} className="whitespace-nowrap text-sm">
                      <TableCell className="font-display text-gold">{b.booking_id}</TableCell>
                      <TableCell>{b.movie_title}</TableCell>
                      <TableCell>{m ? formatDate(m.date) : ""}</TableCell>
                      <TableCell>{m?.time}</TableCell>
                      <TableCell>{b.e_number}</TableCell>
                      <TableCell>{b.student_name}</TableCell>
                      <TableCell>{b.phone}</TableCell>
                      <TableCell>{b.batch}</TableCell>
                      <TableCell className="font-semibold">{b.seats.join(", ")}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(b.booking_date).toLocaleString("en-GB")}</TableCell>
                      <TableCell><span className="rounded-full bg-seat-available/15 px-2 py-0.5 text-xs text-seat-available">{b.status}</span></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      <Dialog open={!!seatMovie} onOpenChange={(o) => !o && (setSeatMovie(null), setSeatInfo(null))}>
        <DialogContent className="glass max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto">
          <DialogTitle className="font-display uppercase">{seatMovie?.title} — Seat Map</DialogTitle>
          <DialogDescription>{seatMovie && `${formatDate(seatMovie.date)} · ${seatMovie.time} · ${seatMapBooked.size}/${TOTAL_SEATS} booked. Click a booked seat for details.`}</DialogDescription>
          <div className="space-y-6 py-4">
            <SeatMap
              mode="admin"
              booked={new Set(seatMapBooked.keys())}
              selected={seatInfo ? [seatInfo.seat] : []}
              onSeatClick={(s) => { const b = seatMapBooked.get(s); setSeatInfo(b ? { seat: s, b } : null); }}
            />
            <SeatLegend admin />
            {seatInfo && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-gold/40 bg-background/50 p-4 text-sm sm:grid-cols-3">
                <Mini k="Seat" v={seatInfo.seat} />
                <Mini k="Student" v={seatInfo.b.student_name} />
                <Mini k="E Number" v={seatInfo.b.e_number} />
                <Mini k="Phone" v={seatInfo.b.phone} />
                <Mini k="Batch" v={seatInfo.b.batch} />
                <Mini k="Booking ID" v={seatInfo.b.booking_id} />
                <Mini k="Movie" v={seatInfo.b.movie_title} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Film; label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", accent && "border-primary/50 shadow-glow")}>
      <Icon className="h-5 w-5 text-gold" />
      <p className="mt-3 font-display text-3xl">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p>
      <p className="truncate font-semibold">{v}</p>
    </div>
  );
}
