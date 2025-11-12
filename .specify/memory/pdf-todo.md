# 📄 PDF Generation - TODO List

**Status**: ⚠️ Partially Implemented - Needs Completion  
**Last Updated**: 2025-11-06

---

## Current Implementation Status

### ✅ What's Done

- ✅ PDF generation API route exists: `src/app/api/bookings/[bookingId]/pdf/route.ts`
- ✅ Uses `pdf-lib` library correctly
- ✅ Has NextAuth.js authorization check (Executive only)
- ✅ Can load PDF template or create fallback PDF
- ✅ Can embed Executive signature image
- ✅ Can save PDF file
- ✅ Updates `booking.generatedFormUrl` in database
- ✅ PDF generation is triggered after Executive confirmation

### ⚠️ Issues Found

1. **Template Path Mismatch**
   - Current: `public/templates/booking-approval-template.pdf`
   - Required: `public/templates/booking-form.pdf` (per spec)
   - Action: Rename template file or update code

2. **Save Path Mismatch**
   - Current: `public/pdfs/` directory
   - Required: `public/uploads/pdfs/` (per spec)
   - Action: Update save path in code

3. **Missing Zod Validation**
   - Current: No input validation
   - Required: Zod schema validation (Constitution Principle 3)
   - Action: Add Zod validation for PDF generation request

4. **PDF Form Filling Issues**
   - Current: Hard-coded coordinates, may not match template structure
   - Required: Proper form field mapping or template-based filling
   - Action: Review template structure and adjust coordinates

5. **Missing startLocation Field**
   - Current: PDF doesn't show `startLocation` (departure location)
   - Required: Display `startLocation` in PDF (per spec)
   - Action: Add `startLocation` to Booking model and PDF display

6. **Error Handling**
   - Current: Basic error handling for signature embedding
   - Required: Better error messages and validation
   - Action: Improve error handling and user feedback

7. **UI Integration**
   - Current: PDF generation happens silently after confirmation
   - Required: UI to view/download generated PDF
   - Action: Add PDF download/view button in Executive pages

---

## TODO Tasks

### Priority 1: Critical Fixes

- [ ] **PDF-001**: Fix template path from `booking-approval-template.pdf` to `booking-form.pdf`
  - File: `src/app/api/bookings/[bookingId]/pdf/route.ts`
  - Line: 45
  - Change: `'booking-approval-template.pdf'` → `'booking-form.pdf'`

- [ ] **PDF-002**: Fix save path from `public/pdfs/` to `public/uploads/pdfs/`
  - File: `src/app/api/bookings/[bookingId]/pdf/route.ts`
  - Line: 265
  - Change: `join(process.cwd(), 'public', 'pdfs')` → `join(process.cwd(), 'public', 'uploads', 'pdfs')`

- [ ] **PDF-003**: Add Zod validation for PDF generation API route
  - File: `src/app/api/bookings/[bookingId]/pdf/route.ts`
  - Create: `src/lib/validation/pdf.ts` with Zod schema
  - Validate: bookingId format, Executive role

### Priority 2: Data & Template

- [ ] **PDF-004**: Add `startLocation` field to Booking model and display in PDF
  - File: `prisma/schema.prisma` (add `startLocation` field if missing)
  - File: `src/app/api/bookings/[bookingId]/pdf/route.ts`
  - Add: Display `startLocation` in PDF (departure location)

- [ ] **PDF-005**: Review and fix PDF template structure
  - Check: `public/templates/booking-form.pdf` exists and has correct form fields
  - Update: PDF form filling coordinates to match template
  - Test: PDF output matches expected format

### Priority 3: Error Handling & UX

- [ ] **PDF-006**: Improve error handling for signature image embedding
  - File: `src/app/api/bookings/[bookingId]/pdf/route.ts`
  - Add: Better error messages
  - Add: Validation for signature file format and size
  - Add: Fallback behavior if signature missing

- [ ] **PDF-007**: Add UI for PDF download/view in Executive pages
  - File: `src/app/executive/approvals/[bookingId]/page.tsx`
  - Add: Button to view/download generated PDF
  - Add: Display PDF URL if `generatedFormUrl` exists
  - Add: Link to PDF in `src/app/executive/history/page.tsx`

- [ ] **PDF-008**: Test end-to-end PDF generation
  - Test: PDF is generated correctly after Executive confirmation
  - Test: PDF URL is stored in `booking.generatedFormUrl`
  - Test: PDF can be downloaded and viewed
  - Test: PDF contains all required information
  - Test: PDF contains Executive signature

---

## Implementation Notes

### Template Path Issue

```typescript
// Current (WRONG):
const templatePath = join(process.cwd(), 'public', 'templates', 'booking-approval-template.pdf');

// Should be (CORRECT):
const templatePath = join(process.cwd(), 'public', 'templates', 'booking-form.pdf');
```

### Save Path Issue

```typescript
// Current (WRONG):
const pdfsDir = join(process.cwd(), 'public', 'pdfs');

// Should be (CORRECT):
const pdfsDir = join(process.cwd(), 'public', 'uploads', 'pdfs');
```

### Zod Validation Example

```typescript
// src/lib/validation/pdf.ts
import { z } from 'zod';

export const pdfGenerationSchema = z.object({
  bookingId: z.string().min(1),
});

// In route.ts:
import { pdfGenerationSchema } from '@/lib/validation/pdf';
const { bookingId } = pdfGenerationSchema.parse({ bookingId });
```

### PDF Display in UI

```typescript
// In Executive approval page:
{booking.generatedFormUrl && (
  <a 
    href={booking.generatedFormUrl} 
    target="_blank" 
    rel="noopener noreferrer"
    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    ดูเอกสาร PDF
  </a>
)}
```

---

## Testing Checklist

- [ ] PDF is generated when Executive confirms booking
- [ ] PDF template loads correctly from `public/templates/booking-form.pdf`
- [ ] PDF is saved to `public/uploads/pdfs/` directory
- [ ] PDF URL is stored in `booking.generatedFormUrl`
- [ ] PDF contains all booking information (requester, location, purpose, dates, vehicle, driver)
- [ ] PDF contains Executive signature image
- [ ] PDF can be downloaded from Executive UI
- [ ] Error handling works when template missing
- [ ] Error handling works when signature missing
- [ ] Zod validation rejects invalid requests

---

**Related Tasks**: T025 (Phase 4, J-05)

