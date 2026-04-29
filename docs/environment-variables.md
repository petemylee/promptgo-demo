# ตัวแปรสภาพแวดล้อม (Environment variables)

ไฟล์อ้างอิง: [`.env.example`](../.env.example)  
คัดลอกเป็น `.env` ที่รากโปรเจกต์ แล้วกรอกค่าจริง **ห้าม commit `.env`** (มีเฉพาะ `.env.example` ใน repo)

---

## สรุปตามกลุ่ม

| กลุ่ม | จำเป็นหรือไม่ | หมายเหตุสั้น ๆ |
|--------|----------------|----------------|
| Database | จำเป็น | PostgreSQL สำหรับ Prisma |
| NextAuth | จำเป็น | Session / ล็อกอิน |
| URL สาธารณะ | แนะนำ | ลิงก์รีเซ็ตรหัส, ปุ่มเชื่อม LINE |
| LINE Messaging | ตามฟีเจอร์ | Push แจ้งเตือน, webhook |
| LINE Login | ตามฟีเจอร์ | ล็อกอินด้วย LINE ผ่าน NextAuth |
| LINE Push API | ตามฟีเจอร์ | ป้องกัน endpoint `/api/line/push` |
| Supabase | ตามฟีเจอร์ | อัปโหลดรูป / ลายเซ็น ฯลฯ |
| SMTP | ตามฟีเจอร์ | ส่งอีเมล (เช่น ลืมรหัสผ่าน) |
| Prisma pool | ทางเลือก | ปรับ connection pool บน serverless |

---

## Database

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `DATABASE_URL` | Connection string PostgreSQL ตาม [Prisma schema](../prisma/schema.prisma) (`provider = postgresql`) |

---

## NextAuth

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `NEXTAUTH_SECRET` | คีย์ลับเข้ารหัส session — สร้างค่าสุ่มยาว ๆ (เช่น `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL ฐานของแอปที่ผู้ใช้เข้าถึง (ใช้ใน production และลิงก์ที่สร้างจากเซิร์ฟเวอร์) |

---

## URL ของแอป (ฝั่ง client / ลิงก์)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `NEXT_PUBLIC_APP_URL` | ใช้เป็นทางเลือกเมื่อสร้างลิงก์ (เช่น รีเซ็ตรหัสผ่าน) คู่กับ `NEXTAUTH_URL` |
| `NEXT_PUBLIC_BASE_URL` | ฐาน URL สำหรับปุ่มเชื่อมบัญชี LINE (`ConnectLineButton`) — ถ้าไม่ตั้งจะใช้ `window.location.origin` บนเบราว์เซอร์ |

---

## LINE — Messaging API (แจ้งเตือน / Webhook)

ใช้ใน [`src/lib/line.ts`](../src/lib/line.ts) และ webhook

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Channel access token (Long-lived) สำหรับส่ง Push |
| `LINE_CHANNEL_SECRET` | Channel secret — ใช้ยืนยัน webhook และเป็นทางเลือกเมื่อไม่มี `LINE_LOGIN_CHANNEL_SECRET` |

---

## LINE — Login (NextAuth provider)

ใช้ใน [`src/app/api/auth/[...nextauth]/route.ts`](../src/app/api/auth/[...nextauth]/route.ts)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `NEXT_PUBLIC_LINE_CHANNEL_ID` | Channel ID ของ LINE Login (ต้องเป็น `NEXT_PUBLIC_*` เพราะอ้างอิงจาก client) |
| `LINE_LOGIN_CHANNEL_SECRET` | Channel secret ของ **LINE Login** (อาจต่างจาก Messaging API) |

ใน [`src/app/api/line/callback/route.ts`](../src/app/api/line/callback/route.ts) ถ้าไม่ตั้ง `LINE_LOGIN_CHANNEL_SECRET` จะใช้ `LINE_CHANNEL_SECRET` แทน

---

## LINE — Push API (ป้องกัน endpoint)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `LINE_PUSH_API_SECRET` | Secret ที่ [`/api/line/push`](../src/app/api/line/push/route.ts) ตรวจสอบก่อนทำงาน |

---

## Supabase

ใช้ใน [`src/lib/supabase.ts`](../src/lib/supabase.ts)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL โปรเจกต์ Supabase (เปิดเผยใน client ได้) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key สำหรับ client |
| `SUPABASE_URL` | ทางเลือก: ถ้าไม่ตั้ง public URL บางเส้นทางอ่านค่านี้แทน |
| `SUPABASE_ANON_KEY` | ทางเลือกคู่กับ `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น — **ห้ามเปิดเผยใน client** |

---

## SMTP (อีเมล)

ใช้ใน [`src/lib/email.ts`](../src/lib/email.ts) — ถ้าไม่มี `SMTP_HOST` การส่งอีเมลจะไม่ทำงาน

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `SMTP_HOST` | เซิร์ฟเวอร์ SMTP |
| `SMTP_PORT` | พอร์ต (ค่าเริ่มต้นในโค้ด: 587) |
| `SMTP_SECURE` | ตั้ง `"true"` ถ้าใช้ TLS แบบบังคับ |
| `SMTP_USER` / `SMTP_PASSWORD` | ยูสเซอร์รหัสผ่าน SMTP |
| `SMTP_FROM` | อีเมลผู้ส่ง (ถ้าไม่ตั้งจะ fallback เป็น `SMTP_USER`) |

---

## Prisma (ปรับพฤติกรรม connection)

ใช้ใน [`src/lib/prisma.ts`](../src/lib/prisma.ts)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `PRISMA_CONNECTION_LIMIT` | จำนวน connection ต่อ instance (ค่าเริ่มต้น `1`) |
| `PRISMA_POOL_TIMEOUT` | Timeout วินาที (ค่าเริ่มต้น `30`) |

---

## หมายเหตุการ deploy

- บน **Vercel / hosting** ตั้งค่าตัวแปรในแดชบอร์ดของผู้ให้บริการ ให้ตรงกับ `.env` ในเครื่องพัฒนา
- `NEXTAUTH_URL` และ `NEXT_PUBLIC_*` ใน production ต้องเป็น **https** และโดเมนจริง
- หลัง clone โปรเจกต์: `cp .env.example .env` แล้วรัน `npx prisma generate` และ migrate ตามขั้นตอนใน README / ทีม
