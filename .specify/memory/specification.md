# 📖 Specification (V1) - OFM_PROMPTGO

เอกสารนี้คือ Specification ที่กำหนดขอบเขตและ User Journeys ของโครงการ "ระบบผู้ช่วยการเดินทางของสำนักงานรัฐมนตรี (OFM PromtGo)" โดยอ้างอิงจาก `รายงานความคืบหน้า1.pdf` และไฟล์ Wireframes ที่เกี่ยวข้อง

This document is the Specification that defines the scope and User Journeys for the "Office of the Minister Travel Assistant System (OFM PromtGo)" project, referenced from `รายงานความคืบหน้า1.pdf` and related Wireframe files.

---

## 1. 🎯 วัตถุประสงค์ (Objectives)

* **O-1:** เพื่อพัฒนาระบบศูนย์กลาง (Web Application) สำหรับการจอง, บริหารจัดการ, และติดตามการใช้รถยนต์
* **O-1:** To develop a centralized system (Web Application) for booking, managing, and tracking vehicle usage

* **O-2:** เพื่อลดระยะเวลา, ขั้นตอน, และลดค่าใช้จ่ายที่ไม่จำเป็น (ค่าน้ำมัน, ค่าล่วงเวลา)
* **O-2:** To reduce time, steps, and unnecessary costs (fuel costs, overtime costs)

* **O-3:** เพื่อเพิ่มประสิทธิภาพในการจัดสรรทรัพยากร (รถยนต์และคนขับ)
* **O-3:** To increase efficiency in resource allocation (vehicles and drivers)

* **O-4:** เพื่อให้สามารถติดตามสถานะการเดินทางได้แบบ Real-time (GPS)
* **O-4:** To enable real-time tracking of trip status (GPS)

* **O-5:** เพื่อสร้างมาตรฐานการดำเนินงานที่โปร่งใสและตรวจสอบย้อนหลังได้
* **O-5:** To create transparent and auditable operational standards

---

## 2. 👥 ผู้ใช้งานและบทบาท (User Roles)

ระบบจะมีผู้ใช้งาน 4 ประเภทหลัก ตามที่กำหนดในขอบเขตการดำเนินงาน

The system will have 4 main user types as defined in the operational scope:

1. **ผู้ขอใช้บริการ (Requester):** สร้างคำขอ, ติดตามสถานะ, ให้ Feedback
   **Requester:** Creates booking requests, tracks status, provides feedback

2. **ผู้ดูแลระบบ (Admin):** อนุมัติเบื้องต้น, จัดการข้อมูลผู้ใช้, จัดการข้อมูลรถ
   **Admin:** Initial approval, manages user data, manages vehicle data

3. **ผู้บริหาร (Executive):** ยืนยันขั้นสุดท้าย, ลงนามในเอกสาร
   **Executive:** Final confirmation, signs documents

4. **พนักงานขับรถ (Driver):** รับงาน, อัปเดตสถานะการเดินทาง
   **Driver:** Accepts jobs, updates trip status

---

## 3. 🗺️ ขอบเขตและ User Journeys (Scope & Journeys)

### J-01 (Authentication)

* **Journey:** ผู้ใช้ทั้ง 4 Role ต้องสามารถ Login เข้าระบบผ่านหน้า Login Page ได้
* **Journey:** All 4 Roles MUST be able to login to the system through the Login Page

* **Wireframe:** `Wireframe/Users/LoginPage.png`

* **Acceptance Scenarios:**
  1. **Given** a user with valid credentials, **When** they submit the login form, **Then** they are authenticated and redirected to their role-specific dashboard
  2. **Given** a user with invalid credentials, **When** they submit the login form, **Then** an error message is displayed (in Thai)
  3. **Given** an authenticated user, **When** they access a protected route, **Then** they are allowed access based on their role

---

### J-02 (Requester - Booking)

