# 📋 รายการงาน (Task List) - OFM_PROMPTGO

นี่คือรายการ Task ทั้งหมดที่ AI Agent จะต้อง Implement โดยเรียงลำดับตามความสำคัญและ Dependencies

This is the complete Task List that AI Agents MUST implement, ordered by priority and dependencies.

---

## Phase 1: 🏗️ Setup โครงการและฐานข้อมูล (J-01)

**Goal**: สร้างโครงสร้างพื้นฐานของโปรเจค Next.js, ตั้งค่าฐานข้อมูล Prisma, และระบบ Authentication
**Goal**: Create Next.js project foundation, setup Prisma database, and Authentication system

**Independent Test**: ผู้ใช้สามารถ Login เข้าระบบและถูก Redirect ไปยัง Dashboard ตาม Role ของตน
**Independent Test**: Users can login to the system and be redirected to their role-specific dashboard

- [ ] T001 Create Next.js project (App Router) with TypeScript and install TailwindCSS in project root
- [ ] T002 Install Prisma and run `npx prisma migrate dev` using `prisma/schema.prisma` to create database tables in Supabase
- [ ] T002A [SEC] Write and install all RLS (Row Level Security) policies on Supabase immediately after migration (users can only read their own records, Requesters can only read their own bookings, Drivers can only read assigned bookings, Admins can read all users/vehicles, Executives can read all bookings)
- [ ] T003 Install NextAuth.js and create API route `src/app/api/auth/[...nextauth]/route.ts` (Credentials Provider, JWT Strategy) with bcrypt password hashing
- [ ] T004 Create `src/app/layout.tsx` and `src/app/AuthProvider.tsx` for authentication context
- [ ] T005 Create `src/app/login/page.tsx` (UI + Logic for `signIn` function)
- [ ] T006 Create `src/middleware.ts` (or update `src/app/page.tsx`) to redirect authenticated users to their role-specific dashboard
- [ ] T006A [SEC] Add Security Headers to `src/middleware.ts` (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc.)

---

## Phase 2: 👑 Admin Role (J-03)

**Goal**: Admin สามารถจัดการข้อมูลผู้ใช้และรถยนต์, และอนุมัติคำขอจอง
**Goal**: Admin can manage user and vehicle data, and approve booking requests

**Independent Test**: Admin สามารถ Login, ดู Dashboard, จัดการผู้ใช้/รถยนต์, และอนุมัติ/ปฏิเสธคำขอจองได้
**Independent Test**: Admin can login, view dashboard, manage users/vehicles, and approve/reject booking requests

- [ ] T007 [J-03] Create `src/app/admin/layout.tsx` with Sidebar and route protection (check Role `Admin`)
- [ ] T008 [P] [J-03] Create API route `src/app/api/users/route.ts` (GET, POST) with Zod validation and Admin role check
- [ ] T009 [P] [J-03] Create API route `src/app/api/users/[userId]/route.ts` (PATCH, DELETE) with Zod validation and Admin role check
- [ ] T010 [J-03] Create `src/app/admin/users/page.tsx` and `src/app/admin/users/UserFormModal.tsx` for user management UI
- [ ] T011 [P] [J-03] Create API route `src/app/api/vehicles/route.ts` (GET, POST) with Zod validation and Admin role check
- [ ] T012 [P] [J-03] Create API route `src/app/api/vehicles/[vehicleId]/route.ts` (PATCH, DELETE) with Zod validation and Admin role check
- [ ] T013 [J-03] Create `src/app/admin/vehicles/page.tsx` and `src/app/admin/vehicles/VehicleFormModal.tsx` for vehicle management UI
- [ ] T014 [P] [J-03] Create API route `src/app/api/bookings/route.ts` (GET) to fetch `PENDING` bookings for Admin with NextAuth.js `getServerSession` authorization check
- [ ] T015 [J-03] Update API route `src/app/api/bookings/[bookingId]/route.ts` (PATCH) for Admin to update status to `APPROVED` or `REJECTED` with Zod validation, sequential workflow validation, and NextAuth.js `getServerSession` authorization check
- [ ] T015A [J-03] Update API route `src/app/api/bookings/[bookingId]/route.ts` (PATCH) for Admin to accept `vehicleId` parameter when approving bookings
- [ ] T016 [J-03] Create `src/app/admin/page.tsx` (Dashboard showing stats and list of `PENDING` bookings with approve buttons)
- [ ] T016A [J-03] Update `src/app/admin/page.tsx` to add vehicle selection modal/form when Admin approves bookings

