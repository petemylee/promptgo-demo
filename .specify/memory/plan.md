# 🏛️ แผนงานทางเทคนิค (Technical Plan) - OFM_PROMPTGO

เอกสารนี้คือแผนการดำเนินงานทางเทคนิคเพื่อสร้างโปรเจคตาม `specification.md` และอยู่ภายใต้ข้อบังคับของ `constitution.md`

This document is the technical implementation plan to build the project according to `specification.md` and under the constraints of `constitution.md`.

---

## 1. สถาปัตยกรรม (Tech Stack)

AI Agent จะต้องใช้ Tech Stack ที่กำหนดไว้ใน Constitution ดังนี้:

AI Agents MUST use the Tech Stack defined in the Constitution:

* **Framework:** Next.js (App Router)
* **ภาษา:** TypeScript
* **ฐานข้อมูล:** PostgreSQL (บน Supabase) - PostgreSQL (on Supabase)
* **ORM:** Prisma
* **Authentication:** NextAuth.js (Credentials Provider)
* **Styling:** TailwindCSS
* **PDF Generation:** `pdf-lib`
* **File Storage:** Local server storage (`public/uploads/`)
* **Deployment:** Cloudflare (WAF, DDoS Protection, Rate Limiting)

---

## 2. โมเดลฐานข้อมูล (Data Model)

AI Agent จะสร้างไฟล์ `prisma/schema.prisma` เพื่อรองรับ User Journeys ทั้งหมด โดยมีโครงสร้างดังนี้:

AI Agents will create the `prisma/schema.prisma` file to support all User Journeys with the following structure:

### Enums

* **`Role`**: (Requester, Driver, Admin, Executive)
* **`BookingStatus`**: (PENDING, APPROVED, CONFIRMED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED, MERGED)

### Models

* **`User`**: จัดการข้อมูลผู้ใช้ทั้ง 4 Roles และเก็บ `signatureImageUrl` สำหรับ Executive
  * **`User`**: Manages data for all 4 Roles and stores `signatureImageUrl` for Executive
  * Key fields: `id`, `email`, `name`, `password`, `role`, `signatureImageUrl`
  * Relationships: Can create bookings (Requester), approve bookings (Admin), confirm bookings (Executive), drive trips (Driver)

* **`Vehicle`**: จัดการข้อมูลยานพาหนะ
  * **`Vehicle`**: Manages vehicle data
  * Key fields: `id`, `licensePlate`, `brand`, `model`, `type`, `capacity`
  * Relationships: Can be assigned to multiple bookings

* **`Booking`**: ตารางหลักสำหรับจัดการการจองและสถานะ Workflow ทั้งหมด (เชื่อมโยง User และ Vehicle)
  * **`Booking`**: Main table for managing bookings and all workflow statuses (linked to User and Vehicle)
  * Key fields: `id`, `purpose`, `startLocation`, `endLocation`, `startTime`, `endTime`, `status`, `generatedFormUrl`
  * Relationships: Linked to Requester, Driver, Vehicle, Admin (approver), Executive (confirmer)
  * Status transitions: PENDING → APPROVED → CONFIRMED → IN_PROGRESS → COMPLETED

* **`Feedback`**: จัดการการให้คะแนน (Rating) และ Comment (เชื่อมโยงกับ Booking)
  * **`Feedback`**: Manages ratings and comments (linked to Booking)
  * Key fields: `id`, `rating` (1-5), `comment`
  * Relationships: Linked to one Booking

---

## 3. โครงสร้าง API Routes (API Route Handlers)

AI Agent จะสร้าง API Endpoints ใน `src/app/api/` ตามหลักการของ Next.js App Router:

AI Agents will create API Endpoints in `src/app/api/` following Next.js App Router principles:

### Authentication (J-01)

* **`POST /api/auth/[...nextauth]`**: จัดการการ Login/Logout (NextAuth.js)
  * **`POST /api/auth/[...nextauth]`**: Handles Login/Logout (NextAuth.js)
  * Handles: Authentication, session management, role-based access

### Users (J-03)

* **`GET, POST /api/users`**: (Admin) ดึงข้อมูลผู้ใช้ทั้งหมด, สร้างผู้ใช้ใหม่
  * **`GET, POST /api/users`**: (Admin) Fetch all users, create new user
  * Authorization: Admin only
  * Validation: Zod schema for user creation/update

