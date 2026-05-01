# เอกสารการส่งมอบโปรเจกต์ OFM PROMPTGO

เอกสารนี้สำหรับ **ผู้รับงานต่อ** ตั้งแต่ติดตั้งศูนย์จนพร้อมใช้งาน รวมถึงการสร้างผู้ใช้ **Executive** คนแรก

ที่เกี่ยวข้อง:

- [`.env.example`](../.env.example) — ตัวแปรสภาพแวดล้อม
- [`docs/environment-variables.md`](environment-variables.md) — คำอธิบายตัวแปรแต่ละตัว

---

## 1. สิ่งที่ได้รับจากการส่งมอบ

| รายการ | รายละเอียด |
|--------|-------------|
| ซอร์สโค้ด | โฟลเดอร์โปรเจกต์เต็ม หรือสิทธิ์เข้า Git repository |
| โครงสร้างฐานข้อมูล | `prisma/schema.prisma` และ `prisma/migrations/` **ต้องครบ** |
| ตัวอย่าง config | `.env.example` (ไฟล์ `.env` จริงไม่ควรอยู่ใน repo) |
| ข้อมูลจริง (ถ้ามี) | แยกส่งตามข้อตกลง — เช่น `pg_dump` — **ไม่บังคับ** สำหรับติดตั้งใหม่ |

---

## 2. สแต็กเทคโนโลยี (สรุป)

- **แอป**: Next.js (App Router), React, TypeScript  
- **ฐานข้อมูล**: PostgreSQL + Prisma ORM  
- **Auth**: NextAuth (Credentials + ทางเลือก LINE Login)  
- **ไฟล์อัปโหลด**: Supabase Storage (bucket ชื่อ `uploads` ตามโค้ดปัจจุบัน)  
- **แจ้งเตือน**: LINE Messaging API (ถ้าเปิดใช้)

---

## 3. ขั้นตอนติดตั้งจากศูนย์ (Checklist)

### 3.1 เครื่องมือและโครงสร้าง

