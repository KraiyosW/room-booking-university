"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BOOKING_SLOTS, type ActionErrorCode, type Slot } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slots = new Set<string>(BOOKING_SLOTS);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function bookingUrl(kind: "status" | "error", value: string) {
  return `/bookings?${kind}=${encodeURIComponent(value)}`;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function bookingInput(formData: FormData) {
  const roomId = text(formData, "room_id");
  const bookingDate = text(formData, "booking_date");
  const slot = text(formData, "slot");
  const purpose = text(formData, "purpose");

  if (
    !UUID_PATTERN.test(roomId) ||
    !isValidDate(bookingDate) ||
    !slots.has(slot) ||
    purpose.length < 3 ||
    purpose.length > 200
  ) {
    redirect(bookingUrl("error", "invalid_input" satisfies ActionErrorCode));
  }

  return { room_id: roomId, booking_date: bookingDate, slot: slot as Slot, purpose };
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/login?error=auth_required");
  }

  return { supabase, userId };
}

function databaseError(error: { code?: string; message: string }): ActionErrorCode {
  console.error("Supabase booking mutation failed", { code: error.code, message: error.message });
  if (error.code === "23505") return "duplicate";
  if (error.code === "23503" || error.code === "23514" || error.code === "22P02") return "invalid_input";
  if (error.code === "42501") return "forbidden";
  return "database";
}

export async function createBooking(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const input = bookingInput(formData);
  const { error } = await supabase.from("bookings").insert({ ...input, user_id: userId });

  if (error) redirect(bookingUrl("error", databaseError(error)));

  revalidatePath("/bookings");
  redirect(bookingUrl("status", "created"));
}

export async function updateBooking(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const bookingId = text(formData, "booking_id");
  const input = bookingInput(formData);

  if (!UUID_PATTERN.test(bookingId)) {
    redirect(bookingUrl("error", "invalid_input"));
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(input)
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("id");

  if (error) redirect(bookingUrl("error", databaseError(error)));
  if (!data?.length) redirect(bookingUrl("error", "not_found"));

  revalidatePath("/bookings");
  redirect(bookingUrl("status", "updated"));
}

export async function deleteBooking(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const bookingId = text(formData, "booking_id");

  if (!UUID_PATTERN.test(bookingId)) {
    redirect(bookingUrl("error", "invalid_input"));
  }

  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("id");

  if (error) redirect(bookingUrl("error", databaseError(error)));
  if (!data?.length) redirect(bookingUrl("error", "not_found"));

  revalidatePath("/bookings");
  redirect(bookingUrl("status", "deleted"));
}
