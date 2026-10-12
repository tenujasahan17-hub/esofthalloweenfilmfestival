import { useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { POSTERS, formatDate } from "@/lib/movies";
import { downloadTicket, type TicketData } from "./ticket";

type Row = {
  booking_id: string; status: string; student_name: string; e_number: string; phone: string; batch: string;
  seats: string[]; booking_date: string; title: string; poster: string; date: string; time: string; venue: string;
};

export function FindTicket() {
  const [f, setF] = useState({ id: "", e: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const find = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr(""); setTicket(null);
    if (!f.id.trim() || !f.e.trim() || !f.phone.trim()) { setErr("Fill in all three fields."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("get_ticket", { _booking_id: f.id, _e_number: f.e, _phone: f.phone });
    setBusy(false);
    if (error) {
      setErr(error.message.includes("TICKET_NOT_FOUND")
        ? "No booking matches those details. Check your Booking ID, E Number and phone."
        : "Couldn't reach the server — check your connection and try again.");
      return;
    }
    const r = data as unknown as Row;
    setTicket({
      bookingId: r.booking_id, movie: r.title, date: formatDate(r.date), time: r.time, venue: r.venue,
      seats: r.seats, name: r.student_name, eNumber: r.e_number, phone: r.phone, batch: r.batch,
      poster: POSTERS[r.poster] ?? "", status: r.status,
      bookedOn: new Date(r.booking_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    });
  };

  return (
    <div className="reveal mx-auto mt-10 max-w-3xl rounded-xl border border-border bg-card/60 p-5 text-left sm:p-8">
      <form onSubmit={find} className="grid gap-4 sm:grid-cols-3">
        {([["id", "Booking ID", "HF-2026-0001"], ["e", "E Number", "E12345"], ["phone", "Phone", "07XXXXXXXX"]] as const).map(([k, l, p]) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={`ft-${k}`} className="text-xs uppercase tracking-widest text-muted-foreground">{l}</Label>
            <Input id={`ft-${k}`} value={f[k]} placeholder={p} maxLength={40} className="h-11 bg-background/60"
              onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))} />
          </div>
        ))}
        <Button type="submit" variant="blood" size="lg" disabled={busy} className="sm:col-span-3">
          {busy ? <Loader2 className="animate-spin" /> : <Search />}Find my ticket
        </Button>
      </form>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      {ticket && (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-gold/40 bg-background/50 p-4 sm:flex-row">
          {ticket.poster && <img src={ticket.poster} alt={`${ticket.movie} poster`} className="h-32 w-auto object-contain" />}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-display text-lg uppercase">{ticket.movie}</p>
            <p className="text-muted-foreground">{ticket.date} · {ticket.time} · Seat {ticket.seats.join(", ")}</p>
            <p className={ticket.status === "Confirmed" ? "text-gold" : "text-destructive"}>
              {ticket.status === "Confirmed" ? `Confirmed · ${ticket.bookingId}` : `This booking is ${ticket.status} — ticket not valid.`}
            </p>
          </div>
          {ticket.status === "Confirmed" && (
            <Button variant="gold" onClick={() => downloadTicket(ticket)}><Download />Download Ticket</Button>
          )}
        </div>
      )}
    </div>
  );
}