---

## Phase 3: 🧑‍💼 Requester Role (J-02)

**Goal**: Requester สามารถสร้างคำขอจองและดูประวัติการจองของตนเอง
**Goal**: Requester can create booking requests and view their booking history

**Independent Test**: Requester สามารถ Login, สร้างคำขอจองใหม่, และดูรายการจองของตนเองได้
**Independent Test**: Requester can login, create new booking requests, and view their own booking list

- [ ] T017 [J-02] Create `src/app/requester/layout.tsx` with Sidebar and route protection (check Role `Requester`)
- [ ] T018 [P] [J-02] Create API route `src/app/api/bookings/route.ts` (POST) for Requester to create booking requests with Zod validation
- [ ] T019 [P] [J-02] Create API route `src/app/api/my/bookings/route.ts` (GET) for Requester to fetch only their own bookings with NextAuth.js `getServerSession` authorization check
- [ ] T020 [J-02] Create `src/app/requester/page.tsx` to display list of user's bookings
- [ ] T021 [J-02] Create `src/app/requester/BookingFormModal.tsx` (form to create booking requests)

---

## Phase 4: 🎩 Executive Role (J-04, J-05)

**Goal**: Executive สามารถยืนยันคำขอจองและสร้างเอกสาร PDF พร้อมลายเซ็น
**Goal**: Executive can confirm booking requests and generate PDF documents with signature

**Independent Test**: Executive สามารถ Login, ดูคำขอที่ APPROVED, อัปโหลดลายเซ็น, ยืนยันคำขอ, และสร้าง PDF ได้
**Independent Test**: Executive can login, view APPROVED requests, upload signature, confirm requests, and generate PDFs

- [ ] T022 [J-04] Create `src/app/executive/layout.tsx` with Sidebar and route protection (check Role `Executive`)
- [ ] T023 [P] [J-04] Create API route `src/app/api/upload/signature/route.ts` (POST) for Executive to upload signature files to `public/uploads/signatures/` with Zod validation (file type: PNG/JPG, max size: 2MB, max dimensions: 2000x2000px) and NextAuth.js `getServerSession` authorization check
- [ ] T024 [J-04] Update API route `src/app/api/bookings/[bookingId]/route.ts` (PATCH) for Executive to update status to `CONFIRMED` with Zod validation, sequential workflow validation, and NextAuth.js `getServerSession` authorization check
- [ ] T024A [J-04] Update API route `src/app/api/bookings/[bookingId]/route.ts` (PATCH) for Executive to accept `vehicleId` parameter to edit or keep unchanged the vehicle selected by Admin
- [ ] T025 [J-05] [IN PROGRESS] Create API route `src/app/api/bookings/[bookingId]/pdf/route.ts` (POST) to generate PDF using `pdf-lib`, fill template from `public/templates/booking-form.pdf` with booking data, embed Executive signature, save to `public/uploads/pdfs/`, and update `booking.generatedFormUrl` with NextAuth.js `getServerSession` authorization check
  - ⚠️ **Status**: Partially implemented - needs fixes:
    - [ ] Fix template path: Currently uses `booking-approval-template.pdf` but spec requires `booking-form.pdf`
    - [ ] Fix save path: Currently saves to `public/pdfs/` but spec requires `public/uploads/pdfs/`
    - [ ] Add Zod validation for PDF generation request
    - [ ] Improve PDF form filling coordinates and data completeness
    - [ ] Add better error handling for signature image embedding
    - [ ] Test end-to-end PDF generation and URL storage
    - [ ] Add UI for download/view PDF in Executive approval page
