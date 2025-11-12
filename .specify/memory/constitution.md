<!--
Sync Impact Report:
Version change: 1.0.0 → 1.1.0 (Added bilingual format, specific tech stack requirements, enhanced security principles, roles workflow)
Modified principles: 
  - Enhanced Security & Authentication → Security Principles with RLS, Zod, Cloudflare
  - Added Language Requirements (Code English, UI Thai)
  - Added Tech Stack & Architecture section
  - Added Roles & Workflow section
Added sections: Core Mission, Tech Stack & Architecture, Security Principles (enhanced), Roles & Workflow
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check section exists)
  ✅ .specify/templates/spec-template.md (no direct constitution references)
  ✅ .specify/templates/tasks-template.md (no direct constitution references)
Follow-up TODOs: None
-->

# 📖 รัฐธรรมนูญโครงการ (Constitution) - OFM_PROMPTGO

เอกสารนี้คือกฎสูงสุดและหลักการพื้นฐานสำหรับโปรเจค "ระบบผู้ช่วยการเดินทางของสำนักงานรัฐมนตรี (OFM PromtGo)" AI Agent ทั้งหมด (รวมถึง Gemini และ Cursor) จะต้องปฏิบัติตามหลักการเหล่านี้อย่างเคร่งครัด

This document is the supreme law and fundamental principles for the "Office of the Minister Travel Assistant System (OFM PromtGo)" project. All AI Agents (including Gemini and Cursor) MUST strictly adhere to these principles.

---

## 1. 🎯 ภารกิจหลักของโครงการ (Core Mission)

### เป้าหมาย (Goals)
* **เป้าหมาย:** พัฒนา Web Application เพื่อทดแทนกระบวนการขอใช้รถยนต์ด้วยเอกสารกระดาษ
* **วัตถุประสงค์:** ต้องลดขั้นตอน, เพิ่มประสิทธิภาพการจัดสรรทรัพยากร, และสร้างระบบที่โปร่งใสตรวจสอบได้
* **ภาษา:** โค้ดและ Comments ต้องเป็นภาษาอังกฤษ แต่ข้อความที่แสดงผลต่อผู้ใช้ (UI Text) ต้องเป็นภาษาไทย

**Goals:**
* **Primary Goal:** Develop a Web Application to replace paper-based vehicle booking processes
* **Objectives:** MUST reduce steps, increase resource allocation efficiency, and create a transparent, auditable system
* **Language Policy:** Code and comments MUST be in English, but user-facing text (UI Text) MUST be in Thai

---

## 2. 🏛️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack & Architecture)

AI Agent จะต้องยึดถือ Tech Stack นี้เป็นหลัก:

AI Agents MUST adhere to this tech stack:

* **Framework:** Next.js (เวอร์ชัน 14+ / App Router) - Next.js (version 14+ / App Router)
* **ภาษา:** TypeScript (ต้องมี Type-safe ที่รัดกุม) - TypeScript (MUST have strict type safety)
* **ฐานข้อมูล:** PostgreSQL (โฮสต์บน Supabase) - PostgreSQL (hosted on Supabase)
* **ORM:** Prisma (จะต้องใช้ `schema.prisma` เป็น Source of Truth สำหรับโครงสร้างข้อมูล) - Prisma (MUST use `schema.prisma` as Source of Truth for data structure)
* **การยืนยันตัวตน:** NextAuth.js (ใช้ Credentials Provider) - NextAuth.js (use Credentials Provider)
* **Styling:** TailwindCSS
* **การจัดการไฟล์:** การอัปโหลดไฟล์ (เช่น ลายเซ็น) จะถูกเก็บไว้ใน Local Storage ของเซิร์ฟเวอร์ (ไดเรกทอรี `public/uploads/`) - File Management: Uploaded files (e.g., signatures) MUST be stored in server Local Storage (directory `public/uploads/`)
* **การสร้าง PDF:** ใช้ `pdf-lib` ในการเติมข้อมูลลงใน PDF Template - PDF Generation: MUST use `pdf-lib` to fill data into PDF templates

---

## 3. 🔐 หลักการด้านความปลอดภัย (Security Principles) - (สำคัญสูงสุด / HIGHEST PRIORITY)

นี่คือข้อบังคับด้านความปลอดภัยที่ AI ต้องปฏิบัติตาม:

These are MANDATORY security principles that AI Agents MUST follow:

### Principle 1: Database Security (Row Level Security)
* **Database:** ฐานข้อมูล Supabase จะต้องถูกเปิดใช้งาน **Row Level Security (RLS)** ผู้ใช้จะต้องไม่สามารถเข้าถึงข้อมูลของผู้อื่นได้
* **Database:** Supabase database MUST have **Row Level Security (RLS)** enabled. Users MUST NOT be able to access other users' data.

### Principle 2: API Authorization (NON-NEGOTIABLE)
* **API Routes:** API Route ทุกเส้น (`src/app/api/**`) จะต้องมีการตรวจสอบสิทธิ์ (Authentication) และตรวจสอบบทบาท (Authorization) โดยใช้ `getServerSession` จาก NextAuth.js
* **API Routes:** All API routes (`src/app/api/**`) MUST validate authentication and authorization using `getServerSession` from NextAuth.js

