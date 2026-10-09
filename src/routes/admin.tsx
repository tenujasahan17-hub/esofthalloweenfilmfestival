import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, LogOut, Search, Film, Ticket, Armchair, Users, Loader2, RefreshCw, Check, Pencil, Trash2, Ban } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeatLegend, SeatMap } from "@/components/festival/SeatMap";
import { adminLogin, getAdminBookings, setBookingStatus, updateBooking, deleteBooking, type AdminBooking } from "@/lib/admin.functions";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<AdminBooking | null>(null);
  const [deleting, setDeleting] = useState<AdminBooking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const qc = useQueryClient();
  const setStatusFn = useServerFn(setBookingStatus);
  const deleteFn = useServerFn(deleteBooking);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin-bookings"] }), qc.invalidateQueries({ queryKey: moviesQuery.queryKey })]);
  const changeStatus = async (b: AdminBooking, status: "Confirmed" | "Cancelled" | "Pending") => {
    setBusyId(b.booking_id);
    try { await setStatusFn({ data: { token, id: b.booking_id, status } }); await refresh(); toast.success(`${b.booking_id} marked ${status}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
    setBusyId(null);
  };
  const doDelete = async () => {
    if (!deleting) return;
    const b = deleting;
    setBusyId(b.booking_id);
    try { await deleteFn({ data: { token, id: b.booking_id } }); await refresh(); toast.success(`${b.booking_id} deleted`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
    setBusyId(null); setDeleting(null);
  };

  const list = bookings ?? [];
  const sold = (id: number) => list.filter((b) => b.movie_id === id && b.status !== "Cancelled").reduce((n, b) => n + b.seats.length, 0);
  const active = list.filter((b) => b.status !== "Cancelled");
  const totalTickets = active.reduce((n, b) => n + b.seats.length, 0);
  const totalSeats = (movies?.length ?? 10) * TOTAL_SEATS;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((b) => {
      if (movieFilter !== "all" && b.movie_id !== movieFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!s) return true;
      return [b.booking_id, b.e_number, b.student_name, b.phone, b.batch, b.movie_title, ...b.seats].some((v) => v.toLowerCase().includes(s));
    });
  }, [list, q, movieFilter, statusFilter]);

  const movieById = (id: number) => movies?.find((m) => m.id === id);

  const seatMapBooked = useMemo(() => {
    const map = new Map<string, AdminBooking>();
    if (seatMovie) active.filter((b) => b.movie_id === seatMovie.id).forEach((b) => b.seats.forEach((s) => map.set(s, b)));
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
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All statuses</option>
                <option>Pending</option><option>Confirmed</option><option>Cancelled</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Booking ID", "Movie", "Date", "Time", "E Number", "Name", "Phone", "Batch", "Seats", "Booked At", "Status", "Actions"].map((h) => (
                    <TableHead key={h} className="whitespace-nowrap text-xs uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={12} className="py-10 text-center text-muted-foreground">No bookings found.</TableCell></TableRow>
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
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {busyId === b.booking_id ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : <>
                            {b.status !== "Confirmed" && <Button size="sm" variant="blood" className="h-7 text-[10px]" onClick={() => changeStatus(b, "Confirmed")}><Check />Confirm</Button>}
                            {b.status !== "Cancelled" && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Cancel booking" title="Cancel booking" onClick={() => changeStatus(b, "Cancelled")}><Ban /></Button>}
                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit booking" title="Edit" onClick={() => setEditing(b)}><Pencil /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" aria-label="Delete booking" title="Delete" onClick={() => setDeleting(b)}><Trash2 /></Button>
                          </>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      {editing && <EditDialog token={token} booking={editing} onClose={() => setEditing(null)} onSaved={refresh} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase">Delete booking {deleting?.booking_id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleting?.student_name}'s booking for {deleting?.movie_title} and frees seats {deleting?.seats.join(", ")}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doDelete(); }} disabled={!!busyId} className="bg-primary">
              {busyId && <Loader2 className="animate-spin" />}Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function StatusBadge({ status }: { status: string }) {
  const cls = status === "Confirmed" ? "bg-seat-available/15 text-seat-available" : status === "Cancelled" ? "bg-primary/15 text-primary" : "bg-gold/15 text-gold";
  return <span className={cn("rounded-full px-2 py-0.5 text-xs", cls)}>{status}</span>;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditDialog({ token, booking, onClose, onSaved }: { token: string; booking: AdminBooking; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const save = useServerFn(updateBooking);
  const [f, setF] = useState({
    student_name: booking.student_name, e_number: booking.e_number, phone: booking.phone,
    batch: booking.batch, booking_date: toLocalInput(booking.booking_date), status: booking.status as "Pending" | "Confirmed" | "Cancelled",
  });
  const [busy, setBusy] = useState(false);
  const errors: Record<string, string> = {};
  if (f.student_name.trim().length < 2) errors["student_name"] = "At least 2 characters";
  if (!/^E[0-9]{3,10}$/i.test(f.e_number.trim())) errors["e_number"] = "Format: E followed by digits";
  if (!/^\+?[0-9 ]{9,15}$/.test(f.phone.trim())) errors["phone"] = "9–15 digits";
  if (!f.batch.trim()) errors["batch"] = "Required";
  if (!f.booking_date) errors["booking_date"] = "Required";
  const valid = Object.keys(errors).length === 0;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await save({ data: { token, id: booking.booking_id, ...f, booking_date: new Date(f.booking_date).toISOString() } });
      await onSaved();
      toast.success(`${booking.booking_id} updated`);
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    setBusy(false);
  };
  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={k} className="text-xs uppercase tracking-widest">{label}</Label>
      <Input id={k} type={type} value={f[k]} maxLength={100} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {errors[k] && <p className="text-xs text-primary">{errors[k]}</p>}
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto">
        <DialogTitle className="font-display uppercase">Edit {booking.booking_id}</DialogTitle>
        <DialogDescription>{booking.movie_title} · Seats {booking.seats.join(", ")}</DialogDescription>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {field("student_name", "Name")}
          {field("e_number", "E Number")}
          {field("phone", "Phone")}
          {field("batch", "Batch")}
          {field("booking_date", "Booked at", "datetime-local")}
          <div className="space-y-1">
            <Label htmlFor="status" className="text-xs uppercase tracking-widest">Status</Label>
            <select id="status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Pending</option><option>Confirmed</option><option>Cancelled</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="blood" disabled={busy || !valid}>{busy && <Loader2 className="animate-spin" />}Save changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
