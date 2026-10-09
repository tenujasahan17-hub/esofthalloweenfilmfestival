import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_PASSWORD = "2050";
const TTL_MS = 8 * 60 * 60 * 1000;

function key() {
  return "esoft-hff:" + (process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "");
}
function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("hex");
}
function safeEq(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export function checkPassword(pw: string) {
  return safeEq(pw, ADMIN_PASSWORD);
}
export function issueToken() {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
}
export function verifyToken(token: string) {
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!safeEq(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export async function admin(token: string) {
  if (!verifyToken(token)) throw new Error("UNAUTHORIZED");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Db = Awaited<ReturnType<typeof admin>>;
export async function applyStatus(db: Db, id: string, status: "Pending" | "Confirmed" | "Cancelled") {
    const { data: b, error } = await db.from("bookings").select("*").eq("booking_id", id).single();
    if (error || !b) throw new Error("Booking not found");
    if (status === "Cancelled") {
      const { error: e } = await db.from("seats").update({ status: "available", booking_id: null }).eq("booking_id", id);
      if (e) throw new Error(e.message);
    } else if (b.status === "Cancelled") {
      // Re-activating: seats must still be free
      const { data: free } = await db.from("seats").select("seat_number")
        .eq("movie_id", b.movie_id).in("seat_number", b.seats).eq("status", "available");
      if ((free?.length ?? 0) !== b.seats.length) throw new Error("Those seats have been taken by another booking");
      const { error: e } = await db.from("seats").update({ status: "booked", booking_id: id })
        .eq("movie_id", b.movie_id).in("seat_number", b.seats).eq("status", "available");
      if (e) throw new Error(e.message);
    }
    const { error: e2 } = await db.from("bookings").update({ status: status }).eq("booking_id", id);
    if (e2) throw new Error(e2.message);
}

