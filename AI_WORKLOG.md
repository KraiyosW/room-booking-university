# AI Worklog

## 1. Planning

- Prompt: ตรวจ course kit และจัดแผนสร้างระบบจองห้องภายใน 90 นาที โดยแยก Core/Stretch และยึด security/acceptance tests
- สิ่งที่ Codex เสนอ: ใช้ `starter/` สร้างโปรเจกต์แยกบน external SSD, Server Components + Server Actions, PostgreSQL constraints, owner-only RLS และ privacy-safe availability RPC
- สิ่งที่แก้จากแผนและเหตุผล: ทำ signup, logout, update และ deleteพร้อม Core เพื่อให้ acceptance tests ฉบับสมบูรณ์ตรวจได้ในโปรเจกต์เดียว

## 2. Implementation

- Prompt: Implement แผนที่อนุมัติแล้ว และใช้ค่า Supabase จาก `.env.local`
- ไฟล์ที่เปลี่ยน: Auth/proxy, booking pages/actions, Supabase schema, shared types/components, styles, verification script และเอกสาร
- Diff ที่ตรวจพบ: แอปเดิมมีเพียง starter page; เพิ่ม data flow จริงจาก browser ไป Next.js server, Supabase Data API และ PostgreSQL

## 3. Debugging

- Expected result: เครื่องมือจัดการ Supabase เชื่อม project จาก URL และใช้ migration ได้
- Actual result และ error message: การอ่าน project ผ่าน connector ถูกปฏิเสธด้วยข้อความว่าไม่มี permission
- สมมติฐานเรื่องสาเหตุ: Supabase connector ยังไม่ได้รับสิทธิ์กับ project นี้ แม้ publishable URL/key สำหรับ runtime จะถูกต้อง
- Prompt ที่ใช้: ตรวจ project ID จาก URL โดยไม่แสดง key และขออ่าน project metadata แบบ read-only
- การแก้ไขและผลทดสอบซ้ำ: ใช้ Supabase CLI ที่ login อยู่แล้ว link project และ push migration สำเร็จ; database lint ผ่าน, มี seed 4 ห้อง และ policy/constraint ตรงตามแผน

- Expected result: สร้างบัญชีชั่วคราวสองบัญชีเพื่อรัน security script
- Actual result และ error message: Supabase Auth ปฏิเสธด้วย `email rate limit exceeded`
- สมมติฐานเรื่องสาเหตุ: โปรเจกต์ใหม่ชนอัตราการส่ง email ยืนยันในช่วงเวลาเดียวกัน
- การแก้ไขและผลทดสอบซ้ำ: ล้างบัญชีชั่วคราวที่อาจสร้างค้าง; ไม่ลด auth security และเตรียม `.env.test.example` สำหรับบัญชีทดสอบจริง

## 4. Final review

- Prompt: ตรวจ TypeScript, lint, production build, RLS/constraint, secret และ browser flow
- `npm run lint`: ผ่าน
- `npm run build`: ผ่านด้วย Next.js 16.3.4; `/`, `/login`, `/bookings` ถูก build ครบ
- Acceptance tests: protected redirect ผ่าน; migration, seed, anonymous denial, RLS ด้วย Auth user ID สองบัญชี, privacy-safe RPC, duplicate/check constraints และ mobile/tablet overflow ผ่านการตรวจ; Auth/Data API script ยังรอ credentials
- Known limitations: Security Advisor ยังเตือน leaked-password protection ซึ่งต้องเปิดใน Supabase Auth settings; ยังไม่ได้ deploy เพราะ Vercel CLI บนเครื่องยังไม่ login
