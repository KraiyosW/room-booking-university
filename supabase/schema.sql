create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text not null,
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  booking_date date not null,
  slot text not null check (
    slot in ('09:00-10:00', '10:00-11:00', '13:00-14:00', '14:00-15:00')
  ),
  purpose text not null check (char_length(trim(purpose)) between 3 and 200),
  created_at timestamptz not null default now(),
  constraint bookings_room_date_slot_key unique (room_id, booking_date, slot)
);

create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_date_slot_idx on public.bookings(booking_date, slot);

alter table public.rooms enable row level security;
alter table public.bookings enable row level security;

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.rooms to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;

drop policy if exists rooms_select_authenticated on public.rooms;
create policy rooms_select_authenticated
on public.rooms for select
to authenticated
using (true);

drop policy if exists bookings_select_own on public.bookings;
drop policy if exists bookings_select_authenticated on public.bookings;
create policy bookings_select_own
on public.bookings for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists bookings_insert_own on public.bookings;
create policy bookings_insert_own
on public.bookings for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists bookings_update_own on public.bookings;
create policy bookings_update_own
on public.bookings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists bookings_delete_own on public.bookings;
create policy bookings_delete_own
on public.bookings for delete
to authenticated
using ((select auth.uid()) = user_id);

drop function if exists public.get_booking_availability();
drop function if exists private.booking_availability_rows();

create function private.booking_availability_rows()
returns table (
  booking_id uuid,
  room_id uuid,
  booking_date date,
  slot text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.room_id, b.booking_date, b.slot
  from public.bookings as b
  where (select auth.uid()) is not null
  order by b.booking_date, b.slot;
$$;

revoke all on function private.booking_availability_rows() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.booking_availability_rows() to authenticated;

create function public.get_booking_availability()
returns table (
  booking_id uuid,
  room_id uuid,
  booking_date date,
  slot text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.booking_availability_rows();
$$;

revoke all on function public.get_booking_availability() from public, anon;
grant execute on function public.get_booking_availability() to authenticated;

insert into public.rooms (name, location, capacity) values
  ('Andromeda', 'Library 2F', 4),
  ('Orion', 'Library 2F', 6),
  ('Sirius', 'Learning Commons', 8),
  ('Vega', 'Learning Commons', 12)
on conflict (name) do update
set location = excluded.location,
    capacity = excluded.capacity;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