* **`PATCH, DELETE /api/users/[userId]`**: (Admin) อัปเดต, ลบผู้ใช้
  * **`PATCH, DELETE /api/users/[userId]`**: (Admin) Update, delete user
  * Authorization: Admin only
  * Validation: Zod schema for user updates

### Vehicles (J-03)

* **`GET, POST /api/vehicles`**: (Admin) ดึงข้อมูลรถทั้งหมด, สร้างรถใหม่
  * **`GET, POST /api/vehicles`**: (Admin) Fetch all vehicles, create new vehicle
  * Authorization: Admin only
  * Validation: Zod schema for vehicle creation/update

* **`PATCH, DELETE /api/vehicles/[vehicleId]`**: (Admin) อัปเดต, ลบรถ
  * **`PATCH, DELETE /api/vehicles/[vehicleId]`**: (Admin) Update, delete vehicle
  * Authorization: Admin only
  * Validation: Zod schema for vehicle updates

### Bookings (J-02, J-03, J-04, J-06)

* **`POST /api/bookings`**: (Requester) สร้างคำขอจองใหม่
  * **`POST /api/bookings`**: (Requester) Create new booking request
  * Authorization: Requester only
  * Validation: Zod schema for booking creation
  * Initial status: `PENDING`

* **`GET /api/bookings`**: (Admin/Executive) ดึงข้อมูลการจองทั้งหมด
  * **`GET /api/bookings`**: (Admin/Executive) Fetch all bookings
  * Authorization: Admin or Executive
  * Filtering: By status, date range, requester

* **`GET /api/my/bookings`**: (Requester) ดึงข้อมูลการจอง "ของฉัน"
  * **`GET /api/my/bookings`**: (Requester) Fetch "my" bookings
  * Authorization: Requester only
  * Filtering: Only bookings created by current user

* **`GET /api/driver/jobs`**: (Driver) ดึงข้อมูลงาน "ของฉัน"
  * **`GET /api/driver/jobs`**: (Driver) Fetch "my" jobs
  * Authorization: Driver only
  * Filtering: Only bookings assigned to current driver

* **`PATCH /api/bookings/[bookingId]`**: (Admin/Executive) อัปเดตสถานะ (APPROVED, REJECTED, CONFIRMED)
  * **`PATCH /api/bookings/[bookingId]`**: (Admin/Executive) Update status (APPROVED, REJECTED, CONFIRMED)
  * Authorization: Admin (APPROVED/REJECTED) or Executive (CONFIRMED)
  * Validation: Sequential workflow enforcement (no step skipping)
  * State transitions:
    * Admin: `PENDING` → `APPROVED` or `REJECTED`
    * Executive: `APPROVED` → `CONFIRMED`

* **`PATCH /api/driver/jobs/[bookingId]/start`**: (Driver) อัปเดตสถานะ (IN_PROGRESS)
  * **`PATCH /api/driver/jobs/[bookingId]/start`**: (Driver) Update status (IN_PROGRESS)
  * Authorization: Driver only
  * Validation: Booking must be `CONFIRMED` and assigned to current driver
  * Side effects: Enable GPS tracking

* **`PATCH /api/driver/jobs/[bookingId]/end`**: (Driver) อัปเดตสถานะ (COMPLETED)
  * **`PATCH /api/driver/jobs/[bookingId]/end`**: (Driver) Update status (COMPLETED)
  * Authorization: Driver only
  * Validation: Booking must be `IN_PROGRESS` and assigned to current driver
  * Side effects: Disable GPS tracking, allow feedback submission

### File & PDF (J-04, J-05)

* **`POST /api/upload/signature`**: (Executive) อัปโหลดไฟล์ลายเซ็น
  * **`POST /api/upload/signature`**: (Executive) Upload signature file
  * Authorization: Executive only
  * Storage: `public/uploads/signatures/`
  * Validation: File type (image), file size limits
  * Response: URL to uploaded signature file

* **`POST /api/bookings/[bookingId]/pdf`**: (Executive) สั่งสร้างไฟล์ PDF
  * **`POST /api/bookings/[bookingId]/pdf`**: (Executive) Generate PDF file
  * Authorization: Executive only
  * Validation: Booking must be `CONFIRMED` by current Executive
  * Generation: Use `pdf-lib` to fill template with booking data and Executive signature
  * Storage: `public/uploads/pdfs/`
  * Response: URL to generated PDF file
  * Update: Store PDF URL in `booking.generatedFormUrl`

