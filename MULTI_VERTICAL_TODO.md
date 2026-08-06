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
- [x] **AI Orchestrator**: Added `property_inquiry` intent, lighter prompt context (~300-400 token savings/msg), disabled order placement in property mode, auto-move to Intake stage & ContactNote creation (Keep Contact Unassigned).
- [x] **Superadmin UI**: Added `isPropertyMode` checkbox and table mode badge in `/sp@dmin/settings/business-nature`.
- [x] **Tenant UI Adapter**: Adaptive `products/page.tsx` (Area, Bedrooms, Bathrooms, Gallery slider), `orders/page.tsx` ("Inquiries"), `ClientLayout.tsx` (Properties / Inquiries nav items).
- [x] **Team Role Notifications**: Send real-time property inquiry alerts to Sales Admins & Property Agents.
- [x] **Verification**: Unit tests 11/11 passed, frontend typecheck 0 errors, deployed to Live & Test servers.

### ✅ Vertical 2: Hospitality, Travel & Lifestyle (`isHospitalityMode`)
- [x] **Database Schema**: Added `BusinessNature.isHospitalityMode`. Executed `prisma db push`.
- [x] **Backend Services**: Updated `BusinessNatureService` & `Controller` with `isHospitalityMode` DTO pass-through.
- [x] **AI Orchestrator**: Added `room_booking_inquiry` intent & `interestedRoomName`. Branched `buildContextPrompt()` for Hotel Rooms (~300-400 token savings). Built `handleRoomBookingInquiry()` for auto-intake lead stage & ContactNote recording (Keep Contact Unassigned).
- [x] **Superadmin UI**: Added `🏨 Hospitality & Hotel Booking Mode` checkbox & table badge in `/sp@dmin/settings/business-nature`.
- [x] **Tenant UI Adapter**: Adaptive `products/page.tsx` ("Rooms & Suites", guest capacity, amenities checklist), `orders/page.tsx` ("Reservations"), `ClientLayout.tsx` ("Rooms & Suites" sidebar item & `Hotel` icon).
- [x] **Team Role Notifications**: Send real-time room reservation inquiry alerts to Front Desk & Reservation Desk.
- [x] **Verification**: Unit tests passed, NestJS build 0 errors, frontend typecheck 0 errors, deployed to Live.

---

## 🚀 UPCOMING VERTICALS (ACTIONABLE TODO)

---

### 🟣 Vertical 3: Technology & Software (`isTechSoftwareMode`)
- [ ] **Phase 3.1 Database & Superadmin Setup**:
  - [ ] Add `isTechSoftwareMode Boolean @default(false)` to `BusinessNature`.
  - [ ] Superadmin checkbox: `💻 Tech & Software Mode`.
  - [ ] Run `npx prisma db push`.
- [ ] **Phase 3.2 Backend & AI Orchestrator**:
  - [ ] Add `demo_request` / `software_inquiry` intent.
  - [ ] Branch `buildContextPrompt()`: `--- SOFTWARE & TECH PACKAGES ---` (Pricing Tiers, Feature list, Live Demo URL).
  - [ ] Implement `handleDemoRequest()`: Move contact to Qualified stage, create ContactNote with software module & team size (Keep Contact Unassigned).
- [ ] **Phase 3.3 Team Role Notification Alerts**:
  - [ ] Route software demo alerts & lead notifications to **Account Executives / Product Specialists**.
- [ ] **Phase 3.4 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Software & Plans", Tiers (Starter, Pro, Enterprise), Feature bullet builder, Live Demo link.
  - [ ] Adaptive `orders/page.tsx`: Title "Demo Requests" / "ডেমো রিকুয়েস্ট".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Software Plans`, Icon: `Cpu`.
- [ ] **Phase 3.5 Testing & Deployment**:
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
  - [ ] Implement `handleConsultationRequest()`: Record ContactNote with client requirements & document checklist (Keep Contact Unassigned).
- [ ] **Phase 4.3 Team Role Notification Alerts**:
  - [ ] Route consultation alerts to **Financial Advisors / Tax Consultants**.
- [ ] **Phase 4.4 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Service Packages", Fee, Scope of Work, Required Docs builder.
  - [ ] Adaptive `orders/page.tsx`: Title "Consultations" / "কন্সালটেন্সি".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Services`, Icon: `Briefcase`.