* **Journey 1:** ผู้ขอใช้สามารถสร้างคำขอจองรถใหม่ (กรอกสถานที่, วันที่, วัตถุประสงค์)
* **Journey 1:** Requester can create a new vehicle booking request (enter location, date, purpose)

* **Journey 2:** ผู้ขอใช้สามารถดูประวัติและสถานะการจองของตนเองได้ (My Bookings)
* **Journey 2:** Requester can view their booking history and status (My Bookings)

* **Acceptance Scenarios:**
  1. **Given** a Requester is logged in, **When** they fill out the booking form with valid data, **Then** a new booking is created with status `PENDING`
  2. **Given** a Requester is logged in, **When** they view My Bookings, **Then** they see all their bookings with current status
  3. **Given** a Requester creates a booking, **When** they submit, **Then** the booking appears in their My Bookings list

---

### J-03 (Admin - Management & Approval)

* **Journey 1:** Admin มี Dashboard สรุปสถานะคำขอ (Pending, Approved, กำลังเดินทาง)
* **Journey 1:** Admin has a Dashboard summarizing request status (Pending, Approved, In Progress)

* **Journey 2:** Admin สามารถจัดการ (เพิ่ม/ลบ/แก้ไข) ข้อมูลผู้ใช้ และ ข้อมูลยานพาหนะ
* **Journey 2:** Admin can manage (add/delete/edit) user data and vehicle data

* **Journey 3:** Admin สามารถ "อนุมัติเบื้องต้น" หรือ "ปฏิเสธ" คำขอที่ `PENDING` ได้
* **Journey 3:** Admin can "initially approve" or "reject" requests with status `PENDING`

* **Journey 4:** Admin สามารถเลือกรถยนต์จากรายการรถยนต์ได้ในขั้นตอนการอนุมัติ
* **Journey 4:** Admin can select a vehicle from the vehicle list during the approval process

* **Acceptance Scenarios:**
  1. **Given** an Admin is logged in, **When** they view the Dashboard, **Then** they see summary statistics of bookings by status
  2. **Given** an Admin views a `PENDING` booking, **When** they click "Approve", **Then** they can select a vehicle from the vehicle list and the booking status changes to `APPROVED` with the selected vehicle assigned
  3. **Given** an Admin views a `PENDING` booking, **When** they click "Reject", **Then** the booking status changes to `REJECTED`
  4. **Given** an Admin approves a booking, **When** they select a vehicle, **Then** the vehicle is assigned to the booking
  5. **Given** an Admin, **When** they manage user/vehicle data, **Then** changes are saved and reflected immediately

---

### J-04 (Executive - Confirmation)

* **Journey 1:** Executive มี Dashboard สำหรับดูคำขอที่ `APPROVED` แล้ว
* **Journey 1:** Executive has a Dashboard to view requests that are `APPROVED`

* **Journey 2:** Executive สามารถ "ยืนยันขั้นสุดท้าย" คำขอได้ (มีการลงนาม/สร้างเอกสาร)
* **Journey 2:** Executive can "confirm final approval" for requests (with signature/document creation)

* **Journey 3:** Executive สามารถแก้ไข(หรือคงเดิม) รถยนต์ที่ Admin เลือกมาได้ในขั้นตอนการยืนยัน
* **Journey 3:** Executive can edit (or keep unchanged) the vehicle selected by Admin during the confirmation process

* **Signature Upload Requirements:**
  * **File Format:** PNG or JPG image files only
  * **Max File Size:** 2MB
  * **Max Dimensions:** 2000x2000 pixels
  * **Storage Location:** `public/uploads/signatures/`
  * **Validation:** File type, size, and dimensions MUST be validated using Zod schema

