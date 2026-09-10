import { createClient } from "@supabase/supabase-js";

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "TEST_USER_A_EMAIL",
  "TEST_USER_A_PASSWORD",
  "TEST_USER_B_EMAIL",
  "TEST_USER_B_PASSWORD",
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name}. Copy .env.test.example to .env.test.local and fill every value.`);
  }
}

if (process.env.TEST_USER_A_EMAIL === process.env.TEST_USER_B_EMAIL) {
  throw new Error("Test users A and B must be different accounts.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function client() {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function signIn(email, password) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Unable to sign in test account: ${error?.message ?? "no user"}`);
  return { supabase, user: data.user };
}

function futureCandidates(roomId, occupied) {
  const result = [];
  const slots = ["09:00-10:00", "10:00-11:00", "13:00-14:00", "14:00-15:00"];

  for (let dayOffset = 1; dayOffset <= 120 && result.length < 2; dayOffset += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const bookingDate = date.toISOString().slice(0, 10);

    for (const slot of slots) {
      const signature = `${roomId}|${bookingDate}|${slot}`;
      if (!occupied.has(signature)) result.push({ room_id: roomId, booking_date: bookingDate, slot });
      if (result.length === 2) break;
    }
  }

  return result;
}

let accountA;
let accountB;
let createdBookingId;

try {
  accountA = await signIn(process.env.TEST_USER_A_EMAIL, process.env.TEST_USER_A_PASSWORD);
  accountB = await signIn(process.env.TEST_USER_B_EMAIL, process.env.TEST_USER_B_PASSWORD);
  console.log("✓ Two distinct users signed in with the publishable key");

  const { data: rooms, error: roomsError } = await accountA.supabase
    .from("rooms")
    .select("id,name")
    .order("name")
    .limit(1);
  assert(!roomsError, `Rooms query failed: ${roomsError?.message}`);
  assert(rooms?.length === 1, "No room seed data was found.");
  console.log("✓ Authenticated users can read rooms from PostgreSQL");

  const { data: existingAvailability, error: availabilityError } = await accountB.supabase
    .rpc("get_booking_availability");
  assert(!availabilityError, `Availability RPC failed: ${availabilityError?.message}`);

  const occupied = new Set(
    (existingAvailability ?? []).map(
      (item) => `${item.room_id}|${item.booking_date}|${item.slot}`,
    ),
  );
  const [candidate, secondaryCandidate] = futureCandidates(rooms[0].id, occupied);
  assert(candidate && secondaryCandidate, "Could not find two free test slots in the next 120 days.");

  const originalPurpose = `RLS verification ${new Date().toISOString()}`;
  const { data: created, error: createError } = await accountA.supabase
    .from("bookings")
    .insert({ ...candidate, purpose: originalPurpose })
    .select("id")
    .single();
  assert(!createError && created?.id, `User A could not create a booking: ${createError?.message}`);
  createdBookingId = created.id;
  console.log("✓ User A can create and read an owned booking");

  const { data: visibleToB, error: selectAsBError } = await accountB.supabase
    .from("bookings")
    .select("id,user_id,purpose")
    .eq("id", createdBookingId);
  assert(!selectAsBError, `User B select returned an unexpected database error: ${selectAsBError?.message}`);
  assert(visibleToB?.length === 0, "RLS leak: User B can read User A's private booking row.");

  const { data: updatedAsB, error: updateAsBError } = await accountB.supabase
    .from("bookings")
    .update({ purpose: "Unauthorized change" })
    .eq("id", createdBookingId)
    .select("id");
  assert(!updateAsBError, `User B update returned an unexpected database error: ${updateAsBError?.message}`);
  assert(updatedAsB?.length === 0, "RLS failure: User B updated User A's booking.");

  const { data: deletedAsB, error: deleteAsBError } = await accountB.supabase
    .from("bookings")
    .delete()
    .eq("id", createdBookingId)
    .select("id");
  assert(!deleteAsBError, `User B delete returned an unexpected database error: ${deleteAsBError?.message}`);
  assert(deletedAsB?.length === 0, "RLS failure: User B deleted User A's booking.");

  const { data: availabilityAsB, error: availabilityAsBError } = await accountB.supabase
    .rpc("get_booking_availability");
  assert(!availabilityAsBError, `User B availability query failed: ${availabilityAsBError?.message}`);
  assert(
    availabilityAsB?.some((item) => item.booking_id === createdBookingId),
    "User B cannot see the occupied slot through the privacy-safe availability RPC.",
  );
  console.log("✓ User B sees the busy slot but not its owner or purpose");

  const { error: duplicateError } = await accountA.supabase
    .from("bookings")
    .insert({ ...candidate, purpose: "Duplicate constraint verification" });
  assert(duplicateError?.code === "23505", `Expected duplicate error 23505, received ${duplicateError?.code ?? "none"}.`);
  console.log("✓ PostgreSQL unique constraint rejects a duplicate room/date/slot");

  const { error: validationError } = await accountA.supabase
    .from("bookings")
    .insert({ ...secondaryCandidate, purpose: "x" });
  assert(validationError?.code === "23514", `Expected CHECK error 23514, received ${validationError?.code ?? "none"}.`);
  console.log("✓ PostgreSQL CHECK constraint rejects an invalid purpose");

  const { error: forgedOwnerError } = await accountB.supabase.from("bookings").insert({
    ...secondaryCandidate,
    purpose: "Forged owner verification",
    user_id: accountA.user.id,
  });
  assert(forgedOwnerError?.code === "42501", `Expected RLS error 42501, received ${forgedOwnerError?.code ?? "none"}.`);

  const { data: unchanged, error: unchangedError } = await accountA.supabase
    .from("bookings")
    .select("purpose")
    .eq("id", createdBookingId)
    .single();
  assert(!unchangedError && unchanged?.purpose === originalPurpose, "User A's booking changed during the RLS checks.");
  console.log("✓ RLS rejects a forged owner and preserves User A's booking");

  console.log("\nSecurity verification passed.");
} finally {
  if (createdBookingId && accountA) {
    await accountA.supabase.from("bookings").delete().eq("id", createdBookingId);
  }
  await Promise.allSettled([
    accountA?.supabase.auth.signOut(),
    accountB?.supabase.auth.signOut(),
  ]);
}
