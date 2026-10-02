create table public.movies (
  id int primary key,
  title text not null,
  slug text not null unique,
  poster text not null,
  date date not null,
  time text not null,
  duration text,
  description text not null,
  venue text not null default 'A2-4 Lecture Hall',
  total_seats int not null default 30
);
grant select on public.movies to anon, authenticated;
grant all on public.movies to service_role;
alter table public.movies enable row level security;
create policy "Movies are public" on public.movies for select to anon, authenticated using (true);

create sequence public.booking_seq start 1;

create table public.bookings (
  booking_id text primary key,
  movie_id int not null references public.movies(id),
  movie_title text not null,
  e_number text not null,
  student_name text not null,
  phone text not null,
  batch text not null,
  seats text[] not null,
  booking_date timestamptz not null default now(),
  status text not null default 'Confirmed'
);
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

create table public.seats (
  id uuid primary key default gen_random_uuid(),
  movie_id int not null references public.movies(id),
  seat_number text not null,
  status text not null default 'available',
  booking_id text references public.bookings(booking_id),
  unique (movie_id, seat_number)
);
grant select (id, movie_id, seat_number, status) on public.seats to anon, authenticated;
grant all on public.seats to service_role;
alter table public.seats enable row level security;
create policy "Seat status is public" on public.seats for select to anon, authenticated using (true);
alter publication supabase_realtime add table public.seats;

insert into public.movies (id,title,slug,poster,date,time,duration,description) values
(1,'Return to Silent Hill','silent-hill','silent-hill','2026-10-26','12.30 P.M – 3.00 P.M','2h 30m','A man returns to the fog-drowned town of Silent Hill searching for his lost love — and finds something far worse waiting.'),
(2,'A Quiet Place Part II','quiet-place','quiet-place','2026-10-26','3.15 P.M – 5.30 P.M','2h 15m','The Abbott family ventures beyond their home into a silent world where every sound can be your last.'),
(3,'Lights Out','lights-out','lights-out','2026-10-27','12.30 P.M – 3.00 P.M','2h 30m','When the lights go out, something appears. A terrifying entity that only exists in the dark.'),
(4,'Backrooms','backrooms','backrooms','2026-10-27','3.15 P.M – 5.30 P.M','2h 15m','No-clip out of reality into endless yellow halls, humming lights and something that hunts the lost.'),
(5,'Resident Evil','resident-evil','resident-evil','2026-10-28','12.30 P.M – 3.00 P.M','2h 30m','An outbreak, a sealed facility and the Umbrella Corporation''s darkest secret clawing its way out.'),
(6,'Sinister','sinister','sinister','2026-10-28','3.15 P.M – 5.30 P.M','2h 15m','A true-crime writer discovers a box of home movies that pull his family into the grip of an ancient evil.'),
(7,'Scream 7','scream','scream','2026-10-29','12.30 P.M – 3.00 P.M','2h 30m','Ghostface is back — and this time the killer comes for Sidney''s family. Fear hits home.'),
(8,'Big Snake','big-snake','big-snake','2026-10-29','3.15 P.M – 5.30 P.M','2h 15m','Deep in the jungle, a monstrous serpent awakens and an expedition becomes a fight to survive.'),
(9,'Deep Water','deep-water','deep-water','2026-10-30','12.30 P.M – 3.00 P.M','2h 30m','A plane goes down in shark-infested waters. The crash was only the beginning.'),
(10,'Hereditary','hereditary','hereditary','2026-10-30','3.15 P.M – 5.30 P.M','2h 15m','After their grandmother dies, a family unravels the terrifying secrets of their ancestry.');

insert into public.seats (movie_id, seat_number)
select m.id, 'A' || s from public.movies m cross join generate_series(1,30) s;

create or replace function public.book_seats(_movie_id int, _seats text[], _e_number text, _name text, _phone text, _batch text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _bid text; _title text; _locked int; _n int;
begin
  _n := coalesce(array_length(_seats,1),0);
  if _n < 1 or _n > 2 then raise exception 'Select 1 or 2 seats'; end if;
  if (select count(distinct x) from unnest(_seats) x) <> _n then raise exception 'Duplicate seats'; end if;
  if _e_number !~* '^E[0-9]{3,10}$' then raise exception 'Invalid E Number'; end if;
  if length(trim(_name)) < 2 or length(_name) > 100 then raise exception 'Invalid name'; end if;
  if _phone !~ '^\+?[0-9 ]{9,15}$' then raise exception 'Invalid phone number'; end if;
  if length(trim(_batch)) < 1 or length(_batch) > 30 then raise exception 'Invalid batch'; end if;
  select title into _title from movies where id = _movie_id;
  if _title is null then raise exception 'Movie not found'; end if;
  perform 1 from seats where movie_id = _movie_id and seat_number = any(_seats) for update;
  select count(*) into _locked from seats where movie_id = _movie_id and seat_number = any(_seats) and status = 'available';
  if _locked <> _n then raise exception 'SEAT_TAKEN'; end if;
  _bid := 'HF-2026-' || lpad(nextval('booking_seq')::text, 4, '0');
  insert into bookings(booking_id, movie_id, movie_title, e_number, student_name, phone, batch, seats)
  values (_bid, _movie_id, _title, upper(trim(_e_number)), trim(_name), trim(_phone), trim(_batch), _seats);
  update seats set status = 'booked', booking_id = _bid where movie_id = _movie_id and seat_number = any(_seats);
  return jsonb_build_object('booking_id', _bid, 'booking_date', now());
end $$;
revoke all on function public.book_seats from public;
grant execute on function public.book_seats to anon, authenticated;