* **Acceptance Scenarios:**
  1. **Given** an Executive is logged in, **When** they view the Dashboard, **Then** they see all bookings with status `APPROVED`
  2. **Given** an Executive views an `APPROVED` booking, **When** they upload signature (PNG/JPG, max 2MB, max 2000x2000px) and confirm, **Then** the booking status changes to `CONFIRMED` and a PDF document is generated
  3. **Given** an Executive views an `APPROVED` booking, **When** they see the vehicle selected by Admin, **Then** they can edit or keep the vehicle unchanged before confirming
  4. **Given** an Executive confirms a booking, **When** they sign, **Then** their signature is stored in `public/uploads/signatures/` and attached to the generated PDF
  5. **Given** an Executive edits the vehicle, **When** they confirm, **Then** the booking is updated with the new vehicle assignment

---

### J-05 (PDF Generation)

* **Journey:** หลังจาก Executive ยืนยัน (J-04), ระบบจะต้องสร้างเอกสาร PDF (จาก Template) พร้อมแนบ "ลายเซ็น" ของ Executive
* **Journey:** After Executive confirmation (J-04), the system MUST generate a PDF document (from Template) with Executive's "signature" attached

* **Template Location:** `public/templates/booking-form.pdf`
* **Template Location:** PDF template file must be located at `public/templates/booking-form.pdf`

* **Acceptance Scenarios:**
  1. **Given** an Executive confirms a booking, **When** the system processes the confirmation, **Then** a PDF is generated using `pdf-lib` from template at `public/templates/booking-form.pdf`
  2. **Given** a PDF is generated, **When** it includes Executive signature, **Then** the signature image is embedded in the PDF
  3. **Given** a PDF is generated, **When** it is saved, **Then** the PDF is saved to `public/uploads/pdfs/` and the PDF URL is stored in `booking.generatedFormUrl`

---

### J-06 (Driver - Workflow)

* **Journey 1:** Driver มีหน้า Dashboard ดู "งานของฉัน" (Upcoming Jobs)
* **Journey 1:** Driver has a Dashboard page to view "My Jobs" (Upcoming Jobs)

* **Journey 2:** Driver สามารถดู "รายละเอียดงาน" (สถานที่, ผู้โดยสาร)
* **Journey 2:** Driver can view "Job Details" (location, passengers)

* **Journey 3:** Driver กด "เริ่มงาน" และระบบจะแสดงแผนที่นำทาง (GPS)
* **Journey 3:** Driver clicks "Start Job" and the system displays navigation map (GPS)

* **Map Provider:** Google Maps API for GPS navigation and map display

* **Journey 4:** Driver กด "สิ้นสุดงาน"
* **Journey 4:** Driver clicks "End Job"

* **Journey 5:** Driver สามารถดู "ประวัติงาน" (งานที่เสร็จสิ้น, ยกเลิก, หรือถูกปฏิเสธ)
* **Journey 5:** Driver can view "Job History" (completed, cancelled, or rejected jobs)

* **Acceptance Scenarios:**
  1. **Given** a Driver is logged in, **When** they view the Dashboard, **Then** they see all `CONFIRMED` bookings assigned to them
  2. **Given** a Driver views a job, **When** they click "Start Job", **Then** the booking status changes to `IN_PROGRESS` and GPS tracking begins (location updated every 5 seconds)
  3. **Given** a Driver has started a job, **When** they click "End Job", **Then** the booking status changes to `COMPLETED` and GPS tracking stops
  4. **Given** a Driver starts a job, **When** GPS is enabled, **Then** their location is tracked in real-time (updated every 5 seconds) and stored in database or Redis cache
  5. **Given** a Driver is logged in, **When** they view Job History, **Then** they see all bookings with status `COMPLETED`, `CANCELLED`, or `REJECTED` that were assigned to them
  6. **Given** a Driver views Job History, **When** they search or filter, **Then** they can find specific jobs by purpose, location, date, or status

---

### J-07 (Tracking & Feedback)

* **Journey 1:** ผู้ขอใช้สามารถ "ติดตามรถ" (ดูตำแหน่ง Real-time ของ Driver) ได้ (เชื่อมโยงกับ J-06 Journey 3)
* **Journey 1:** Requester can "track vehicle" (view real-time location of Driver) (linked to J-06 Journey 3)