- [ ] T026 [J-04] Create `src/app/executive/page.tsx` (Dashboard showing stats)
- [ ] T027 [J-04] Create `src/app/executive/approvals/page.tsx` (Display list of `APPROVED` bookings)
- [ ] T028 [J-04] Create `src/app/executive/approvals/[bookingId]/page.tsx` (Display booking details, signature upload field, and confirm button)
- [ ] T028A [J-04] Update `src/app/executive/approvals/[bookingId]/page.tsx` to add vehicle selection/editing UI for Executive to edit or keep unchanged the vehicle selected by Admin
- [ ] T029 [J-04] Create `src/app/executive/history/page.tsx` (Display list of `CONFIRMED` bookings)

---

## Phase 5: 🚗 Driver Role (J-06)

**Goal**: Driver สามารถดูงานที่ได้รับมอบหมาย, เริ่มงาน, และสิ้นสุดงาน
**Goal**: Driver can view assigned jobs, start jobs, and end jobs

**Independent Test**: Driver สามารถ Login, ดูรายการงาน, เริ่มงาน, และสิ้นสุดงานได้
**Independent Test**: Driver can login, view job list, start jobs, and end jobs

- [ ] T030 [J-06] Create `src/app/driver/layout.tsx` with route protection (check Role `Driver`)
- [ ] T031 [P] [J-06] Create API route `src/app/api/driver/jobs/route.ts` (GET) to fetch `CONFIRMED` bookings assigned to driver with NextAuth.js `getServerSession` authorization check
- [ ] T032 [P] [J-06] Create API route `src/app/api/driver/jobs/[bookingId]/start/route.ts` (PATCH) to update status to `IN_PROGRESS` with Zod validation, validation (booking must be `CONFIRMED` and assigned to current driver), and NextAuth.js `getServerSession` authorization check
- [ ] T033 [P] [J-06] Create API route `src/app/api/driver/jobs/[bookingId]/end/route.ts` (PATCH) to update status to `COMPLETED` with Zod validation, validation (booking must be `IN_PROGRESS` and assigned to current driver), and NextAuth.js `getServerSession` authorization check
- [ ] T034 [J-06] Create `src/app/driver/page.tsx` (Display list of upcoming jobs)
- [ ] T035 [J-06] Create `src/app/driver/jobs/[bookingId]/page.tsx` (Display job details and "Start Job" button)
- [ ] T036 [J-06] Create `src/app/driver/jobs/[bookingId]/navigate/page.tsx` (Display GPS map using Google Maps API and "End Job" button)
- [ ] T036A [J-06] Create API route `src/app/api/driver/jobs/history/route.ts` (GET) to fetch `COMPLETED`, `CANCELLED`, or `REJECTED` bookings assigned to driver with NextAuth.js `getServerSession` authorization check
- [ ] T036B [J-06] Create `src/app/driver/history/page.tsx` (Display job history with search and filter functionality)

---

## Phase 6: ✨ Supporting Features (J-07, J-08, J-09)

**Goal**: เพิ่มฟีเจอร์สนับสนุน: Feedback, GPS Tracking, Reporting, และ Chatbot
**Goal**: Add supporting features: Feedback, GPS Tracking, Reporting, and Chatbot

**Independent Test**: Requester สามารถให้ Feedback, ติดตามรถแบบ Real-time, และ Admin/Executive สามารถดูรายงานสถิติได้
**Independent Test**: Requester can provide feedback, track vehicle in real-time, and Admin/Executive can view statistical reports

### Feedback (J-07)

