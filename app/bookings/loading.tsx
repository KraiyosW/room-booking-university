export default function Loading() {
  return (
    <main className="page-shell py-12" aria-busy="true" aria-live="polite">
      <div className="h-24 animate-pulse rounded-3xl bg-muted" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-36 animate-pulse rounded-2xl bg-muted" key={index} />
        ))}
      </div>
      <p className="sr-only">กำลังโหลดข้อมูลห้องและการจอง</p>
    </main>
  );
}
