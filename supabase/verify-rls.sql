begin;

do $$
declare
  user_a uuid;
  user_b uuid;
  room uuid;
  free_date date;
begin
  select id into user_a from auth.users order by created_at, id limit 1;
  select id into user_b from auth.users order by created_at, id offset 1 limit 1;
  select id into room from public.rooms order by name limit 1;

  if user_a is null or user_b is null then
    raise exception 'Two Supabase Auth users are required for the RLS verification.';
  end if;
  if room is null then
    raise exception 'At least one seeded room is required for the RLS verification.';
  end if;

  select candidate::date into free_date
  from generate_series(current_date + 3650, current_date + 4000, interval '1 day') as candidate
  where not exists (
    select 1
    from public.bookings as booking
    where booking.room_id = room
      and booking.booking_date = candidate::date
      and booking.slot = '09:00-10:00'
  )
  limit 1;

  perform set_config('test.user_a', user_a::text, true);
  perform set_config('test.user_b', user_b::text, true);
  perform set_config('test.room_id', room::text, true);
  perform set_config('test.booking_date', free_date::text, true);
end
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.user_a'), 'role', 'authenticated')::text,
  true
);

with created as (
  insert into public.bookings (room_id, booking_date, slot, purpose)
  values (
    current_setting('test.room_id')::uuid,
    current_setting('test.booking_date')::date,
    '09:00-10:00',
    'Database RLS verification'
  )
  returning id
)
select set_config('test.booking_id', (select id::text from created), true);

do $$
begin
  if not exists (
    select 1 from public.bookings
    where id = current_setting('test.booking_id')::uuid
      and user_id = current_setting('test.user_a')::uuid
  ) then
    raise exception 'User A could not create and read an owned booking.';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.user_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  affected integer;
begin
  if exists (
    select 1 from public.bookings
    where id = current_setting('test.booking_id')::uuid
  ) then
    raise exception 'RLS leak: User B can read User A booking.';
  end if;

  update public.bookings
  set purpose = 'Unauthorized update'
  where id = current_setting('test.booking_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'RLS failure: User B updated User A booking.';
  end if;

  delete from public.bookings
  where id = current_setting('test.booking_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'RLS failure: User B deleted User A booking.';
  end if;

  if not exists (
    select 1 from public.get_booking_availability()
    where booking_id = current_setting('test.booking_id')::uuid
  ) then
    raise exception 'User B cannot see the occupied slot through the safe RPC.';
  end if;

  begin
    insert into public.bookings (room_id, user_id, booking_date, slot, purpose)
    values (
      current_setting('test.room_id')::uuid,
      current_setting('test.user_a')::uuid,
      current_setting('test.booking_date')::date + 1,
      '10:00-11:00',
      'Forged owner verification'
    );
    raise exception 'RLS failure: User B forged User A ownership.';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.user_a'), 'role', 'authenticated')::text,
  true
);

do $$
begin
  begin
    insert into public.bookings (room_id, booking_date, slot, purpose)
    values (
      current_setting('test.room_id')::uuid,
      current_setting('test.booking_date')::date,
      '09:00-10:00',
      'Duplicate constraint verification'
    );
    raise exception 'Constraint failure: duplicate booking was accepted.';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.bookings (room_id, booking_date, slot, purpose)
    values (
      current_setting('test.room_id')::uuid,
      current_setting('test.booking_date')::date + 1,
      '10:00-11:00',
      'x'
    );
    raise exception 'Constraint failure: invalid purpose was accepted.';
  exception
    when check_violation then null;
  end;
end
$$;

select 'RLS, privacy-safe availability, duplicate, and validation checks passed.' as result;
rollback;
