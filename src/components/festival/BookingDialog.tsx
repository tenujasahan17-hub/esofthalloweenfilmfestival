import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, Clock, MapPin, Armchair, Download, Loader2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MAX_SEATS, POSTERS, TOTAL_SEATS, VENUE, bookedSet, formatDate, seatsQuery, type Movie } from "@/lib/movies";
import { SeatLegend, SeatMap } from "./SeatMap";
import { downloadTicket, type TicketData } from "./ticket";

const formSchema = z.object({
  eNumber: z.string().trim().regex(/^E\d{3,10}$/i, "Enter a valid E Number, e.g. E12345"),
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid phone number, e.g. 0771234567"),
  batch: z.string().trim().min(1, "Enter your batch").max(30),
});
type Form = z.infer<typeof formSchema>;

type Step = "seats" | "form" | "review" | "done";

export function BookingDialog({ movie, onClose }: { movie: Movie | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: seats } = useQuery(seatsQuery);
  const [step, setStep] = useState<Step>("seats");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<Form>({ eNumber: "", name: "", phone: "", batch: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);

  useEffect(() => {
    if (movie) {
      setStep("seats"); setSelected([]); setErrors({}); setTicket(null);
    }
  }, [movie?.id]);

  const booked = useMemo(() => (movie ? bookedSet(seats, movie.id) : new Set<string>()), [seats, movie]);

  // drop selections that just got booked by someone else
  useEffect(() => {
    if (step === "done") return;
    const lost = selected.filter((s) => booked.has(s));
    if (lost.length) {
      setSelected((p) => p.filter((s) => !booked.has(s)));
      toast.error(`Seat ${lost.join(", ")} was just booked by someone else.`);
    }
  }, [booked]);

  if (!movie) return null;
  const available = TOTAL_SEATS - booked.size;
  const poster = POSTERS[movie.poster] ?? "";

  const toggle = (seat: string) => {
    setSelected((prev) => {
      if (prev.includes(seat)) return prev.filter((s) => s !== seat);
      if (prev.length >= MAX_SEATS) {
        toast.warning(`You can book a maximum of ${MAX_SEATS} seats per booking.`);
        return prev;
      }
      return [...prev, seat];
    });
  };

  const validate = () => {
    const r = formSchema.safeParse(form);
    if (r.success) { setErrors({}); return true; }
    const e: Partial<Record<keyof Form, string>> = {};
    r.error.issues.forEach((i) => { e[i.path[0] as keyof Form] ??= i.message; });
    setErrors(e);
    return false;
  };

  const confirm = async () => {
    if (!validate() || selected.length === 0) return;
    setSubmitting(true);
    const sorted = [...selected].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    const { data, error } = await supabase.rpc("book_seats", {
      _movie_id: movie.id,
      _seats: sorted,
      _e_number: form.eNumber.trim().toUpperCase(),
      _name: form.name.trim(),
      _phone: form.phone.trim(),
      _batch: form.batch.trim(),
    });
    setSubmitting(false);
    await qc.invalidateQueries({ queryKey: ["seats"] });
    if (error) {
      if (error.message.includes("SEAT_TAKEN")) {
        toast.error("Sorry — one of your seats was just taken. Please pick again.");
        setSelected([]); setStep("seats");
      } else toast.error(error.message);
      return;
    }
    const res = data as { booking_id: string };
    setTicket({
      bookingId: res.booking_id, movie: movie.title, date: formatDate(movie.date), time: movie.time,
      venue: VENUE, seats: sorted, name: form.name.trim(), eNumber: form.eNumber.trim().toUpperCase(),
      phone: form.phone.trim(), batch: form.batch.trim(), poster,
    });
    setStep("done");
  };

  const field = (k: keyof Form, label: string, placeholder: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k} className="text-xs uppercase tracking-widest text-muted-foreground">{label} *</Label>
      <Input
        id={k} type={type} value={form[k]} placeholder={placeholder} maxLength={100}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        className="h-11 border-border bg-background/60"
        aria-invalid={!!errors[k]}
      />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={!!movie} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto p-0 sm:rounded-xl">
        {step !== "done" && (
          <div className="flex gap-4 border-b border-border p-4 sm:gap-6 sm:p-6">
            <img src={poster} alt={movie.title} className="h-28 w-20 shrink-0 rounded-md object-cover shadow-glow sm:h-40 sm:w-28" />
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.35em] text-gold">Film {String(movie.id).padStart(2, "0")} / 10</p>
              <DialogTitle className="font-display text-xl uppercase leading-tight sm:text-3xl">{movie.title}</DialogTitle>
              <DialogDescription className="sr-only">Select up to two seats and book your ticket.</DialogDescription>
              <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2 sm:gap-x-6">
                <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" />{formatDate(movie.date)}</span>
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold" />{movie.time}</span>
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" />{VENUE}</span>
                <span className="flex items-center gap-2"><Armchair className="h-4 w-4 text-gold" />{available} / {TOTAL_SEATS} seats available</span>
              </div>
            </div>
          </div>
        )}

        {step === "seats" && (
          <div className="space-y-6 p-4 sm:p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="font-display text-lg uppercase tracking-wider">Choose your seats</h3>
              <p className="text-sm text-muted-foreground">Select 1 or 2 seats — maximum {MAX_SEATS} per booking.</p>
            </div>
            <SeatMap booked={booked} selected={selected} onSeatClick={toggle} />
            <SeatLegend />
            <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-5 sm:flex-row">
              <p className="text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <span className="font-display text-gold">{selected.length ? selected.join(", ") : "—"}</span>
              </p>
              <Button variant="blood" size="lg" disabled={!selected.length} onClick={() => setStep("form")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-6 p-4 sm:p-8">
            <h3 className="font-display text-lg uppercase tracking-wider">Student details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("eNumber", "E Number", "E12345")}
              {field("name", "Full Name", "Your full name")}
              {field("phone", "Phone Number", "07XXXXXXXX", "tel")}
              {field("batch", "Batch", "e.g. 24.1")}
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-background/40 p-4 text-sm sm:grid-cols-4">
              <Info k="Movie" v={movie.title} />
              <Info k="Time" v={movie.time} />
              <Info k="Venue" v={VENUE} />
              <Info k={selected.length > 1 ? "Seats" : "Seat"} v={selected.join(", ")} />
            </div>
            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <Button variant="ghost" onClick={() => setStep("seats")}><ArrowLeft />Change seats</Button>
              <Button variant="blood" size="lg" onClick={() => validate() && setStep("review")}>Review booking</Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6 p-4 sm:p-8">
            <h3 className="font-display text-lg uppercase tracking-wider">Confirm your booking</h3>
            <div className="grid gap-4 rounded-lg border border-gold/30 bg-background/40 p-5 text-sm sm:grid-cols-3">
              <Info k="Movie" v={movie.title} />
              <Info k="Date" v={formatDate(movie.date)} />
              <Info k="Time" v={movie.time} />
              <Info k="Venue" v={VENUE} />
              <Info k={selected.length > 1 ? "Seats" : "Seat"} v={selected.join(", ")} />
              <Info k="E Number" v={form.eNumber.toUpperCase()} />
              <Info k="Student" v={form.name} />
              <Info k="Phone" v={form.phone} />
              <Info k="Batch" v={form.batch} />
            </div>
            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <Button variant="ghost" onClick={() => setStep("form")}><ArrowLeft />Edit details</Button>
              <Button variant="gold" size="lg" disabled={submitting} onClick={confirm}>
                {submitting && <Loader2 className="animate-spin" />}Confirm booking
              </Button>
            </div>
          </div>
        )}

        {step === "done" && ticket && (
          <div className="p-4 sm:p-8">
            <DialogTitle className="text-center font-display text-2xl uppercase text-gold sm:text-4xl">Booking Confirmed 🎃</DialogTitle>
            <DialogDescription className="mt-2 text-center text-sm text-muted-foreground">
              Show this ticket at the A2-4 Lecture Hall entrance.
            </DialogDescription>
            <div className="relative mt-6 overflow-hidden rounded-xl border-2 border-gold/70 bg-curtain shadow-gold">
              <div className="flex flex-col sm:flex-row">
                <img src={ticket.poster} alt="" className="h-48 w-full object-cover sm:h-auto sm:w-48" />
                <div className="flex-1 bg-background/80 p-5 sm:p-6">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-gold">ESOFT Halloween Film Festival</p>
                  <p className="mt-1 font-display text-2xl uppercase">{ticket.movie}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Info k="Date" v={ticket.date} />
                    <Info k="Time" v={ticket.time} />
                    <Info k="Venue" v={ticket.venue} />
                    <Info k={ticket.seats.length > 1 ? "Seats" : "Seat"} v={ticket.seats.join(", ")} />
                    <Info k="Student" v={ticket.name} />
                    <Info k="E Number" v={ticket.eNumber} />
                    <Info k="Phone" v={ticket.phone} />
                    <Info k="Batch" v={ticket.batch} />
                  </div>
                </div>
                <div className="flex items-center justify-center border-t-2 border-dashed border-gold/50 bg-background/90 p-4 sm:w-40 sm:border-l-2 sm:border-t-0">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Booking ID</p>
                    <p className="font-display text-lg text-gold sm:[writing-mode:vertical-rl] sm:rotate-180 sm:text-2xl">{ticket.bookingId}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="gold" size="lg" onClick={() => downloadTicket(ticket)}><Download />Download / Save ticket</Button>
              <Button variant="ghostly" size="lg" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p>
      <p className="truncate font-semibold">{v}</p>
    </div>
  );
}