### Feedback (J-07)

* **`POST /api/bookings/[bookingId]/feedback`**: (Requester) ส่ง Feedback หลังการใช้งาน
  * **`POST /api/bookings/[bookingId]/feedback`**: (Requester) Submit feedback after usage
  * Authorization: Requester only
  * Validation: Booking must be `COMPLETED` and created by current Requester
  * Validation: Zod schema for feedback (rating 1-5, optional comment)
  * Creation: Create Feedback record linked to Booking

### GPS Tracking (J-06, J-07)

* **`POST /api/driver/jobs/[bookingId]/location`**: (Driver) อัปเดตตำแหน่งปัจจุบัน
  * **`POST /api/driver/jobs/[bookingId]/location`**: (Driver) Update current location
  * Authorization: Driver only
  * Validation: Booking must be `IN_PROGRESS` and assigned to current driver
  * Data: Latitude, longitude, timestamp
  * Storage: Real-time location tracking (consider Redis or in-memory cache for active trips)

* **`GET /api/bookings/[bookingId]/location`**: (Requester) ดึงตำแหน่งปัจจุบันของ Driver
  * **`GET /api/bookings/[bookingId]/location`**: (Requester) Fetch current Driver location
  * Authorization: Requester only
  * Validation: Booking must be created by current Requester and status is `IN_PROGRESS`
  * Response: Current location (latitude, longitude, timestamp)

---

## 4. แผนการด้านความปลอดภัย (Security Implementation Plan)

AI Agent จะต้องปฏิบัติตามแผนความปลอดภัยใน Constitution ดังนี้:

AI Agents MUST follow the security plan in the Constitution:

### Principle 1: Row Level Security (RLS)

* **Implementation:** หลังจาก `prisma migrate` ครั้งแรก เราจะต้องกำหนด RLS policies บน Supabase ทันที
* **Implementation:** After the first `prisma migrate`, we MUST define RLS policies on Supabase immediately

* **Policies Required:**
  * Users can only read their own user record
  * Requesters can only read their own bookings
  * Drivers can only read bookings assigned to them
  * Admins can read all users and vehicles
  * Executives can read all bookings
  * Users cannot access other users' data

### Principle 2: API Authorization (NON-NEGOTIABLE)

* **Implementation:** API Route ทุกเส้นจะถูกป้องกันด้วย NextAuth.js `getServerSession` และมีการตรวจสอบ `token.role` อย่างเคร่งครัด
* **Implementation:** All API routes MUST be protected with NextAuth.js `getServerSession` and MUST strictly validate `token.role`

* **Authorization Pattern:**
  ```typescript
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (session.user.role !== 'Admin') {
    return new Response('Forbidden', { status: 403 });
  }
  ```

* **Role-Based Access:**
  * Requester: Can create bookings, view own bookings, submit feedback
  * Admin: Can manage users/vehicles, approve/reject bookings
  * Executive: Can confirm bookings, generate PDFs
  * Driver: Can view assigned jobs, start/end jobs, update location

### Principle 3: Input Validation (NON-NEGOTIABLE)

* **Implementation:** API Route ทุกเส้นที่รับ Input จะต้องใช้ Zod Schema ในการตรวจสอบข้อมูล
* **Implementation:** All API routes that accept Input MUST use Zod Schema for validation

* **Validation Pattern:**
  ```typescript
  import { z } from 'zod';
  
  const bookingSchema = z.object({
    purpose: z.string().min(1).max(500),
    endLocation: z.string().min(1).max(200),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  });
  
  const body = await req.json();
  const validated = bookingSchema.parse(body);
  ```

* **Schemas Required:**
  * User creation/update schema
  * Vehicle creation/update schema
  * Booking creation schema
  * Booking status update schema
  * Feedback submission schema
  * File upload schema (signature)
  * Location update schema

### Principle 4: Deployment Security

* **Implementation:** การ Deploy ใช้งานจริง (Phase 5) จะถูกวางไว้หลัง Cloudflare
* **Implementation:** Production deployment (Phase 5) MUST be placed behind Cloudflare

* **Cloudflare Configuration:**
  * WAF (Web Application Firewall) enabled
  * DDoS Protection enabled
  * Rate Limiting configured
  * SSL/TLS encryption enforced
  * Bot protection enabled

---

## 5. โครงสร้างโปรเจค (Project Structure)

