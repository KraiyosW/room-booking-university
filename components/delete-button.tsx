"use client";

import { useFormStatus } from "react-dom";

export function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="button button-danger"
      disabled={pending}
      type="submit"
      onClick={(event) => {
        if (!window.confirm("ยืนยันการยกเลิกการจองนี้หรือไม่?")) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "กำลังยกเลิก…" : "ยกเลิกการจอง"}
    </button>
  );
}