- [ ] T037 [J-07] Create API route `src/app/api/bookings/[bookingId]/feedback/route.ts` (POST) for Requester to submit feedback with Zod validation (rating 1-5, optional comment, booking must be `COMPLETED` and created by current Requester) and NextAuth.js `getServerSession` authorization check
- [ ] T038 [J-07] Create UI component for feedback submission (Modal or Page) in `src/app/requester/[bookingId]/feedback/page.tsx`
- [ ] T038A [J-07] Update `src/app/requester/page.tsx` to display feedback (rating and comment) in booking history list

### GPS Tracking (J-07)

- [ ] T039A [J-07] Create location tracking data model: Add `Location` table in `prisma/schema.prisma` (id, bookingId, latitude, longitude, timestamp) or use in-memory cache (Redis) for active trips
- [ ] T039 [P] [J-07] Create API route `src/app/api/driver/jobs/[bookingId]/location/route.ts` (POST) for Driver to update current location (latitude, longitude, timestamp) with Zod validation, validation (booking must be `IN_PROGRESS` and assigned to current driver), and NextAuth.js `getServerSession` authorization check. Store in database table or Redis cache with 5-second update frequency
- [ ] T040 [P] [J-07] Create API route `src/app/api/bookings/[bookingId]/location/route.ts` (GET) for Requester to fetch current Driver location with validation (booking must be created by current Requester and status is `IN_PROGRESS`) and NextAuth.js `getServerSession` authorization check. Use polling (5-second interval) or WebSocket for real-time updates
- [ ] T041 [J-07] Create `src/app/requester/track/[bookingId]/page.tsx` (Display real-time map using Google Maps API showing Driver location with 5-second polling updates)

### Reporting (J-08)

- [ ] T042A [J-08] Create API routes for data aggregation: `src/app/api/reports/bookings/route.ts` (GET) and `src/app/api/reports/utilization/route.ts` (GET) with aggregation queries (by time period, vehicle, driver) and NextAuth.js `getServerSession` authorization check
- [ ] T042 [J-08] Create reporting dashboard UI in `src/app/admin/page.tsx` and `src/app/executive/page.tsx` (Display statistics: total bookings, pending count, approved count, completed trips, resource utilization, aggregated by time period, vehicle, driver)

### Chatbot (J-09)

- [ ] T043 [J-09] [NEEDS CLARIFICATION] Plan integration with LINE OA for Chatbot functionality

---

## Phase 7: 🔒 Cybersecurity & Deployment

**Goal**: ปรับปรุงความปลอดภัยและเตรียมพร้อมสำหรับการ Deploy
**Goal**: Enhance security and prepare for deployment

**Independent Test**: ระบบมีความปลอดภัยตาม Constitution และพร้อม Deploy บน Cloudflare
**Independent Test**: System meets Constitution security requirements and is ready for Cloudflare deployment

### Security Implementation

- [ ] T049 [SEC] Create audit logging system: Add `AuditLog` table in `prisma/schema.prisma` (id, userId, action, entityType, entityId, oldStatus, newStatus, timestamp) and implement logging for all booking status transitions to ensure 100% sequential workflow compliance
- [ ] T050 [SEC] Create workflow validation tests: Add integration tests in `tests/integration/workflow.test.ts` to verify sequential workflow enforcement (no step skipping) and audit logging

### Deployment

- [ ] T048 [DEP] Setup Cloudflare: Configure domain, DNS, WAF (Web Application Firewall), DDoS Protection, and Rate Limiting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Admin)**: Depends on Phase 1 completion - BLOCKS all user story phases
- **Phase 3 (Requester)**: Depends on Phase 1 completion - can proceed in parallel with Phase 2 after Phase 1
- **Phase 4 (Executive)**: Depends on Phase 2 completion (needs `APPROVED` bookings from Admin)
- **Phase 5 (Driver)**: Depends on Phase 4 completion (needs `CONFIRMED` bookings from Executive)
- **Phase 6 (Supporting Features)**: Depends on Phase 5 completion (needs `COMPLETED` bookings for feedback, `IN_PROGRESS` for tracking)
- **Phase 7 (Security & Deployment)**: Can proceed in parallel with other phases but must complete before production deployment

### User Journey Dependencies