1. ติดตั้ง **Node.js** (แนะนำ LTS ใกล้เคียงเวอร์ชันที่ทีมพัฒนาใช้)
2. ติดตั้ง **PostgreSQL** และสร้าง **database ว่าง** + user ที่มีสิทธิ์เชื่อมต่อ
3. คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่า (อย่างน้อย `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)

### 3.2 Dependency และฐานข้อมูล

4. ที่รากโปรเจกต์รัน:

   ```bash
   npm install
   ```

5. ใช้ migration สร้างตารางบน DB ว่าง:

   ```bash
   npx prisma migrate deploy
   ```

6. (แนะนำ) สร้าง Prisma Client:

   ```bash
   npx prisma generate
   ```

### 3.3 บริการภายนอก

7. **Supabase**: สร้างโปรเจกต์, ตั้งค่าใน `.env`, สร้าง bucket **`uploads`** และนโยบายการเข้าถึงให้สอดคล้องกับการใช้ public URL ในแอป  
8. **LINE** (ถ้าใช้): ตั้งค่า Messaging API และ/หรือ LINE Login ตาม [`docs/environment-variables.md`](environment-variables.md)  
9. **SMTP** (ถ้าใช้ลืมรหัสผ่าน / อีเมลต้อนรับผู้ใช้)

### 3.4 รันแอปพลิเคชัน

10. พัฒนา:

    ```bash
    npm run dev
    ```

11. Production (บนเซิร์ฟเวอร์ของคุณ):

    ```bash
    npm run build
    npm run start
    ```

12. ตั้ง `NEXTAUTH_URL` และ URL สาธารณะอื่น ๆ ให้เป็น **https** และโดเมนจริง

### 3.5 ตรวจสอบหลังติดตั้ง (Smoke test)

13. ล็อกอินด้วยบัญชี Executive แรก (หลังสร้างตามข้อ 4)  
14. ทดสอบ: สร้างคำขอจอง (ถ้ามีบทบาท Requester), อนุมัติ, อัปโหลดรูป/ลายเซ็น, เปิด PDF ตามฟีเจอร์ที่ใช้จริง

---

## 4. บทบาท (Role) ในระบบ

ค่าใน Prisma enum `Role`:

| Role | บทบาทโดยสรุป |
|------|----------------|
| `Requester` | ผู้ขอใช้รถ |
| `Driver` | คนขับ |
| `Admin` | อนุมัติเบื้องต้น / จัดการระบบหลายส่วน |
| `Executive` | ยืนยันขั้นสุดท้าย / workflow ฝั่งผู้บริหาร (ตามฟีเจอร์ในแอป) |

**หมายเหตุ:** ใน schema ไม่ได้กำหนดว่า Executive “สูงกว่า” Admin ในแง่ลำดับชั้นเดียวกับ org chart — ทั้งคู่เป็นคนละบทบาทใน workflow ถ้าต้องการ “ผู้ดูแลสูงสุด” ในเชิงธุรกิจ มักใช้ **Executive** เป็นผู้ยืนยันขั้นสุดท้าย และให้สิทธิ์จัดการผู้ใช้ตามที่ UI/API อนุญาต

หลังมีผู้ใช้แรกแล้ว สามารถสร้างผู้ใช้เพิ่มผ่านหน้าจัดการผู้ใช้ในแอป (เมื่อล็อกอินด้วยบัญชีที่มีสิทธิ์)

---

## 5. การสร้างผู้ใช้ Executive คนแรก (bootstrap)

หลัง `prisma migrate deploy` สำเร็จ **ยังไม่มีผู้ใช้ในระบบ** จึงล็อกอินผ่านหน้า UI ไม่ได้ จนกว่าจะมีเรคคอร์ดในตาราง `User`

### 5.1 วิธีแนะนำ: สคริปต์ที่แนบมากับโปรเจกต์

สคริปต์ [`scripts/create-first-executive.mjs`](../scripts/create-first-executive.mjs) จะ:

- ตรวจว่า **ยังไม่มี** user ที่ `role = Executive` (ถ้ามีแล้วจะหยุดเพื่อกันสร้างซ้ำโดยไม่ตั้งใจ)
- ตรวจว่า **email ยังไม่ถูกใช้**
- เข้ารหัสรหัสผ่านด้วย **bcrypt** แบบเดียวกับแอป (rounds = 10)

**ข้อกำหนด:** ตั้ง `DATABASE_URL` ให้ชี้ไปที่ PostgreSQL ที่ migrate แล้ว **ก่อน** รันสคริปต์

**Linux / macOS:**

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
node scripts/create-first-executive.mjs "executive@yourcompany.com" "รหัสผ่านที่ปลอดภัย" "ชื่อ นามสกุล" "ตำแหน่ง"
```

**Windows PowerShell:**

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
node scripts/create-first-executive.mjs "executive@yourcompany.com" "รหัสผ่านที่ปลอดภัย" "ชื่อ นามสกุล" "ตำแหน่ง"
```

**ผ่าน npm (ต้องมี `--` ก่อนอาร์กิวเมนต์):**

```bash
DATABASE_URL="postgresql://..." npm run bootstrap:executive -- "executive@yourcompany.com" "รหัสผ่าน"
```

พารามิเตอร์ `name` และ `position` เป็นทางเลือก — ถ้าไม่ใส่จะใช้ค่าเริ่มต้นในสคริปต์

หลังสร้างสำเร็จ ให้ล็อกอินที่ `/login` ด้วย **email / รหัสผ่านแบบ plain text** ที่คุณพิมพ์ตอนรันสคริปต์ (ระบบจะเปรียบเทียบกับ hash ในฐานข้อมูล)

### 5.2 วิธีทางเลือก (ผู้ดูแลฐานข้อมูลโปร)

- สร้างแฮช bcrypt เองแล้ว `INSERT` ลง `User` ด้วย SQL — ต้องให้คอลัมน์ `role` เป็น `Executive` ค่าที่ Prisma ใช้ใน PostgreSQL คือข้อความ `Executive` (ตรงกับ enum)  
- หรือใช้ **Prisma Studio**: `npx prisma studio` แล้วเพิ่มแถว — ช่อง `password` ต้องเป็น **สตริงแฮช bcrypt** ไม่ใช่รหัสผ่านเปล่า จึงมักยุ่งกว่าการรันสคริปต์

### 5.3 หลัง bootstrap

- เปลี่ยนรหัสผ่านผ่าน flow ในแอป (ถ้ามี) หรือใช้ฟีเจอร์รีเซ็ตรหัสผ่าน (ต้องตั้ง SMTP)  
- สร้างผู้ใช้ role อื่น (Admin, Requester, Driver) ผ่านเมนูจัดการผู้ใช้ในแอปเมื่อล็อกอินด้วย Executive (หรือ Admin ตามสิทธิ์ที่ระบบเปิดให้)

---

## 6. การส่งมอบฐานข้อมูล (schema)

- **สิ่งที่ส่งใน repo:** `prisma/schema.prisma` + `prisma/migrations/`  
- ผู้รับรันบน DB ว่าง: `npx prisma migrate deploy`  
- **ข้อมูลจริง** (production): ส่งแยกเป็น backup ตามข้อตกลง — ไม่ผสมลง Git

---

## 7. ข้อควรระวังเมื่อ deploy

| หัวข้อ | รายละเอียด |
|--------|-------------|
| Vercel + DB ในออฟฟิศ | DB ต้องเข้าถึงจากอินเทอร์เน็ตได้และปลอดภัย — localhost อย่างเดียวมักใช้กับ Vercel ไม่ได้ |
| ไฟล์ใน `public/pdfs` | การเขียน PDF ลงดิสก์เซิร์ฟเวอร์อาจไม่เหมาะกับ serverless — ควรวางแผน object storage ถ้า deploy แบบนั้น |
| ความลับ | ไม่ commit `.env`; หมุน `NEXTAUTH_SECRET` และรหัส DB เมื่อสงสัยรั่ว |

---

## 8. คำสั่งอ้างอิงสั้น ๆ

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start
```

```bash
npm run lint
```

---

*อัปเดตเอกสารนี้ให้สอดคล้องกับ commit / เวอร์ชันที่ส่งมอบจริงเมื่อมีการเปลี่ยนแปลงขั้นตอนติดตั้ง*
