"use client";

export default function BookingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-shell flex min-h-dvh items-center py-16">
      <section className="panel mx-auto max-w-xl text-center">
        <p className="eyebrow">Connection error</p>
        <h1 className="mt-3 text-3xl font-bold">โหลดหน้าจองไม่สำเร็จ</h1>
        <p className="mt-4 text-muted-foreground">ตรวจการเชื่อมต่อแล้วลองใหม่อีกครั้ง หากยังไม่สำเร็จให้แจ้งผู้ดูแลระบบ</p>
        <button className="button mt-7" onClick={reset}>ลองอีกครั้ง</button>
      </section>
    </main>
  );
}
