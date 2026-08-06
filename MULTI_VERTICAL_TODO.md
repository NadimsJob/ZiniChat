# 📋 ZiniChat Multi-Vertical Implementation — Interactive Todo List

> **Living Task Board for ZiniChat Multi-Vertical System**  
> Use this checklist to pick, execute, test, and mark complete one vertical at a time.

---

## 🎯 Current Progress Summary

| Vertical Category | Superadmin Flag | Status | Progress |
| :--- | :--- | :--- | :--- |
| **1. Real Estate & Construction** | `isPropertyMode` | 🟢 **COMPLETED & LIVE** | [x] 100% |
| **2. Hospitality, Travel & Lifestyle** | `isHospitalityMode` | 🟢 **COMPLETED & LIVE** | [x] 100% |
| **3. Technology & Software** | `isTechSoftwareMode` | 🟡 **NEXT IN QUEUE** | [ ] 0% |
| **4. Financial & Professional** | `isFinancialServiceMode` | ⚪ BACKLOG | [ ] 0% |
| **5. Healthcare & Clinics** | `isHealthcareMode` | ⚪ BACKLOG | [ ] 0% |
| **6. Education & Academies** | `isEducationMode` | ⚪ BACKLOG | [ ] 0% |
| **7. Manufacturing & Industrial** | `isManufacturingMode` | ⚪ BACKLOG | [ ] 0% |
| **8. Logistics & Infrastructure** | `isLogisticsMode` | ⚪ BACKLOG | [ ] 0% |

---

## 🟢 COMPLETED VERTICALS

### ✅ Vertical 1: Real Estate & Construction (`isPropertyMode`)
- [x] **Database Schema**: Added `BusinessNature.isPropertyMode`, `Product.listingType`, `Product.images` (gallery array), `Product.location`. Ran `prisma db push`.
- [x] **Backend Services**: Updated `BusinessNatureService`, `ProductsService` (gallery upload `POST /products/:id/gallery` & delete `DELETE /products/:id/gallery/:index`).
- [x] **AI Orchestrator**: Added `property_inquiry` intent, lighter prompt context (~300-400 token savings/msg), disabled order placement in property mode, auto-move to Intake stage & ContactNote creation.
- [x] **Superadmin UI**: Added `isPropertyMode` checkbox and table mode badge in `/sp@dmin/settings/business-nature`.
- [x] **Tenant UI Adapter**: Adaptive `products/page.tsx` (Area, Bedrooms, Bathrooms, Gallery slider), `orders/page.tsx` ("Inquiries"), `ClientLayout.tsx` (Properties / Inquiries nav items).
- [x] **Verification**: Unit tests 11/11 passed, frontend typecheck 0 errors, deployed to Live & Test servers.

### ✅ Vertical 2: Hospitality, Travel & Lifestyle (`isHospitalityMode`)
- [x] **Database Schema**: Added `BusinessNature.isHospitalityMode`. Executed `prisma db push`.
- [x] **Backend Services**: Updated `BusinessNatureService` & `Controller` with `isHospitalityMode` DTO pass-through.
- [x] **AI Orchestrator**: Added `room_booking_inquiry` intent & `interestedRoomName`. Branched `buildContextPrompt()` for Hotel Rooms (~300-400 token savings). Built `handleRoomBookingInquiry()` for auto-intake lead stage & ContactNote recording.
- [x] **Superadmin UI**: Added `🏨 Hospitality & Hotel Booking Mode` checkbox & table badge in `/sp@dmin/settings/business-nature`.
- [x] **Tenant UI Adapter**: Adaptive `products/page.tsx` ("Rooms & Suites", guest capacity, amenities checklist), `orders/page.tsx` ("Reservations"), `ClientLayout.tsx` ("Rooms & Suites" sidebar item & `Hotel` icon).
- [x] **Verification**: Unit tests passed, NestJS build 0 errors, frontend typecheck 0 errors, deployed to Live.

---

## 🚀 UPCOMING VERTICALS (ACTIONABLE TODO)

---

### 🔵 Vertical 2: Hospitality, Travel & Lifestyle (`isHospitalityMode`)
- [ ] **Phase 2.1 Database & Superadmin Setup**:
  - [ ] Add `isHospitalityMode Boolean @default(false)` to `BusinessNature` model in `schema.prisma`.
  - [ ] Add `isHospitalityMode` checkbox & mode badge in `sp@dmin/settings/business-nature/page.tsx`.
  - [ ] Execute `npx prisma db push --accept-data-loss`.
