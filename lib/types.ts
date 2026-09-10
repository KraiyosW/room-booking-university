export const BOOKING_SLOTS = [
  "09:00-10:00",
  "10:00-11:00",
  "13:00-14:00",
  "14:00-15:00",
] as const;

export type Slot = (typeof BOOKING_SLOTS)[number];

export type Room = {
  id: string;
  name: string;
  location: string;
  capacity: number;
};

export type BookingAvailability = {
  booking_id: string;
  room_id: string;
  booking_date: string;
  slot: Slot;
};

export type OwnBooking = {
  id: string;
  room_id: string;
  booking_date: string;
  slot: Slot;
  purpose: string;
  rooms: { name: string; location: string } | null;
};

export type ActionErrorCode =
  | "invalid_input"
  | "duplicate"
  | "forbidden"
  | "not_found"
  | "database";
