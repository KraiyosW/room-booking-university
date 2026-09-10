# Project working agreements

## Outcome

- สร้างระบบจองห้องตาม `CAPSTONE.md`
- ถือว่างานเสร็จเมื่อผ่าน acceptance tests บน production URL

## Technical constraints

- ใช้ Next.js App Router, TypeScript, Tailwind, Supabase และ npm
- ใช้ Server Components สำหรับ reads และ Server Actions สำหรับ mutations
- ห้ามเพิ่ม dependency จนกว่าจะอธิบายเหตุผลและได้รับการยืนยัน

## Security

- ห้ามใส่ service-role key หรือ secret ใน browser และ repository
- ทุก Server Action ต้องตรวจผู้ใช้จาก Supabase Auth
- Database ต้องเปิด RLS และมี policy ตามเจ้าของข้อมูล

## Verification

- ตรวจ `git diff` หลังการเปลี่ยนแปลงทุกชุด
- รัน `npm run lint` และ `npm run build` ก่อนถือว่างานเสร็จ
- รายงานไฟล์ที่แก้ ผลการทดสอบ และสิ่งที่ยังไม่ผ่าน
