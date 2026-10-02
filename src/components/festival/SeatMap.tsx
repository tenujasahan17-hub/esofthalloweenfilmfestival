import { cn } from "@/lib/utils";
import { SEAT_ROWS } from "@/lib/movies";

type Props = {
  booked: Set<string>;
  selected?: string[];
  onSeatClick: (seat: string) => void;
  mode?: "book" | "admin";
};

export function SeatMap({ booked, selected = [], onSeatClick, mode = "book" }: Props) {
  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-2.5 sm:gap-3">
        {SEAT_ROWS.map((row, r) => (
          <div key={r} className="flex items-center justify-center gap-1.5 sm:gap-2">
            {row.map((seat, i) => {
              const isBooked = booked.has(seat);
              const isSel = selected.includes(seat);
              const disabled = mode === "book" && isBooked;
              return (
                <div key={seat} className={cn("flex", i === 5 && "ml-3 sm:ml-6")}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSeatClick(seat)}
                    aria-label={`Seat ${seat}${isBooked ? " booked" : isSel ? " selected" : " available"}`}
                    className={cn(
                      "relative grid h-8 w-7 place-items-center rounded-t-lg rounded-b-sm border text-[10px] font-semibold transition-all sm:h-10 sm:w-10 sm:text-xs",
                      isBooked &&
                        "border-seat-booked/70 bg-seat-booked/30 text-foreground/60",
                      isBooked && mode === "admin" && "cursor-pointer hover:bg-seat-booked/60",
                      isBooked && mode === "book" && "cursor-not-allowed",
                      !isBooked && !isSel &&
                        "border-seat-available/70 bg-seat-available/10 text-seat-available hover:bg-seat-available/25 hover:-translate-y-0.5",
                      isSel && "border-seat-selected bg-seat-selected text-gold-foreground shadow-gold -translate-y-0.5",
                      mode === "admin" && !isBooked && "cursor-default hover:translate-y-0",
                    )}
                  >
                    {seat}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 w-4/5 max-w-md">
        <div className="h-2 rounded-full bg-[image:var(--gradient-gold)] opacity-80 shadow-gold" />
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          Screen
        </p>
      </div>
    </div>
  );
}

export function SeatLegend({ admin = false }: { admin?: boolean }) {
  const items = [
    { label: "Available", cls: "border-seat-available bg-seat-available/20" },
    { label: "Booked", cls: "border-seat-booked bg-seat-booked/40" },
    ...(admin ? [] : [{ label: "Selected", cls: "border-seat-selected bg-seat-selected" }]),
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 text-xs uppercase tracking-widest text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <span className={cn("h-4 w-4 rounded-t-md rounded-b-sm border", it.cls)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
