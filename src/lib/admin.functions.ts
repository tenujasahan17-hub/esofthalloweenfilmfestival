import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkPassword, issueToken, verifyToken } from "./admin.server";

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