- **J-01 (Authentication)**: No dependencies - Phase 1
- **J-03 (Admin)**: Depends on J-01 - Phase 2
- **J-02 (Requester)**: Depends on J-01 - Phase 3
- **J-04 (Executive)**: Depends on J-03 (needs `APPROVED` bookings) - Phase 4
- **J-05 (PDF Generation)**: Depends on J-04 (needs `CONFIRMED` bookings) - Phase 4
- **J-06 (Driver)**: Depends on J-04/J-05 (needs `CONFIRMED` bookings) - Phase 5
- **J-07 (Tracking & Feedback)**: Depends on J-06 (needs `IN_PROGRESS`/`COMPLETED` bookings) - Phase 6
- **J-08 (Reporting)**: Depends on J-02, J-03, J-04, J-06 (needs booking data) - Phase 6
- **J-09 (Chatbot)**: Independent feature - Phase 6

### Within Each Phase

- API routes marked [P] can be implemented in parallel
- UI components depend on their corresponding API routes
- Layout components should be created before page components

### Parallel Opportunities

**Phase 2 (Admin)**:
- T008, T009, T011, T012, T014 can run in parallel (different API routes)

**Phase 3 (Requester)**:
- T018, T019 can run in parallel (different API routes)

**Phase 4 (Executive)**:
- T023, T024 can run in parallel (different API routes)

**Phase 5 (Driver)**:
- T031, T032, T033 can run in parallel (different API routes)

**Phase 6 (Supporting Features)**:
- T039, T040 can run in parallel (different API routes)

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 + Phase 3 Only)

1. Complete Phase 1: Setup (Authentication)
2. Complete Phase 2: Admin (User/Vehicle Management, Booking Approval)
3. Complete Phase 3: Requester (Booking Creation, My Bookings)
4. **STOP and VALIDATE**: Test core booking workflow independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Phase 1 → Foundation ready
2. Add Phase 2 → Admin can manage system and approve bookings
3. Add Phase 3 → Requesters can create bookings (MVP!)
4. Add Phase 4 → Executives can confirm bookings and generate PDFs
5. Add Phase 5 → Drivers can start and complete jobs
6. Add Phase 6 → Supporting features (feedback, tracking, reporting)
7. Add Phase 7 → Security hardening and deployment preparation

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 together
2. Once Phase 1 is done:
   - Developer A: Phase 2 (Admin)
   - Developer B: Phase 3 (Requester)
3. Once Phase 2 is done:
   - Developer C: Phase 4 (Executive)
4. Once Phase 4 is done:
   - Developer D: Phase 5 (Driver)
5. All developers: Phase 6 (Supporting Features) and Phase 7 (Security & Deployment)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [J-XX] label maps task to specific user journey for traceability
- Each phase should be independently testable
- All API routes MUST have Zod validation and NextAuth.js authorization
- All UI text MUST be in Thai (code and comments in English)
- Sequential workflow MUST be enforced (no step skipping)
- File paths are relative to project root

---

**Version**: 1.1.0 | **Created**: 2025-11-06 | **Last Updated**: 2025-11-06

**Changelog v1.1.0**:
- Fixed CRITICAL issues: Added explicit Zod validation and NextAuth.js authorization to all API route tasks
- Moved RLS implementation (T002A) to Phase 1 immediately after migration
- Added bcrypt password hashing to NextAuth setup (T003)
- Moved Security Headers (T006A) to Phase 1
- Added location tracking data model task (T039A)
- Added feedback display in history task (T038A)
- Added data aggregation tasks for reporting (T042A)
- Added audit logging system (T049) and workflow validation tests (T050)
- Clarified GPS tracking storage mechanism (database table or Redis cache)
- Clarified PDF template location (`public/templates/booking-form.pdf`)
- Clarified signature upload requirements (PNG/JPG, 2MB max, 2000x2000px max)
- Clarified map provider (Google Maps API)
- Clarified real-time update mechanism (5-second polling)

