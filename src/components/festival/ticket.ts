import { toast } from "sonner";

export type TicketData = {
  bookingId: string;
  movie: string;
  date: string;
  time: string;
  venue: string;
  seats: string[];
  name: string;
  eNumber: string;
  phone: string;
  batch: string;
  poster: string;
  bookedOn?: string;
  status?: string;
};

async function loadPoster(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    // fetch as blob so the canvas never becomes tainted (keeps export working)
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error();
    const url = URL.createObjectURL(await res.blob());
    return await new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

function fitText(x: CanvasRenderingContext2D, text: string, max: number, size: number, weight = "900") {
  let s = size;
  do { x.font = `${weight} ${s}px Arial Black, Arial, sans-serif`; s -= 2; } while (x.measureText(text).width > max && s > 18);
}

export async function renderTicket(t: TicketData): Promise<Blob> {
  const S = 2; // 2x for crisp print quality
  const W = 1200, H = 600;
  const c = document.createElement("canvas");
  c.width = W * S; c.height = H * S;
  const x = c.getContext("2d");
  if (!x) throw new Error("Canvas unsupported");
  x.scale(S, S);
  if (document.fonts?.ready) await document.fonts.ready;

  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1c0707"); bg.addColorStop(1, "#050303");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * 0.6, 0, 10, W * 0.6, 0, 650);
  glow.addColorStop(0, "rgba(180,20,20,0.45)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  x.strokeStyle = "#f2b632"; x.lineWidth = 4; x.strokeRect(14, 14, W - 28, H - 28);

  // poster, aspect-preserved inside its frame
  const PX = 40, PY = 40, PW = 330, PH = 520;
  x.fillStyle = "#0d0404"; x.fillRect(PX, PY, PW, PH);
  const img = await loadPoster(t.poster);
  if (img) {
    const r = Math.min(PW / img.width, PH / img.height);
    const w = img.width * r, h = img.height * r;
    x.drawImage(img, PX + (PW - w) / 2, PY + (PH - h) / 2, w, h);
  } else {
    x.fillStyle = "#f2b632"; x.font = "bold 22px Arial"; x.textAlign = "center";
    x.fillText("🎃", PX + PW / 2, PY + PH / 2); x.textAlign = "left";
  }

  const L = 410;
  x.fillStyle = "#f2b632"; x.font = "bold 20px Arial"; x.fillText("ESOFT HALLOWEEN FILM FESTIVAL", L, 78);
  x.fillStyle = "#ffffff"; fitText(x, t.movie.toUpperCase(), 550, 46); x.fillText(t.movie.toUpperCase(), L, 135);
  const rows: [string, string][] = [
    ["DATE", t.date], ["TIME", t.time], ["VENUE", t.venue],
    [t.seats.length > 1 ? "SEATS" : "SEAT", t.seats.join(", ")],
    ["STUDENT", t.name], ["E NUMBER", t.eNumber], ["BATCH", t.batch],
    ["BOOKED ON", t.bookedOn ?? new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
  ];
  rows.forEach(([k, v], i) => {
    const px = L + (i % 2) * 290, py = 195 + Math.floor(i / 2) * 75;
    x.fillStyle = "#b8a59a"; x.font = "bold 15px Arial"; x.fillText(k, px, py);
    x.fillStyle = "#ffffff"; x.font = "bold 22px Arial"; x.fillText(v, px, py + 30, 275);
  });
  x.fillStyle = "#b8a59a"; x.font = "14px Arial";
  x.fillText("Present this ticket at the hall entrance. Valid for the listed seat(s) only.", L, 545);

  x.setLineDash([10, 8]); x.strokeStyle = "rgba(242,182,50,0.6)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(1000, 40); x.lineTo(1000, H - 40); x.stroke(); x.setLineDash([]);
  x.save(); x.translate(1095, H / 2); x.rotate(-Math.PI / 2); x.textAlign = "center";
  x.fillStyle = "#f2b632"; x.font = "bold 18px Arial"; x.fillText("BOOKING ID / TICKET ID", 0, -30);
  x.fillStyle = "#ffffff"; x.font = "900 38px Arial Black, Arial"; x.fillText(t.bookingId, 0, 22);
  x.restore();

  return await new Promise((ok, fail) =>
    c.toBlob((b) => (b && b.size > 1000 ? ok(b) : fail(new Error("Ticket image could not be created"))), "image/png"),
  );
}

export function ticketFilename(t: TicketData) {
  const title = t.movie.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  return `FilmFestival_Ticket_${title}_${t.bookingId}.png`;
}

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export async function downloadTicket(t: TicketData): Promise<boolean> {
  if (t.status && t.status !== "Confirmed") {
    toast.error(`This booking is ${t.status.toLowerCase()} — no valid ticket is available.`);
    return false;
  }
  const id = toast.loading("Preparing your ticket…");
  try {
    const blob = await renderTicket(t);
    const name = ticketFilename(t);
    const file = new File([blob], name, { type: "image/png" });

    // iPhone/iPad: native share sheet → "Save Image" (Photos) or "Save to Files"
    if (isIOS() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${t.movie} ticket` });
        toast.success("Ticket ready — choose “Save Image” or “Save to Files”.", { id });
        return true;
      } catch (e) {
        if ((e as Error).name === "AbortError") { toast.dismiss(id); return false; }
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    if (isIOS()) window.open(url, "_blank"); // fallback: long-press image → Save
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast.success(
      isIOS() ? "Ticket opened — tap Share, then “Save to Files” or “Save Image”." : `Ticket saved as ${name} (check your Downloads folder).`,
      { id },
    );
    return true;
  } catch (e) {
    toast.error(`Download failed: ${(e as Error).message}. Please try again.`, {
      id, action: { label: "Retry", onClick: () => void downloadTicket(t) },
    });
    return false;
  }
}
