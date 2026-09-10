import { SubmitButton } from "@/components/submit-button";
import { login, signup } from "./actions";

const errorMessages: Record<string, string> = {
  auth_required: "กรุณาเข้าสู่ระบบก่อนเปิดหน้าจองห้อง",
  invalid_input: "กรุณาตรวจอีเมลและใช้รหัสผ่านอย่างน้อย 6 ตัวอักษร",
  invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  signup_failed: "สร้างบัญชีไม่สำเร็จ อีเมลนี้อาจถูกใช้งานแล้ว",
};

const statusMessages: Record<string, string> = {
  check_email: "สร้างบัญชีแล้ว กรุณาตรวจอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ",
  logged_out: "ออกจากระบบแล้ว",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const statusMessage = params.status ? statusMessages[params.status] : undefined;

  return (
    <main className="page-shell flex min-h-dvh items-center py-10 sm:py-16">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-primary/5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-primary px-7 py-10 text-primary-foreground sm:px-12 sm:py-14">
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute -bottom-28 -left-20 size-72 rounded-full border-[44px] border-white/10" aria-hidden="true" />
          <div className="relative max-w-xl">
            <p className="eyebrow text-primary-foreground/75">University Study Space</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              จองพื้นที่อ่านหนังสือ โดยเห็นเวลาว่างจริง
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-primary-foreground/80 sm:text-lg">
              เลือกห้อง วันที่ และรอบเวลา ระบบจะเก็บข้อมูลในฐานข้อมูลและป้องกันการจองซ้ำให้โดยอัตโนมัติ
            </p>
            <ul className="mt-9 grid gap-3 text-sm text-primary-foreground/85 sm:grid-cols-2">
              <li className="feature-chip">ข้อมูลห้องจาก Supabase</li>
              <li className="feature-chip">สิทธิ์ข้อมูลด้วย RLS</li>
              <li className="feature-chip">Session ปลอดภัยฝั่ง server</li>
              <li className="feature-chip">รองรับมือถือและคอมพิวเตอร์</li>
            </ul>
          </div>
        </section>

        <section className="px-7 py-10 sm:px-12 sm:py-14">
          <p className="eyebrow">Study Space</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">เข้าสู่ระบบ</h2>
          <p className="mt-3 text-muted-foreground">ใช้ email และ password ของมหาวิทยาลัยหรือสร้างบัญชีทดสอบ</p>

          {errorMessage && <p className="alert alert-error mt-6" role="alert">{errorMessage}</p>}
          {statusMessage && <p className="alert alert-success mt-6" aria-live="polite">{statusMessage}</p>}

          <form action={login} className="mt-7 space-y-5">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input className="field mt-2" id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input className="field mt-2" id="password" name="password" type="password" autoComplete="current-password" minLength={6} required />
              <p className="mt-2 text-sm text-muted-foreground">อย่างน้อย 6 ตัวอักษร</p>
            </div>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <SubmitButton pendingLabel="กำลังเข้าสู่ระบบ…">เข้าสู่ระบบ</SubmitButton>
              <SubmitButton className="button button-secondary" formAction={signup} pendingLabel="กำลังสร้างบัญชี…">
                สร้างบัญชี
              </SubmitButton>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
