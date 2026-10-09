import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkPassword, issueToken, verifyToken, admin, applyStatus } from "./admin.server";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    await new Promise((r) => setTimeout(r, 400));
    if (!checkPassword(data.password)) return { ok: false as const, token: null };
    return { ok: true as const, token: issueToken() };
  });

export type AdminBooking = {
  booking_id: string;
  movie_id: number;
  movie_title: string;
  e_number: string;
  student_name: string;
  phone: string;
  batch: string;
  seats: string[];
  booking_date: string;
  status: string;
};

export const getAdminBookings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    if (!verifyToken(data.token)) throw new Error("UNAUTHORIZED");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return rows as AdminBooking[];
  });

const STATUSES = ["Pending", "Confirmed", "Cancelled"] as const;
const tokenSchema = z.string().max(300);
const idSchema = z.string().regex(/^HF-\d{4}-\d{1,6}$/);

export const setBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, id: idSchema, status: z.enum(STATUSES) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.token);
    await applyStatus(db, data.id, data.status);
    return { ok: true };
  });

export const updateBooking = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: tokenSchema,
      id: idSchema,
      student_name: z.string().trim().min(2).max(100),
      e_number: z.string().trim().regex(/^E[0-9]{3,10}$/i, "Invalid E Number"),
      phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Invalid phone number"),
      batch: z.string().trim().min(1).max(30),
      booking_date: z.string().datetime({ offset: true }),
      status: z.enum(STATUSES),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin(data.token);
    const { data: cur } = await db.from("bookings").select("status").eq("booking_id", data.id).single();
    if (!cur) throw new Error("Booking not found");
    if (cur.status !== data.status) {
      await applyStatus(db, data.id, data.status);
    }
    const { error } = await db.from("bookings").update({
      student_name: data.student_name,
      e_number: data.e_number.toUpperCase(),
      phone: data.phone,
      batch: data.batch,
      booking_date: data.booking_date,
    }).eq("booking_id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, id: idSchema }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin(data.token);
    const { error: e1 } = await db.from("seats").update({ status: "available", booking_id: null }).eq("booking_id", data.id);
    if (e1) throw new Error(e1.message);
    const { error } = await db.from("bookings").delete().eq("booking_id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
