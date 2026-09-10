import { redirect } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { SubmitButton } from "@/components/submit-button";
import { logout } from "@/app/login/actions";
import { createBooking, deleteBooking, updateBooking } from "./actions";
import { createClient } from "@/lib/supabase/server";
import {
  BOOKING_SLOTS,
  type BookingAvailability,
  type OwnBooking,
  type Room,
} from "@/lib/types";

const statusMessages: Record<string, string> = {
  logged_in: "เข้าสู่ระบบแล้ว",
  account_created: "สร้างบัญชีและเข้าสู่ระบบแล้ว",
  created: "สร้างการจองเรียบร้อย",
  updated: "บันทึกการแก้ไขแล้ว",
  deleted: "ยกเลิกการจองแล้ว",
};

const errorMessages: Record<string, string> = {
  invalid_input: "กรุณาตรวจห้อง วันที่ รอบเวลา และวัตถุประสงค์ 3–200 ตัวอักษร",
  duplicate: "ห้องและรอบเวลานี้ถูกจองแล้ว กรุณาเลือกรอบอื่น",
  forbidden: "บัญชีนี้ไม่มีสิทธิ์เปลี่ยนรายการดังกล่าว",
  not_found: "ไม่พบรายการหรือคุณไม่มีสิทธิ์เปลี่ยนรายการนี้",
  database: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (claimsError || !userId) redirect("/login?error=auth_required");

  const [roomsResult, availabilityResult, ownBookingsResult] = await Promise.all([
    supabase.from("rooms").select("id,name,location,capacity").order("name"),
    supabase.rpc("get_booking_availability"),
    supabase
      .from("bookings")
      .select("id,room_id,booking_date,slot,purpose,rooms(name,location)")
      .eq("user_id", userId)
      .order("booking_date")
      .order("slot"),
  ]);

  const queryFailed = roomsResult.error || availabilityResult.error || ownBookingsResult.error;
  if (queryFailed) {
    console.error("Supabase bookings page query failed", {
      rooms: roomsResult.error?.message,
      availability: availabilityResult.error?.message,
      ownBookings: ownBookingsResult.error?.message,
    });
  }

  const rooms = (roomsResult.data ?? []) as Room[];
  const availability = (availabilityResult.data ?? []) as BookingAvailability[];
  const ownBookings = (ownBookingsResult.data ?? []) as unknown as OwnBooking[];
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const statusMessage = params.status ? statusMessages[params.status] : undefined;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <main className="page-shell py-8 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-7">
        <div>
          <p className="eyebrow">University Study Space</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">ห้องอ่านหนังสือ</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">ดูรอบที่ไม่ว่าง สร้างการจอง และจัดการเฉพาะรายการของคุณ</p>
        </div>
        <form action={logout}>
          <SubmitButton className="button button-secondary" pendingLabel="กำลังออกจากระบบ…">ออกจากระบบ</SubmitButton>
        </form>
      </header>

      {statusMessage && <p className="alert alert-success mt-6" aria-live="polite">{statusMessage}</p>}
      {errorMessage && <p className="alert alert-error mt-6" role="alert">{errorMessage}</p>}
      {queryFailed && (
        <p className="alert alert-error mt-6" role="alert">
          โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาลอง refresh อีกครั้ง
        </p>
      )}

      <section className="mt-9" aria-labelledby="rooms-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Rooms</p>
            <h2 className="mt-2 text-2xl font-bold" id="rooms-heading">ห้องที่เปิดให้จอง</h2>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{rooms.length} ห้อง</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rooms.map((room) => (
            <article className="room-card" key={room.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold">{room.name}</h3>
                <span className="capacity-badge">{room.capacity} คน</span>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">{room.location}</p>
            </article>
          ))}
          {!rooms.length && (
            <p className="empty-state sm:col-span-2 lg:col-span-4">ยังไม่มีข้อมูลห้อง กรุณารัน seed ใน Supabase ก่อน</p>
          )}
        </div>
      </section>

      <div className="mt-12 grid gap-8 xl:grid-cols-[380px_1fr]">
        <section className="panel h-fit xl:sticky xl:top-6" aria-labelledby="create-heading">
          <p className="eyebrow">New booking</p>
          <h2 className="mt-2 text-2xl font-bold" id="create-heading">สร้างการจอง</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">ทุกช่องจำเป็น และวัตถุประสงค์ต้องยาว 3–200 ตัวอักษร</p>

          <form action={createBooking} className="mt-6 space-y-5">
            <div>
              <label className="label" htmlFor="create-room">ห้อง</label>
              <select className="field mt-2" id="create-room" name="room_id" required defaultValue="">
                <option value="" disabled>เลือกห้อง</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.capacity} คน</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="create-date">วันที่</label>
              <input className="field mt-2" id="create-date" name="booking_date" type="date" required />
            </div>
            <div>
              <label className="label" htmlFor="create-slot">รอบเวลา</label>
              <select className="field mt-2" id="create-slot" name="slot" required defaultValue="">
                <option value="" disabled>เลือกรอบเวลา</option>
                {BOOKING_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="create-purpose">วัตถุประสงค์</label>
              <textarea className="field mt-2 min-h-28 resize-y" id="create-purpose" name="purpose" minLength={3} maxLength={200} required />
            </div>
            <SubmitButton className="button w-full" pendingLabel="กำลังจอง…" disabled={!rooms.length}>จองห้อง</SubmitButton>
          </form>
        </section>

        <div className="space-y-10">
          <section aria-labelledby="availability-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Availability</p>
                <h2 className="mt-2 text-2xl font-bold" id="availability-heading">รอบที่ไม่ว่าง</h2>
              </div>
              <span className="status-badge status-busy">{availability.length} รายการ</span>
            </div>
            <div className="mt-5 space-y-3">
              {availability.map((booking) => {
                const room = roomById.get(booking.room_id);
                return (
                  <article className="booking-row" key={booking.booking_id}>
                    <div>
                      <h3 className="font-bold">{room?.name ?? "ห้องที่ไม่พบ"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{room?.location ?? "ไม่พบสถานที่"}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-semibold tabular-nums">{formatDate(booking.booking_date)}</p>
                      <p className="mt-1 text-sm font-medium text-primary">{booking.slot}</p>
                    </div>
                    <span className="status-badge status-busy">ไม่ว่าง</span>
                  </article>
                );
              })}
              {!availability.length && <p className="empty-state">ยังไม่มีรอบที่ถูกจอง คุณสามารถเลือกรอบได้จากแบบฟอร์ม</p>}
            </div>
          </section>

          <section aria-labelledby="own-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Your bookings</p>
                <h2 className="mt-2 text-2xl font-bold" id="own-heading">การจองของคุณ</h2>
              </div>
              <span className="status-badge status-own">{ownBookings.length} รายการ</span>
            </div>
            <div className="mt-5 space-y-4">
              {ownBookings.map((booking) => (
                <article className="panel" key={booking.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{booking.rooms?.name ?? "ห้องที่ไม่พบ"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{formatDate(booking.booking_date)} · {booking.slot}</p>
                    </div>
                    <span className="status-badge status-own">รายการของคุณ</span>
                  </div>
                  <p className="mt-4 leading-7">{booking.purpose}</p>

                  <details className="mt-5 border-t border-border pt-5">
                    <summary className="min-h-11 cursor-pointer font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      แก้ไขหรือยกเลิก
                    </summary>
                    <form action={updateBooking} className="mt-5 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <div>
                        <label className="label" htmlFor={`room-${booking.id}`}>ห้อง</label>
                        <select className="field mt-2" id={`room-${booking.id}`} name="room_id" defaultValue={booking.room_id} required>
                          {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor={`date-${booking.id}`}>วันที่</label>
                        <input className="field mt-2" id={`date-${booking.id}`} name="booking_date" type="date" defaultValue={booking.booking_date} required />
                      </div>
                      <div>
                        <label className="label" htmlFor={`slot-${booking.id}`}>รอบเวลา</label>
                        <select className="field mt-2" id={`slot-${booking.id}`} name="slot" defaultValue={booking.slot} required>
                          {BOOKING_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor={`purpose-${booking.id}`}>วัตถุประสงค์</label>
                        <input className="field mt-2" id={`purpose-${booking.id}`} name="purpose" defaultValue={booking.purpose} minLength={3} maxLength={200} required />
                      </div>
                      <SubmitButton className="button sm:col-span-2" pendingLabel="กำลังบันทึก…">บันทึกการแก้ไข</SubmitButton>
                    </form>
                    <form action={deleteBooking} className="mt-4 border-t border-border pt-4">
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <DeleteButton />
                    </form>
                  </details>
                </article>
              ))}
              {!ownBookings.length && <p className="empty-state">คุณยังไม่มีการจอง เริ่มจากแบบฟอร์มด้านซ้าย</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
