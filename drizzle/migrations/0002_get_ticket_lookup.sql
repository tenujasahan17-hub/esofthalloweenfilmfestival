create or replace function public.get_ticket(_booking_id text, _e_number text, _phone text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare b record;
begin
  select bk.booking_id, bk.status, bk.student_name, bk.e_number, bk.phone, bk.batch, bk.seats, bk.booking_date,
         m.title, m.poster, m.date, m.time, m.venue
    into b
  from bookings bk join movies m on m.id = bk.movie_id
  where upper(bk.booking_id) = upper(trim(_booking_id))
    and upper(bk.e_number) = upper(trim(_e_number))
    and regexp_replace(bk.phone, '[^0-9]', '', 'g') = regexp_replace(_phone, '[^0-9]', '', 'g');
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;
  return to_jsonb(b);
end $$;
revoke all on function public.get_ticket(text, text, text) from public;
grant execute on function public.get_ticket(text, text, text) to anon, authenticated;