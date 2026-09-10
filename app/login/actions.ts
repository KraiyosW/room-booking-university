"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function credentials(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_PATTERN.test(email) || password.length < 6) {
    redirect("/login?error=invalid_input");
  }

  return { email, password };
}

export async function login(formData: FormData) {
  const input = credentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);

  if (error) {
    console.error("Supabase login failed", { code: error.code, message: error.message });
    redirect("/login?error=invalid_credentials");
  }

  redirect("/bookings?status=logged_in");
}

export async function signup(formData: FormData) {
  const input = credentials(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(input);

  if (error) {
    console.error("Supabase signup failed", { code: error.code, message: error.message });
    redirect("/login?error=signup_failed");
  }

  if (data.session) {
    redirect("/bookings?status=account_created");
  }

  redirect("/login?status=check_email");
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase logout failed", { code: error.code, message: error.message });
  }

  redirect("/login?status=logged_out");
}
