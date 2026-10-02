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
};

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

export async function downloadTicket(t: TicketData) {
  const W = 1200, H = 560;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#160606"); bg.addColorStop(1, "#050303");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * 0.6, 0, 10, W * 0.6, 0, 600);
  glow.addColorStop(0, "rgba(180,20,20,0.45)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  x.strokeStyle = "#f2b632"; x.lineWidth = 4; x.strokeRect(14, 14, W - 28, H - 28);

  const img = await loadImg(t.poster);
  if (img) x.drawImage(img, 40, 40, 320, 480);

  const L = 400;
  x.fillStyle = "#f2b632"; x.font = "bold 22px Arial"; x.fillText("ESOFT HALLOWEEN FILM FESTIVAL", L, 80);
  x.fillStyle = "#ffffff"; x.font = "900 48px Arial Black, Arial"; x.fillText(t.movie.toUpperCase(), L, 140, 560);
  const rows: [string, string][] = [
    ["DATE", t.date], ["TIME", t.time], ["VENUE", t.venue],
    [t.seats.length > 1 ? "SEATS" : "SEAT", t.seats.join(", ")],
    ["STUDENT", t.name], ["E NUMBER", t.eNumber], ["PHONE", t.phone], ["BATCH", t.batch],
  ];
  rows.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const px = L + col * 290, py = 200 + row * 70;
    x.fillStyle = "#b8a59a"; x.font = "bold 15px Arial"; x.fillText(k, px, py);
    x.fillStyle = "#ffffff"; x.font = "bold 24px Arial"; x.fillText(v, px, py + 30, 270);
  });
  x.setLineDash([10, 8]); x.strokeStyle = "rgba(242,182,50,0.6)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(990, 40); x.lineTo(990, H - 40); x.stroke(); x.setLineDash([]);
  x.save(); x.translate(1090, H / 2); x.rotate(-Math.PI / 2);
  x.fillStyle = "#f2b632"; x.font = "bold 18px Arial"; x.textAlign = "center";
  x.fillText("BOOKING ID", 0, -30);
  x.fillStyle = "#ffffff"; x.font = "900 38px Arial Black, Arial"; x.fillText(t.bookingId, 0, 20);
  x.restore();

  const a = document.createElement("a");
  a.download = `${t.bookingId}.png`;
  try {
    a.href = c.toDataURL("image/png");
  } catch {
    // poster blocked by CORS — redraw without it
    x.fillStyle = "#1a0707"; x.fillRect(40, 40, 320, 480);
    a.href = c.toDataURL("image/png");
  }
  a.click();
}