- [ ] **Phase 2.2 Backend & Products Service**:
  - [ ] Pass `isHospitalityMode` through `BusinessNatureService` & `Controller`.
  - [ ] Standardize room attributes (`roomType`, `capacity`, `nightlyRate`, `amenities`, `bedType`).
- [ ] **Phase 2.3 AI Orchestrator & Token Optimization**:
  - [ ] Add `room_booking_inquiry` intent & `interestedRoomName` to `StructuredAiClassification`.
  - [ ] Branch `buildContextPrompt()` for `isHospitalityMode`: `--- HOTEL ROOMS & SUITES ---` (lighter context, disable order placement).
  - [ ] Implement `handleRoomBookingInquiry()`: Move contact to Intake stage, create ContactNote `[Hotel Booking Inquiry] ...`, notify admins.
- [ ] **Phase 2.4 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Rooms & Suites", Room Type (Deluxe, Suite, Standard), Capacity dropdown, Amenities checklist, Room Gallery slider.
  - [ ] Adaptive `orders/page.tsx`: Title "Reservations" / "রিজার্ভেশন".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Rooms & Suites`, Icon: `Hotel`.
- [ ] **Phase 2.5 Testing & Deployment**:
  - [ ] Write unit tests in `orchestrator.service.spec.ts` & `products.service.spec.ts`.
  - [ ] Run `npm run test` (Backend), `npm run build` (Backend), `npx tsc --noEmit` (Frontend).
  - [ ] Push to Git & Deploy to Live via MCP (`invoke-mcp.js`).

---

### 🟣 Vertical 3: Technology & Software (`isTechSoftwareMode`)
- [ ] **Phase 3.1 Database & Superadmin Setup**:
  - [ ] Add `isTechSoftwareMode Boolean @default(false)` to `BusinessNature`.
  - [ ] Superadmin checkbox: `💻 Tech & Software Mode`.
  - [ ] Run `npx prisma db push`.
- [ ] **Phase 3.2 Backend & AI Orchestrator**:
  - [ ] Add `demo_request` / `software_inquiry` intent.
  - [ ] Branch `buildContextPrompt()`: `--- SOFTWARE & TECH PACKAGES ---` (Pricing Tiers, Feature list, Live Demo URL).
  - [ ] Implement `handleDemoRequest()`: Move contact to Qualified stage, create ContactNote with software module & team size.
- [ ] **Phase 3.3 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Software & Plans", Tiers (Starter, Pro, Enterprise), Feature bullet builder, Live Demo link.
  - [ ] Adaptive `orders/page.tsx`: Title "Demo Requests" / "ডেমো রিকুয়েস্ট".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Software Plans`, Icon: `Cpu`.
- [ ] **Phase 3.4 Testing & Deployment**:
  - [ ] Unit tests, TypeScript check, Git push & Deploy.

---

### 🟢 Vertical 4: Financial & Professional Services (`isFinancialServiceMode`)
- [ ] **Phase 4.1 Database & Superadmin Setup**:
  - [ ] Add `isFinancialServiceMode Boolean @default(false)` to `BusinessNature`.
  - [ ] Superadmin checkbox: `💼 Financial & Consulting Mode`.
  - [ ] Run `npx prisma db push`.
- [ ] **Phase 4.2 Backend & AI Orchestrator**:
  - [ ] Add `consultation_request` intent.
  - [ ] Branch `buildContextPrompt()`: `--- SERVICE PACKAGES & CONSULTANCY ---` (Consultation Fee, Required Documents checklist).
  - [ ] Implement `handleConsultationRequest()`: Record ContactNote with client requirements & document checklist.
- [ ] **Phase 4.3 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Service Packages", Fee, Scope of Work, Required Docs builder.
  - [ ] Adaptive `orders/page.tsx`: Title "Consultations" / "কন্সালটেন্সি".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Services`, Icon: `Briefcase`.
- [ ] **Phase 4.4 Testing & Deployment**:
  - [ ] Unit tests, TypeScript check, Git push & Deploy.

---

### 🔴 Vertical 5: Healthcare & Clinics (`isHealthcareMode`)
- [ ] **Phase 5.1 Database & Superadmin Setup**:
  - [ ] Add `isHealthcareMode Boolean @default(false)` to `BusinessNature`.
  - [ ] Superadmin checkbox: `🩺 Healthcare & Clinic Mode`.
  - [ ] Run `npx prisma db push`.
- [ ] **Phase 5.2 Backend & AI Orchestrator**:
  - [ ] Add `doctor_appointment` intent.
  - [ ] Branch `buildContextPrompt()`: `--- DOCTORS & MEDICAL SERVICES ---` (Doctor Name, Specialization, Visiting Hours, Fee).
  - [ ] Implement `handleDoctorAppointment()`: Record appointment note, notify clinic desk.
- [ ] **Phase 5.3 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Doctors & Services", Specialization, Visiting Schedule, Fee.
  - [ ] Adaptive `orders/page.tsx`: Title "Appointments" / "অ্যাপয়েন্টমেন্ট".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Doctors & Services`, Icon: `Stethoscope`.
