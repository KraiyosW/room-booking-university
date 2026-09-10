# Project working agreements

## Outcome

- สร้างระบบจองห้องตาม `CAPSTONE.md`
- ถือว่างานเสร็จเมื่อผ่าน acceptance tests บน Vercel production URL

## Technical constraints

- ใช้ Next.js 16 App Router, TypeScript, Tailwind CSS 4, Supabase SSR และ npm
- ใช้ Server Components สำหรับ reads และ Server Actions สำหรับ mutations
- รักษาเวอร์ชัน dependency แบบ exact และเก็บ `package-lock.json`
- ห้ามเพิ่ม dependency จนกว่าจะอธิบายเหตุผลและได้รับการยืนยัน

## Security

- ห้ามใส่ service-role key, secret key หรือรหัสผ่านทดสอบใน browser และ repository
- ทุก Server Action ต้องตรวจ identity จาก Supabase Auth; ห้ามรับ `user_id` จาก form
- Database ต้องเปิด RLS, จำกัด grants และใช้ constraint บังคับ business rules
- UI เป็นเพียง affordance; authorization ต้องบังคับซ้ำที่ Server Action และ RLS
- ผู้ใช้อื่นเห็นเฉพาะห้อง วันที่ และรอบที่ไม่ว่าง ไม่เห็นเจ้าของหรือวัตถุประสงค์

## Verification

- ตรวจ `git diff` หลังการเปลี่ยนแปลงทุกชุด
- รัน `npm run typecheck`, `npm run lint` และ `npm run build`
- รัน `npm run verify:security` เมื่อมี Supabase project และบัญชีทดสอบสองบัญชี
- รายงานไฟล์ที่แก้ ผลการทดสอบ และ known limitations ตามจริง
