# University Study Room Booking

ระบบจองห้องอ่านหนังสือสำหรับมหาวิทยาลัย สร้างด้วย Next.js App Router, TypeScript, Tailwind CSS และ Supabase ผู้ใช้สมัคร/เข้าสู่ระบบ ดูรอบที่ไม่ว่าง และจัดการเฉพาะการจองของตนเองได้

## Stack

- Next.js 16 App Router และ React 19
- TypeScript แบบ strict
- Tailwind CSS 4 แบบ CSS-first
- Supabase Auth, PostgreSQL และ Row Level Security
- Server Components สำหรับอ่านข้อมูล และ Server Actions สำหรับเปลี่ยนข้อมูล

## เริ่มต้นในเครื่อง

ต้องใช้ Node.js 24 และ npm จากนั้นติดตั้ง dependency จาก lockfile:

```bash
npm ci
cp .env.example .env.local
```

ใส่ค่าจาก Supabase Connect dialog ใน `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

ใช้เฉพาะ publishable key ในแอป ห้ามใส่ secret หรือ privileged database key ใน repository และ browser

## ตั้งค่า Supabase

นำ SQL จาก `supabase/schema.sql` ไปใช้กับ Supabase project หนึ่งครั้ง SQL นี้จะ:

- สร้าง `rooms` และ `bookings`
- seed ห้องขั้นต่ำ 4 ห้อง
- จำกัดรอบเวลาและความยาววัตถุประสงค์ด้วย `CHECK`
- ป้องกันห้อง/วันที่/รอบซ้ำด้วย `UNIQUE`
- เปิด RLS และให้ผู้ใช้เห็น/แก้/ลบเฉพาะ booking ของตน
- สร้าง RPC สำหรับเปิดเผยเพียงห้อง วันที่ และรอบที่ไม่ว่าง

เปิด Email/Password provider ใน Supabase Authentication ก่อนทดสอบ signup/login หากใช้ email confirmation ให้เพิ่ม redirect URL ของ localhost และ Vercel ใน Auth URL Configuration

## คำสั่ง

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

การพิสูจน์ RLS ด้วยผู้ใช้สองบัญชี:

```bash
# ตรวจ policy/constraint ใน transaction ที่ rollback ทุกครั้ง
supabase db query --linked --file supabase/verify-rls.sql

# ตรวจผ่าน Auth และ Data API ด้วย credentials ของบัญชี A/B
cp .env.test.example .env.test.local
npm run verify:security
```

ไฟล์ `.env.test.local` ถูก Git ignore และชุดตรวจใช้ publishable key เท่านั้น โดยสร้างข้อมูลชั่วคราวแล้วล้างออกเมื่อจบ

## Security model

- Proxy ช่วย redirect ผู้ที่ยังไม่เข้าสู่ระบบ และ Server Component ตรวจ identity ซ้ำ
- Server Action ทุกตัวอ่าน user ID จาก claim ที่ตรวจสอบแล้ว ไม่รับ user ID จาก form
- Database constraint เป็นผู้ตัดสินกรณีคำขอพร้อมกันและข้อมูลผิดรูปแบบ
- RLS เป็น authorization ชั้นสุดท้าย ไม่พึ่งการซ่อนปุ่มใน UI
- ผู้ใช้อื่นเห็นเพียง availability ผ่าน RPC และไม่เห็น owner/purpose

## Deploy บน Vercel

1. Push repository ไป GitHub และ import เข้า Vercel
2. เพิ่ม environment variables สองตัวใน Production และ Preview
3. Deploy แล้วตั้ง Supabase Site URL เป็น production URL
4. เพิ่ม localhost และ Vercel preview URL ใน Redirect URLs
5. ทดสอบ production ด้วย private window: protected redirect, login, create, refresh, duplicate และ logout

หลังเปลี่ยน environment variable บน Vercel ต้อง redeploy เพื่อให้ deployment ใหม่ได้รับค่า