* **GPS Tracking Details:**
  * **Storage:** Location data stored in database `Location` table or Redis cache for active trips
  * **Update Frequency:** Driver location updated every 5 seconds when job is `IN_PROGRESS`
  * **Map Provider:** Google Maps API for displaying location on map
  * **Update Mechanism:** Polling (5-second interval) or WebSocket for real-time updates
  * **Display:** Real-time map showing Driver location with 5-second polling updates

* **Journey 2:** ผู้ขอใช้สามารถ "ให้คะแนน" (1-5 ดาว และ comment) หลังการเดินทางเสร็จสิ้น (เชื่อมโยงกับ J-06 Journey 4)
* **Journey 2:** Requester can "provide rating" (1-5 stars and comment) after trip completion (linked to J-06 Journey 4)

* **Feedback Display:** Feedback (rating and comment) MUST be displayed in Requester's booking history list

* **Acceptance Scenarios:**
  1. **Given** a booking is `IN_PROGRESS`, **When** a Requester views their booking, **Then** they can see the Driver's real-time location on a map (updated every 5 seconds)
  2. **Given** a booking is `COMPLETED`, **When** a Requester views their booking, **Then** they can submit feedback with rating (1-5 stars) and comment
  3. **Given** a Requester submits feedback, **When** they save, **Then** the feedback is stored and linked to the booking
  4. **Given** a Requester views their booking history, **When** feedback exists, **Then** the feedback (rating and comment) is displayed in the booking list

---

### J-08 (Reporting)

* **Journey:** ระบบมี Dashboard สำหรับแสดงผลสรุปและรายงานสถิติ
* **Journey:** System has a Dashboard for displaying summaries and statistical reports

* **Reporting Metrics:**
  * Total bookings count
  * Pending bookings count
  * Approved bookings count
  * Completed trips count
  * Resource utilization (vehicle and driver usage)
  * Aggregated statistics by time period (daily, weekly, monthly)
  * Aggregated statistics by vehicle
  * Aggregated statistics by driver

* **Acceptance Scenarios:**
  1. **Given** an Admin/Executive is logged in, **When** they view the Reporting Dashboard, **Then** they see statistics (total bookings, pending count, approved count, completed trips, resource utilization)
  2. **Given** a reporting dashboard, **When** data is displayed, **Then** it shows aggregated statistics by time period, vehicle, driver, etc.

---

### J-09 (Chatbot)

* **Journey:** ระบบมี Chatbot สำหรับตอบคำถามและแจ้งข้อมูล
* **Journey:** System has a Chatbot for answering questions and providing information

* **Acceptance Scenarios:**
  1. **Given** a user accesses the Chatbot, **When** they ask a question, **Then** the Chatbot provides relevant information about the system
  2. **Given** a Chatbot interaction, **When** it cannot answer, **Then** it provides options to contact support or view documentation

---

## 4. 📋 Functional Requirements

### FR-001: Authentication & Authorization
* System MUST authenticate users via NextAuth.js with Credentials Provider
* System MUST enforce role-based access control (RBAC) for all routes
* System MUST validate user session on every protected route

### FR-002: Booking Management
* System MUST allow Requesters to create booking requests with location, date, and purpose
* System MUST enforce sequential approval workflow (PENDING → APPROVED → CONFIRMED)
* System MUST prevent skipping approval steps

### FR-003: Approval Workflow
* System MUST allow Admin to approve/reject PENDING bookings
* System MUST allow Executive to confirm APPROVED bookings
* System MUST require Executive signature for final confirmation

### FR-004: PDF Generation
* System MUST generate PDF documents using `pdf-lib` from templates
* System MUST embed Executive signature in generated PDFs
* System MUST store PDF URLs in booking records

### FR-005: GPS Tracking
* System MUST track Driver location in real-time when job is IN_PROGRESS
* System MUST allow Requesters to view Driver location on map
* System MUST use GPS/geolocation APIs for tracking

