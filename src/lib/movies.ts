import silentHill from "@/assets/silent-hill.jpg.asset.json";
import quietPlace from "@/assets/quiet-place.jpg.asset.json";
import lightsOut from "@/assets/lights-out.jpg.asset.json";
import backrooms from "@/assets/backrooms.jpg.asset.json";
import residentEvil from "@/assets/resident-evil.jpg.asset.json";
import sinister from "@/assets/sinister.jpg.asset.json";
import scream from "@/assets/scream.jpg.asset.json";
import bigSnake from "@/assets/big-snake.jpg.asset.json";
import deepWater from "@/assets/deep-water.jpg.asset.json";
import hereditary from "@/assets/hereditary.jpg.asset.json";
import evilDeadBurn from "@/assets/evil-dead-burn.jpg.asset.json";
import colony from "@/assets/colony.jpg.asset.json";
import caretakers from "@/assets/the-caretakers.jpg.asset.json";
import coldStorage from "@/assets/cold-storage.jpg.asset.json";
import predatorBadlands from "@/assets/predator-badlands.jpg.asset.json";
import kraven from "@/assets/kraven-uploaded.png.asset.json";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const POSTERS: Record<string, string> = {
  "silent-hill": silentHill.url,
  "quiet-place": quietPlace.url,
  "lights-out": lightsOut.url,
  backrooms: backrooms.url,
  "resident-evil": residentEvil.url,
  sinister: sinister.url,
  scream: scream.url,
  "big-snake": bigSnake.url,
  "deep-water": deepWater.url,
  hereditary: hereditary.url,
  "evil-dead-burn": evilDeadBurn.url,
  colony: colony.url,
  "the-caretakers": caretakers.url,
  "cold-storage": coldStorage.url,
  "predator-badlands": predatorBadlands.url,
  kraven: kraven.url,
};

export const VENUE = "A2-4 Lecture Hall";
export const TOTAL_SEATS = 30;
export const MAX_SEATS = 2;

export type Movie = {
  id: number;
  title: string;
  slug: string;
  poster: string;
  date: string;
  time: string;
  duration: string | null;
  description: string;
  venue: string;
  total_seats: number;
};

export type Seat = { movie_id: number; seat_number: string; status: string };

export const SEAT_ROWS: string[][] = [0, 1, 2].map((r) =>
  Array.from({ length: 10 }, (_, i) => `A${r * 10 + i + 1}`),
);

export function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
export function shortDate(d: string) {
  return new Date(d + "T00:00:00")
    .toLocaleDateString("en-GB", { day: "numeric", month: "long" })
    .toUpperCase();
}

export const moviesQuery = queryOptions({
  queryKey: ["movies"],
  queryFn: async () => {
    const { data, error } = await supabase.from("movies").select("*").order("date").order("id");
    if (error) throw error;
    return (data as Movie[]).sort((a, b) =>
      a.date.localeCompare(b.date) || showtimeMinutes(a.time) - showtimeMinutes(b.time) || a.id - b.id,
    );
  },
  staleTime: 5 * 60_000,
});

function showtimeMinutes(time: string) {
  const match = time.match(/(\d{1,2})[.:](\d{2})\s*([AP])\.?M/i);
  if (!match) return 0;
  return (Number(match[1]) % 12 + (match[3].toUpperCase() === "P" ? 12 : 0)) * 60 + Number(match[2]);
}

export const seatsQuery = queryOptions({
  queryKey: ["seats"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("seats")
      .select("movie_id, seat_number, status")
      .limit(1000);
    if (error) throw error;
    return data as Seat[];
  },
  refetchInterval: 15_000,
});

export function bookedSet(seats: Seat[] | undefined, movieId: number) {
  return new Set(
    (seats ?? []).filter((s) => s.movie_id === movieId && s.status === "booked").map((s) => s.seat_number),
  );
}