### Source Code Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   └── [userId]/
│   │   │       └── route.ts
│   │   ├── vehicles/
│   │   │   ├── route.ts
│   │   │   └── [vehicleId]/
│   │   │       └── route.ts
│   │   ├── bookings/
│   │   │   ├── route.ts
│   │   │   └── [bookingId]/
│   │   │       ├── route.ts
│   │   │       └── pdf/
│   │   │           └── route.ts
│   │   ├── my/
│   │   │   └── bookings/
│   │   │       └── route.ts
│   │   ├── driver/
│   │   │   └── jobs/
│   │   │       ├── route.ts
│   │   │       └── [bookingId]/
│   │   │           ├── start/
│   │   │           │   └── route.ts
│   │   │           ├── end/
│   │   │           │   └── route.ts
│   │   │           └── location/
│   │   │               └── route.ts
│   │   ├── upload/
│   │   │   └── signature/
│   │   │       └── route.ts
│   │   └── bookings/
│   │       └── [bookingId]/
│   │           └── feedback/
│   │               └── route.ts
│   ├── requester/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [bookingId]/
│   │       └── page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── users/
│   │   │   └── page.tsx
│   │   └── vehicles/
│   │       └── page.tsx
│   ├── executive/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── approvals/
│   │       └── page.tsx
│   ├── driver/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── jobs/
│   │       └── [bookingId]/
│   │           └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── validation/
│   │   ├── user.ts
│   │   ├── vehicle.ts
│   │   ├── booking.ts
│   │   └── feedback.ts
│   └── pdf/
│       └── generator.ts
├── components/
│   ├── ui/
│   └── shared/
└── types/
    └── index.ts

prisma/
├── schema.prisma
└── migrations/

public/
├── uploads/
│   ├── signatures/
│   └── pdfs/
└── templates/
    └── booking-form.pdf
```

---

## 6. Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Type-Safety First ✅
* All code MUST be written in TypeScript with strict type checking
* Prisma schema serves as source of truth for data models
* Type inference from Prisma models MUST be used

### Component-Based Architecture ✅
* UI components MUST be built as reusable React components
* Components MUST follow Next.js App Router conventions
* Server Components MUST be preferred over Client Components

### Security & Authentication (NON-NEGOTIABLE) ✅
* All routes MUST be protected with NextAuth session validation
* Role-based access control (RBAC) MUST be enforced
* Passwords MUST be hashed using bcrypt
* Environment variables containing secrets MUST never be committed

### Data Integrity & Migrations ✅
* Database schema changes MUST be managed through Prisma migrations
* Database queries MUST use Prisma Client
* Transaction boundaries MUST be properly defined

### Code Quality & Testing ✅
* All code MUST pass ESLint checks before commit
* Test coverage SHOULD be maintained for critical business logic
* Integration tests MUST be written for API routes

### User Experience & Accessibility ✅
* UI components MUST be responsive
* Forms MUST include proper validation and error messages (Thai for UI text)
* Color contrast MUST meet WCAG accessibility standards

### Language Policy ✅
* Code and comments MUST be in English
* User-facing text (UI Text) MUST be in Thai

### Sequential Approval Process (NON-NEGOTIABLE) ✅
* Approval workflow MUST follow sequential steps
* Skipping steps is PROHIBITED
* State transitions: PENDING → APPROVED → CONFIRMED → IN_PROGRESS → COMPLETED

---

## 7. Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js 15.5.2, React 19.1.0, Prisma 6.15.0, NextAuth 4.24.11, pdf-lib 1.17.1  
**Storage**: PostgreSQL (Supabase), Local file storage (`public/uploads/`)  
**Testing**: Jest, React Testing Library (to be configured)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application  
**Performance Goals**: 
* Page load times < 2 seconds (95th percentile)
* API response times < 500ms (95th percentile)
* Support 100 concurrent users without degradation

**Constraints**:
* Must comply with Constitution security principles
* Must support Thai language for UI text
* Must enforce sequential approval workflow
* Must use Cloudflare for production deployment

**Scale/Scope**:
* 4 user roles (Requester, Admin, Executive, Driver)
* 9 user journeys (J-01 to J-09)
* Real-time GPS tracking for active trips
* PDF generation for confirmed bookings

---

## 8. Complexity Tracking

> **No Constitution violations identified. All principles are followed.**

---

**Version**: 1.0.0 | **Created**: 2025-11-06 | **Last Updated**: 2025-11-06