### FR-006: Feedback System
* System MUST allow Requesters to submit ratings (1-5 stars) and comments
* System MUST link feedback to completed bookings
* System MUST display feedback in booking history

### FR-007: Data Management
* System MUST allow Admin to manage (CRUD) user data
* System MUST allow Admin to manage (CRUD) vehicle data
* System MUST enforce data validation using Zod schemas

### FR-008: Reporting
* System MUST provide statistical reports and summaries
* System MUST aggregate data by time period, vehicle, driver, etc.
* System MUST display reports in Dashboard format

### FR-009: Chatbot
* System MUST provide a Chatbot interface for user questions
* System MUST provide relevant system information through Chatbot
* System MUST offer support contact options when Chatbot cannot answer

---

## 5. 🎯 Success Criteria

### SC-001: Booking Creation
* Users can complete booking creation in under 2 minutes
* 95% of booking requests are created successfully on first attempt

### SC-002: Approval Workflow
* Average approval time (PENDING → APPROVED → CONFIRMED) is under 24 hours
* 100% of approvals follow sequential workflow (no step skipping)

### SC-003: GPS Tracking
* Real-time location updates occur within 5 seconds
* GPS tracking accuracy is within 10 meters

### SC-004: System Performance
* System handles 100 concurrent users without degradation
* Page load times are under 2 seconds for 95% of requests

### SC-005: User Satisfaction
* 90% of users successfully complete primary tasks on first attempt
* Average user rating is 4.0+ stars (out of 5)

### SC-006: Resource Efficiency
* Reduce booking processing time by 50% compared to paper-based system
* Reduce unnecessary vehicle usage by 30% through better resource allocation

---

## 6. 🔑 Key Entities

### User
* Represents system users with roles (Requester, Admin, Executive, Driver)
* Key attributes: id, email, name, role, signatureImageUrl
* Relationships: Can create bookings (Requester), approve bookings (Admin), confirm bookings (Executive), drive trips (Driver)

### Booking
* Represents vehicle booking requests and trips
* Key attributes: id, purpose, startLocation, endLocation, startTime, endTime, status, generatedFormUrl
* Relationships: Linked to Requester, Driver, Vehicle, Admin (approver), Executive (confirmer)
* Status transitions: PENDING → APPROVED → CONFIRMED → IN_PROGRESS → COMPLETED
* Note: `startLocation` is required for booking creation (departure location)

### Vehicle
* Represents vehicles in the fleet
* Key attributes: id, licensePlate, brand, model, type, capacity
* Relationships: Can be assigned to multiple bookings

### Feedback
* Represents user feedback after trip completion
* Key attributes: id, rating (1-5), comment
* Relationships: Linked to one Booking

---

**Version**: 1.3.0 | **Created**: 2025-11-06 | **Last Updated**: 2025-11-06

**Changelog v1.3.0**:
- Added Admin vehicle selection requirement (J-03 Journey 4): Admin can select a vehicle from the vehicle list during approval
- Added Executive vehicle editing requirement (J-04 Journey 3): Executive can edit or keep unchanged the vehicle selected by Admin during confirmation
- Updated acceptance scenarios for Admin approval and Executive confirmation workflows

**Changelog v1.2.0**:
- Added Driver History Journey (J-06 Journey 5): Driver can view job history (completed, cancelled, rejected jobs)
- Added acceptance scenarios for Driver History feature

**Changelog v1.1.0**:
- Added GPS tracking storage mechanism clarification (database table or Redis cache)
- Added PDF template location (`public/templates/booking-form.pdf`)
- Added signature upload requirements (PNG/JPG, 2MB max, 2000x2000px max)
- Added map provider specification (Google Maps API)
- Added real-time update mechanism (5-second polling)
- Added feedback display requirement in booking history
- Added reporting metrics specification
- Added `startLocation` field clarification in Booking entity