### Principle 3: Input Validation (NON-NEGOTIABLE)
* **Input Validation:** ข้อมูลทั้งหมดที่รับมาจาก Client (เช่น `req.json()`) จะต้องถูกตรวจสอบความถูกต้อง (Validate) โดยใช้ **Zod** ก่อนนำไปประมวลผลหรือส่งเข้าฐานข้อมูล
* **Input Validation:** All data received from Client (e.g., `req.json()`) MUST be validated using **Zod** before processing or storing in database

### Principle 4: Deployment Security
* **Deployment:** การ Deploy ใช้งานจริงจะต้องอยู่ภายใต้ **Cloudflare** เพื่อใช้ WAF, DDoS Protection และ Rate Limiting
* **Deployment:** Production deployments MUST be under **Cloudflare** to utilize WAF, DDoS Protection, and Rate Limiting

---

## 4. 👥 หลักการด้าน Roles & Workflow

AI ต้องเข้าใจและปฏิบัติตามโครงสร้าง 4 Roles:

AI Agents MUST understand and follow the 4 Roles structure:

1. **Requester:** สร้างคำขอ (`PENDING`) - Creates booking requests (`PENDING`)
2. **Admin:** อนุมัติเบื้องต้น (`PENDING` -> `APPROVED`) - Initial approval (`PENDING` -> `APPROVED`)
3. **Executive:** ยืนยันขั้นสุดท้าย (`APPROVED` -> `CONFIRMED`) - Final confirmation (`APPROVED` -> `CONFIRMED`)
4. **Driver:** เริ่มและจบงาน (`CONFIRMED` -> `IN_PROGRESS` -> `COMPLETED`) - Starts and completes trips (`CONFIRMED` -> `IN_PROGRESS` -> `COMPLETED`)

### Sequential Approval Process (NON-NEGOTIABLE)
* กระบวนการอนุมัติจะต้องเป็นไปตามลำดับขั้น ห้ามข้ามขั้นตอน
* The approval process MUST follow sequential steps. Skipping steps is PROHIBITED.

**Valid State Transitions:**
* `PENDING` → `APPROVED` (Admin only)
* `APPROVED` → `CONFIRMED` (Executive only)
* `CONFIRMED` → `IN_PROGRESS` (Driver only)
* `IN_PROGRESS` → `COMPLETED` (Driver only)
* Any state → `REJECTED` (Admin or Executive)
* Any state → `CANCELLED` (Requester or Admin)

---

## 5. 💻 หลักการด้านการพัฒนา (Development Principles)

### I. Type-Safety First
* All code MUST be written in TypeScript with strict type checking enabled
* Type definitions MUST be explicit and avoid `any` types except where absolutely necessary (with justification)
* Prisma schema serves as the single source of truth for data models
* Type inference from Prisma models MUST be used rather than duplicating type definitions

**Rationale:** Type safety prevents runtime errors, improves developer experience through IDE autocomplete, and ensures data consistency across the application stack.

### II. Component-Based Architecture
* UI components MUST be built as reusable React components following Next.js App Router conventions
* Components MUST be organized by feature/domain in the `src/app` directory structure
* Server Components MUST be preferred over Client Components unless interactivity is required
* Shared components MUST be placed in appropriate shared directories

**Rationale:** Component-based architecture enables code reuse, maintainability, and aligns with Next.js best practices for server-side rendering and performance optimization.

### III. Code Quality & Testing
* All code MUST pass ESLint checks before commit
* Code reviews MUST verify compliance with this constitution
* Test coverage SHOULD be maintained for critical business logic, especially authentication, authorization, and booking workflows
* Integration tests MUST be written for API routes handling booking operations

**Rationale:** Code quality standards prevent bugs, maintain consistency, and ensure the application remains maintainable as it grows. Testing critical paths prevents regressions in core functionality.

### IV. User Experience & Accessibility
* UI components MUST be responsive and work on mobile, tablet, and desktop viewports
* Interactive elements MUST provide clear visual feedback
* Forms MUST include proper validation and error messages (in Thai for UI text)
* Color contrast MUST meet WCAG accessibility standards
* Loading states MUST be displayed for async operations

**Rationale:** A vehicle booking system serves users with varying technical expertise and devices. Accessibility and responsive design ensure the application is usable by all intended users.

---

## 6. 📋 หลักการด้านข้อมูล (Data Principles)

### Data Integrity & Migrations
* Database schema changes MUST be managed through Prisma migrations
* Migrations MUST be reviewed before application to production
* Database queries MUST use Prisma Client to ensure type safety and prevent SQL injection
* Transaction boundaries MUST be properly defined for operations affecting multiple records

**Rationale:** Prisma migrations provide version control for database schema, ensure consistency across environments, and prevent data loss during schema changes.

---

## 7. 🔄 กระบวนการพัฒนา (Development Workflow)

* Feature development MUST follow the specification → plan → tasks workflow defined in `.specify/templates/`
* Code changes MUST be reviewed through pull requests
* Constitution compliance MUST be verified during code review
* Breaking changes to database schema or API contracts MUST be documented and require explicit approval

---

## 8. 📜 การกำกับดูแล (Governance)

This constitution supersedes all other development practices and coding standards. Amendments to this constitution require:

1. Documentation of the proposed change and rationale
2. Review of impact on existing codebase and templates
3. Update to version number following semantic versioning (MAJOR.MINOR.PATCH)
4. Update of dependent templates and documentation

All pull requests MUST verify compliance with applicable principles. Violations of NON-NEGOTIABLE principles (marked explicitly) MUST be rejected unless accompanied by a documented exception with business justification.

**Version**: 1.1.0 | **Ratified**: 2025-11-06 | **Last Amended**: 2025-11-06