- [ ] **Phase 4.5 Testing & Deployment**:
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
  - [ ] Implement `handleDoctorAppointment()`: Record appointment note, notify clinic desk (Keep Contact Unassigned).
- [ ] **Phase 5.3 Team Role Notification Alerts**:
  - [ ] Route doctor appointment alerts & patient notes to **Clinic Receptionists / Medical Desk**.
- [ ] **Phase 5.4 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Doctors & Services", Specialization, Visiting Schedule, Fee.
  - [ ] Adaptive `orders/page.tsx`: Title "Appointments" / "অ্যাপয়েন্টমেন্ট".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Doctors & Services`, Icon: `Stethoscope`.
- [ ] **Phase 5.5 Testing & Deployment**:
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
  - [ ] Implement `handleCourseAdmissionInquiry()`: Move student lead to Admissions stage (Keep Contact Unassigned).
- [ ] **Phase 6.3 Team Role Notification Alerts**:
  - [ ] Route admission inquiry alerts to **Academic Counselors / Admission Desk**.
- [ ] **Phase 6.4 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Courses & Batches", Duration, Fee, Class Schedule, Syllabus PDF Link.
  - [ ] Adaptive `orders/page.tsx`: Title "Admissions" / "ভর্তি ইনকোয়ারি".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Courses`, Icon: `GraduationCap`.
- [ ] **Phase 6.5 Testing & Deployment**:
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
  - [ ] Implement `handleBulkRfqInquiry()`: Create B2B Lead Note with quantity requested & company details (Keep Contact Unassigned).
- [ ] **Phase 7.3 Team Role Notification Alerts**:
  - [ ] Route B2B bulk RFQ alerts to **Wholesale Sales Managers / Plant Managers**.
- [ ] **Phase 7.4 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Wholesale Products", MOQ, Tiered Bulk Pricing.
  - [ ] Adaptive `orders/page.tsx`: Title "RFQ / Quotations" / "কোটেশন রিকুয়েস্ট".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Wholesale Catalog`, Icon: `Factory`.
- [ ] **Phase 7.5 Testing & Deployment**:
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
- [ ] **Phase 8.3 Team Role Notification Alerts**:
  - [ ] Route parcel tracking & shipping inquiry alerts to **Logistics Dispatchers / Fleet Operations**.
- [ ] **Phase 8.4 Tenant UI Adaptation**:
  - [ ] Adaptive `products/page.tsx`: Title "Shipping Routes & Rates".
  - [ ] Adaptive `orders/page.tsx`: Title "Shipment Tracking".
  - [ ] Adaptive `ClientLayout.tsx`: Sidebar label `Routes & Rates`, Icon: `Truck`.
- [ ] **Phase 8.5 Testing & Deployment**:
  - [ ] Unit tests, TypeScript check, Git push & Deploy.

---

## 🌟 ADVANCED SYSTEM ENHANCEMENT BACKLOG (CROSS-VERTICAL FEATS)

> These enhanced capabilities can be optionally enabled for all verticals to provide enterprise-grade team productivity and analytics:

- [ ] **1. Vertical Knowledge Base Prompt Presets (QnA Starter Templates)**:
  - Automatically load pre-configured AI FAQ templates (e.g. Hotel Check-in Rules, Clinic Appointment Guidance, Real Estate Visit Booking) when a tenant selects their Business Nature.
- [ ] **2. Team Role Specialization Tagging (`/dashboard/settings/team`)**:
  - Allow Tenant Owners to assign employee tags (e.g. `Doctor Assistant`, `Property Agent`, `Account Executive`) to specific team members to refine alert notifications.
- [ ] **3. Dynamic Custom Attribute Builder UI**:
  - Provide a visual key-value field builder in `products/page.tsx` for custom vertical specs (e.g., Warranty, Batch No, Expiry Date).
- [ ] **4. Vertical Conversion Analytics Widget**:
  - Display Vertical-specific conversion metrics on Tenant Dashboard (e.g., *Inquiry to Visit Ratio*, *Room Reservation Rate*, *Demo Request Conversion*).

---

## 🛠️ Protocol for Marking a Vertical Complete

When a vertical is finished:
1. Update this file: Change `[ ]` to `[x]` for all finished sub-tasks.
2. Update the progress table at the top.
3. Update `project-context.md` with the accomplishment entry.
4. Push code to Git & deploy via MCP.