- [ ] **Phase 5.4 Testing & Deployment**:
  - [ ] Unit tests, TypeScript check, Git push & Deploy.

---

### 🟡 Vertical 6: Education & Academies (`isEducationMode`)
- [ ] **Phase 6.1 Database & Superadmin Setup**:
  - [ ] Add `isEducationMode Boolean @default(false)` to `BusinessNature`.
  - [ ] Superadmin checkbox: `🎓 Education & Course Mode`.
  - [ ] Run `npx prisma db push`.
- [ ] **Phase 6.2 Backend & AI Orchestrator**:
  - [ ] Add `course_admission_inquiry` intent.
  - [ ] Branch `buildContextPrompt()`: `--- COURSES & ACADEMIC PROGRAMS ---` (Course Fee, Duration, Batch Schedule, Syllabus Overview).
  - [ ] Implement `handleCourseAdmissionInquiry()`: Move student lead to Admissions stage.
- [ ] **Phase 6.3 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Courses & Batches", Duration, Fee, Class Schedule, Syllabus PDF Link.
  - [ ] Adaptive `orders/page.tsx`: Title "Admissions" / "ভর্তি ইনকোয়ারি".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Courses`, Icon: `GraduationCap`.
- [ ] **Phase 6.4 Testing & Deployment**:
  - [ ] Unit tests, TypeScript check, Git push & Deploy.

---

### 🟠 Vertical 7: Manufacturing & Industrial (`isManufacturingMode`)
- [ ] **Phase 7.1 Database & Superadmin Setup**:
  - [ ] Add `isManufacturingMode Boolean @default(false)` to `BusinessNature`.
  - [ ] Superadmin checkbox: `Factory B2B Bulk Quote Mode`.
  - [ ] Run `npx prisma db push`.
- [ ] **Phase 7.2 Backend & AI Orchestrator**:
  - [ ] Add `bulk_rfq_inquiry` intent.
  - [ ] Branch `buildContextPrompt()`: `--- B2B WHOLESALE PRODUCTS ---` (Unit Price, MOQ, Spec Sheet).
  - [ ] Implement `handleBulkRfqInquiry()`: Create B2B Lead Note with quantity requested & company details.
- [ ] **Phase 7.3 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Wholesale Products", MOQ, Tiered Bulk Pricing.
  - [ ] Adaptive `orders/page.tsx`: Title "RFQ / Quotations" / "কোটেশন রিকুয়েস্ট".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Wholesale Catalog`, Icon: `Factory`.
- [ ] **Phase 7.4 Testing & Deployment**:
  - [ ] Unit tests, TypeScript check, Git push & Deploy.

---

### 🔵 Vertical 8: Logistics & Infrastructure (`isLogisticsMode`)
- [ ] **Phase 8.1 Database & Superadmin Setup**:
  - [ ] Add `isLogisticsMode Boolean @default(false)` to `BusinessNature`.
  - [ ] Superadmin checkbox: `Truck Shipping & Logistics Mode`.
  - [ ] Run `npx prisma db push`.
- [ ] **Phase 8.2 Backend & AI Orchestrator**:
  - [ ] Add `parcel_tracking_inquiry` intent.
  - [ ] Branch `buildContextPrompt()`: `--- SHIPPING SERVICES & RATES ---` (Route Rates, Weight Charges, Tracking Guide).
- [ ] **Phase 8.3 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Shipping Routes & Rates".
  - [ ] Adaptive `orders/page.tsx`: Title "Shipment Tracking".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Routes & Rates`, Icon: `Truck`.
- [ ] **Phase 8.4 Testing & Deployment**:
  - [ ] Unit tests, TypeScript check, Git push & Deploy.

---

## 🛠️ Protocol for Marking a Vertical Complete

When a vertical is finished:
1. Update this file: Change `[ ]` to `[x]` for all finished sub-tasks.
2. Update the progress table at the top.
3. Update `project-context.md` with the accomplishment entry.
4. Push code to Git & deploy via MCP.
