# Project Context & Developer Log

This file serves as the living memory and source of truth for the **Omnichannel AI Business Assistant Platform**. Every AI agent or developer working on this project must read this file at the start of a task and update it immediately after any architecture changes, feature implementations, or major updates.

---

## 1. Project Overview
A multi-tenant SaaS platform enabling businesses (tenants) to manage customer communication via a unified inbox and self-serve AI Assistants across WhatsApp (Cloud API & Web Baileys), Meta Messenger, Instagram DM, and Web Chat.
* **Primary Architecture Spec**: [full-platform-architecture-v3.md](file:///d:/ZiniChat/full-platform-architecture-v3.md) (v4 Final Production Certified)

---

## 2. Tech Stack & Environment
* **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS (Unified Dark Glassmorphism Theme `#1F824A` & `#EE8D27`)
* **Backend**: Node.js + NestJS (Modular Monolith)
* **Database**: PostgreSQL with `pgvector` extension (HNSW index optimized) + Prisma ORM
* **Queue/Cache**: Redis + BullMQ
* **Realtime**: Socket.io (namespaces for `/inbox` and `/notifications`)
* **AI Layer**: OpenAI, Anthropic Claude, & Google Gemini SDKs (BYOK & Platform-key mode)
* **Deployment**: Docker Compose + Traefik Reverse Proxy + SSL certificates (Live: `zinichat.com`, Staging: `test.zinichat.com`)

---

## 3. Current Status & Active Focus
- **Current Status**: **100% PRODUCTION READY & CERTIFIED — Complete Code & Security Audit Remediation Applied**
- **Active Focus**: Live deployment via MCP server deployment pipeline (`scripts/invoke-mcp.js`).
- **Core Architecture & Ecosystem Highlights**:
  - **Internal 3 AI Agent Classification (Context Parity)**:
    1. **Inbox Agent** (`OrchestratorService` & `AiService`): Live customer AI across WhatsApp, Messenger, Instagram, Web Chat.
    2. **Simulator Agent** (`AiTrainingService.testSimulate`): AI Training Live Test Simulator inside merchant dashboard.
    3. **ZiniChat Support Agent** (`SupportChatService`): Platform-wide customer support & onboarding AI assistant.
    - *Catalog Parity*: All 3 Agents access tenant-scoped product catalog (standard fields + 100% custom attributes in `Product.attributes`) across all 8 business verticals + retail.
  - **8-Vertical Multi-Industry Adaptation**: Retail + 8 vertical modes (`isPropertyMode`, `isHospitalityMode`, `isTechSoftwareMode`, `isFinancialServiceMode`, `isHealthcareMode`, `isEducationMode`, `isManufacturingMode`, `isLogisticsMode`). Includes specialized team routing (`User.specializationTags`), vertical presets, custom attributes, and conversion analytics.
  - **Security & Audit Remediation**: HMAC signature validation, zero plain-text password leakage, tenant-scoped price/stock verification, AES-256-CBC encryption at rest, DTO validation pipes.

---

## 4. Implementation History Log

| Date | Feature / Task Summary | Key Files Modified | Details & Outcome |
| :--- | :--- | :--- | :--- |
| **2026-09-09** | **Live Server Package Settings Template Sync** | `scripts/sync-live-plans.js`, `project-context.md` | Inspected live DB via SSH; executed `sync-live-plans.js` to sync `Free` plan's 25-feature array and limits to `Starter`, `Growth`, and `Scale` plans. |
| **2026-09-09** | **High-Professional SEO Implementation for Worldwide Launch** | `next.config.ts`, `robots.ts`, `sitemap.ts`, `llms.txt`, `JsonLd.tsx`, `layout.tsx`, marketing pages, `opengraph-image.tsx` | Added compression/security headers, created `robots.ts`, `sitemap.ts`, `llms.txt`, per-page JSON-LD schemas (`Organization`, `SoftwareApplication`, etc.), and dynamic OpenGraph 1200x630 banner. |
| **2026-09-09** | **Price-Wise Plan Sorting, Currency Control (`$`/`৳`) & 4-Card Layout** | `PricingSection.tsx`, `pricing/page.tsx` | Sorted plans by numeric price & tier sequence (`Free` -> `Starter` -> `Growth` -> `Scale`), enforced strict currency switcher ($/৳), and updated layout grid to 4 side-by-side cards. |
| **2026-09-09** | **Weekly Billing Tab UX Optimization & Free Plan Trial Badge** | `PricingSection.tsx`, `pricing/page.tsx` | Dynamically hide Weekly tab if paid plans lack weekly billing, added "1-Week Free Trial" badge on Free plan card, auto-fallback to monthly view. |
| **2026-09-09** | **Outbound-Only Message Quota Tooltip Fix & Live MCP Deployment** | `PricingSection.tsx`, `pricing/page.tsx` | Clarified tooltip text to state outbound replies count towards quota while inbound customer messages are unlimited. Built, committed, and deployed live. |
| **2026-09-09** | **Yearly Sub-Period Quota Reset Engine, Usage Progress Bars & Badges** | `billing.service.ts`, `payments.service.ts`, `mfs-payments.service.ts`, `subscription/page.tsx`, `billing-history/page.tsx` | Built yearly sub-period 30-day quota reset slice for yearly plans, dynamic cycle math (365/30/7 days), usage progress bars, monthly quota reset date banners, and billing cycle badges. |
| **2026-09-09** | **Dynamic Info Tooltips for Top 3 Plan Features** | `PricingSection.tsx`, `pricing/page.tsx` | Added `lucide-react` `Info` hover tooltips with bilingual explanations for Team Members, Messages/mo, and AI Responses/mo. |
| **2026-09-09** | **Tenant Panel Pre-Live Audit & Hardening** | `quota.service.ts`, `billing.service.ts`, `subscription.guard.ts`, auth services | Updated 8 backend files to check `status: { in: ['active', 'trialing'] }`, fixed channel quota count filters (`status: active/connected`), and resolved effective team seat limits. Passed 70/70 test suites. |
| **2026-09-09** | **Bangla QR Dynamic EMVCo Checkout & Superadmin Client Brands Showcase** | `schema.prisma`, `client-brands.*`, `mfs-payments.*`, `sp@dmin/settings/client-brands/page.tsx`, `(marketing)/page.tsx` | Added EMVCo Bangla QR generator with Tag 63 Hex CRC-16, built Superadmin Client Brands CRUD & logo upload module, and updated landing page client brand marquee. |
| **2026-09-09** | **Official Meta Integrated Platform Showcase & Badges** | `MetaIntegrationSection.tsx`, `(marketing)/page.tsx`, `success-stories/page.tsx` | Created `MetaIntegrationSection` showcasing Meta Cloud/DM API compliance, 100% account safety, green tick readiness, and embedded in landing and success stories pages. |
| **2026-09-09** | **Free Plan One-Time Enforcement, Weekly Billing Engine & Superadmin Extension** | `schema.prisma`, `auth.service.ts`, `payments.service.ts`, `billing.service.ts`, `sp@dmin/packages/page.tsx`, `sp@dmin/billing/page.tsx` | Added `hasUsedFreePlan` to prevent free plan abuse, added configurable `allowWeekly` & `priceWeeklyBdt` to `Plan`, auto-assigned 7-day duration on signup, and added Superadmin subscription extension modal (+7/+14/+30/+90 days). |
| **2026-09-09** | **Superadmin Left Menu Instant Loading Fix & Navigation Token Sync** | `sp@dmin/ClientLayout.tsx`, `sp@dmin/login/page.tsx` | Re-evaluated JWT `access_token` and permissions on pathname changes, and used full-page redirect upon login to ensure immediate sidebar menu render. |
| **2026-08-31** | **Tenant Dashboard Client Runtime Error Fix & Error Boundary Integration** | `dashboard/page.tsx`, `SetupJourneyWidget.tsx`, `dashboard/error.tsx` | Added array/string type guards across stats and widgets, wrapped `localStorage` in try/catch, and integrated Next.js `error.tsx` error boundary. |
| **2026-08-31** | **Product Price Optional Across All Verticals & "Price on Call" UI** | `products/page.tsx` | Made price inputs optional across all 8 verticals, handled empty submissions safely, and rendered italicized "Price on Call / আলোচনা সাপেক্ষে" fallback. |
| **2026-08-31** | **Comprehensive 2px Vibrant Outlines Across All Dashboard Boxes** | `dashboard/page.tsx` | Applied 2px color-tinted outlines (`border-2`) across all dashboard cards/boxes, expanded grid for 5 KPI cards. Deployed live. |
| **2026-08-31** | **Light Mode Contrast Overhaul & Webhook Cards & AUTOMATION Sidebar** | `ClientLayout.tsx`, `inboxes/new/page.tsx` | Fixed dark mode text classes for light mode, added copyable webhook credentials cards for Messenger/WA/IG, renamed sidebar group to AUTOMATION with soft green glass background. |
| **2026-08-31** | **Meta App Review Screencast & Inbox Profile Picture Rendering** | auth services, `inbox.service.ts`, `inboxes/page.tsx` | Added visual cards with original Facebook/Instagram page profile pictures, enhanced setup guide, and deployed live via MCP. |
| **2026-08-21** | **Unverified User Re-Signup & Login OTP Recovery & Endpoint Fix** | `auth.service.ts`, `auth.controller.ts`, `signup/page.tsx`, `login/page.tsx` | Added missing `@Post('verify-otp')` and `resend-otp` endpoints, updated unverified re-signup to send fresh OTP instead of blocking, and clarified 15-min expiration label. |
| **2026-08-21** | **Email Flow Separation, HTML Template Sanitization & Business Nature** | `auth.service.ts`, `smtp.service.ts`, `business-nature.service.ts`, `signup/page.tsx` | Separated OTP email (sent on signup) from welcome email (sent post-OTP verification), created high-impact HTML OTP email template, and sorted "Others" business nature to last. |
| **2026-08-21** | **Strict Language Localization, Country Database & Blank Default** | `countryData.ts`, `signup/page.tsx`, `login/page.tsx`, `onboarding/page.tsx` | Enforced strict `useLanguage()` localization across auth forms, expanded world country list (120+ A-Z), and set country dropdown to blank default. |
| **2026-08-21** | **Google Auth Button Alignment & Mobile Width Fix** | `signup/page.tsx`, `login/page.tsx` | Centered Google Sign-In button and applied dynamic responsive width `Math.max(200, Math.min(availableWidth, 380))` for mobile screens. |
| **2026-08-21** | **Country Selection & Auto Phone Prefix, Locked Profile Country & Setup Banner** | `schema.prisma`, `countryData.ts`, `tenants.controller.ts`, `SetupJourneyWidget.tsx` | Added `country` to `Tenant`, updated auto-dial code prefixing, added locked country display in user profile with Superadmin edit endpoint, and made 3-step setup banner persistent until complete. |
| **2026-08-21** | **Signup Form 6-Digit Email OTP Flow & Blank Business Nature Default** | `auth.dto.ts`, `auth.service.ts`, `auth.controller.ts`, `signup/page.tsx` | Enforced blank business nature default, built 6-digit OTP verification flow with 15-min expiration and resend countdown timer (60s). |
| **2026-08-21** | **Signup Form DTO Whitelist Fix, Password Eye Toggle & Onboarding Fields** | `auth.dto.ts`, `auth.service.ts`, `signup/page.tsx` | Added missing fields (`fullName`, `brandName`, `address`, etc.) to `SignupDto` fixing NestJS ValidationPipe errors, added password visibility eye toggles, and unified onboarding fields. |
| **2026-08-19** | **Universal Voice/Audio Transcription (Whisper & Groq Free Tier, Storage & Superadmin UI)** | `ai.service.ts`, `inbox.service.ts`, `whatsapp-web.service.ts`, `sp@dmin/settings/ai/page.tsx` | Built voice transcription using free Groq Whisper (`whisper-large-v3`, 7,000 req/day) with OpenAI fallback, skipped Whisper if AI auto-reply disabled, tracked storage usage, and updated Superadmin AI UI. Passed 62 unit tests. |
| **2026-08-18** | **Superadmin Tenant Report Link Logout Bug Fix** | `middleware.ts`, `tenants.controller.ts` | Fixed base64url decoding in `middleware.ts` to replace `-`/`_` and pad `=`, preventing `DOMException` from logging out Superadmins when clicking Tenant Report links. |
| **2026-08-18** | **Superadmin Universal Pagination & Standardized Loading States (`AdminLoader`)** | `AdminPagination.tsx`, `AdminLoader.tsx`, `sp@dmin/*` | Built reusable `AdminPagination` with page size selection (`10`, `20`, `50`, `100`) and dual-theme `AdminLoader` skeleton across all 15 Superadmin list pages. |
| **2026-08-18** | **Superadmin Light Mode Font & Contrast Audit & Dual-Theme Fix** | `sp@dmin/*` list pages | Replaced hardcoded dark classes with adaptive Tailwind pairs (`text-slate-900 dark:text-zinc-100`, `bg-white dark:bg-surface`) across tables, headers, and modals on all Superadmin pages. |
| **2026-08-18** | **Superadmin Team Granular Access Permissions & Working Checkboxes** | `sp@dmin/team/page.tsx`, `ClientLayout.tsx`, `permissions.guard.ts` | Replaced div toggles with standard checkboxes for 20+ granular permissions in 6 categories, and aligned backend `PermissionsGuard` and sidebar checks. |
| **2026-08-18** | **Superadmin Dashboard Platform Overview Data & Mobile Optimization** | `stats.service.ts`, `sp@dmin/page.tsx` | Added `pendingPaymentsCount`/`monthAiResponses` metrics, pending payment banner, tenant health widget (4 metrics), interactive card links, and responsive grid layouts. |
| **2026-08-18** | **Superadmin Billing & Subscriptions Financial Operations Overhaul** | `billing.service.ts`, `sp@dmin/billing/page.tsx` | Added MRR, Total Collected, Pending Collections, and Expiring Soon KPI widgets, filter tabs, live search, and transaction history ledger tab. |
| **2026-08-18** | **Superadmin Pending Payment Approval Confirmation Modal** | `sp@dmin/payments/page.tsx` | Added double-confirmation modal displaying Tenant Name, Plan Name, BDT Amount, and TrxID before activating pending manual payments. |
| **2026-08-18** | **Tenant Report Support Tickets, Support AI Chats & Interactive Link Cards** | `tenants.service.ts`, `sp@dmin/tenants/[id]/page.tsx` | Added total support tickets and AI support widget sessions metrics, and converted summary cards into interactive deep links to Superadmin pages. |
| **2026-08-18** | **Tenant Report AI Response Label, AI Tokens Used & Ecosystem Summary** | `tenants.service.ts`, `sp@dmin/tenants/[id]/page.tsx` | Renamed label to "AI Response", added aggregate LLM token consumption (`tokensUsed`), and expanded ecosystem widget to 6 metrics (members, channels, products, leads, FAQs, crawls). |
| **2026-08-18** | **Superadmin Tenant Impersonation Fix & Exit Banner Integration** | `sp@dmin/tenants/page.tsx`, `sp@dmin/impersonate/page.tsx`, `ClientLayout.tsx` | Fixed middleware redirect by setting `user_role` cookie during impersonation, and added floating "Exit Workspace" banner in tenant workspace layout. |
| **2026-08-18** | **Marketing Header Navbar & Mobile Menu Home Button Integration** | `layout.tsx` (marketing) | Added explicit "Home / হোম" link button to desktop navigation bar and mobile dropdown menu. |
| **2026-08-18** | **ZiniChat 17 Unique Selling Points (USP) Integration** | `landing-page.service.ts`, `InteractiveFeatureTabs.tsx`, `features/page.tsx`, `page.tsx` | Updated features/FAQs JSON with 13 rich features and 16 bilingual Q&As, added interactive feature mockups (RAG, Multi-Vertical, MFS, BYOK), and updated homepage hero stats. |
| **2026-08-17** | **Message & AI Quota Warnings (80% & 100% Alerts, Resets, Emails & Banners)** | `schema.prisma`, `quota.service.ts`, `smtp.service.ts`, `billing.service.ts`, `ClientLayout.tsx` | Added notification flags to `Tenant`, created 4 customizable SMTP templates, and added amber/red floating warning banners at >=80% and >=100% usage. |
| **2026-08-17** | **Storage Quota Warnings (80% & 100% Full Notifications & Layout Banner)** | `schema.prisma`, `quota.service.ts`, `smtp.service.ts`, `ClientLayout.tsx` | Added storage warning flags, customizable email templates, and dashboard warning/block banners. Passed 32 unit tests. |
| **2026-08-17** | **New Success Stories Page with 6 Industry Modeled Results** | `ResultsSection.tsx`, `success-stories/page.tsx` | Built ROI success stories page with top-stat bar, F-Commerce case study, and 6 industry modeled scenarios (Fashion, Restaurant, Real Estate, Diagnostics, Wholesale, Logistics). |
| **2026-08-17** | **Secure Login Logging & Retention System (90-day TTL, Superadmin-only)** | `schema.prisma`, `login-logs.*`, `security-logs/page.tsx` | Created `login_logs` table capturing client IP, user-agent, location, status, fail reason; added non-blocking async logging, 90-day auto-purge cron, and Superadmin UI. |
| **2026-08-17** | **Geolocation Language & Currency Auto-Detection** | `LanguageProvider.tsx`, `CurrencyProvider.tsx` | Auto-detects BD IP/timezone -> Bengali (`bn`) & BDT (`৳`); Non-BD IP -> English (`en`) & USD (`$`), with `localStorage` preference fallback. |
| **2026-08-17** | **Bengali Typography Upgrade: Noto Sans Bengali Integration** | `layout.tsx`, `globals.css` | Integrated `Noto_Sans_Bengali` font across system to eliminate Bengali glyph distortion on characters like 'এ', 'এক', 'এআই'. |
| **2026-08-17** | **CSV Contact Import, Sample Format Download & 4-Step Guidelines** | `contacts.service.ts`, `contacts.controller.ts`, `broadcasts/page.tsx` | Built sample CSV downloader, bulk contact importer with phone normalizer (Bengali digits `০-৯` to `+8801`), drag-and-drop modal, and 4-step guideline banner. |
| **2026-08-17** | **Meta WhatsApp Cloud API v25.0 Marketing Messages API & Fallback** | `whatsapp.processor.ts` | Routed marketing templates to `POST /v25.0/{phone-number-id}/marketing_messages` with automatic fallback to standard `/messages` endpoint on permission error. |
| **2026-08-17** | **Support Ticket Real-time Reply Notifications & Sidebar Badges** | `tickets.service.ts`, `notifications.service.ts`, `NotificationBell.tsx`, `ClientLayout.tsx` | Added ticket socket notifications, real-time toast alerts on new replies, and red unread counter badges on sidebar menu items. |
| **2026-08-17** | **AI Phone Number Auto-Extraction & Multilingual Digit Converter** | `inbox.service.ts` | Built `extractPhoneFromText` supporting English/Bengali digits (`০-৯`), hyphens, and `+8801` prefixes; updates contact phone and emits WebSocket events in real-time. |
| **2026-08-17** | **Meta Profile Sync, Real-time Outbound AI DM Broadcast & Contact Cleanup** | `inbox.service.ts`, `inbox/page.tsx` | Broadcasts outbound AI DM `new_message` events in real-time, syncs customer names from Meta Graph API, and separates phone numbers from external PSID/IGSID IDs. |
| **2026-08-17** | **FB Comments Lead CRM Box, Unread Notification Badge & Private DM Sync** | `inbox/page.tsx`, `facebook-comments.service.ts` | Added unread badge counter on FB Comments filter tab, rendered right-side lead CRM sidebar, synced private comment DMs into Messenger inbox, and handled test payloads. |
| **2026-08-17** | **Facebook Page Comment Automation & Webhook Subscription Fix** | `instagram-auth.service.ts`, `messenger-auth.service.ts`, `facebook-comments.service.ts` | Removed invalid parameter `instagram_messaging_seen`, fixed channel connection lookup queries using `OR: [{ externalAccountId }, { verifyToken }]`, and enabled comment auto-reply by default. |
| **2026-08-17** | **Instagram DM Reply Endpoint & Page Token Fix** | `messenger.processor.ts`, `instagram-auth.service.ts` | Fixed Instagram DM delivery by targeting `POST /{PAGE_ID}/messages` endpoint (using stored Page Access Token in `accessTokenEncrypted`) instead of IG user ID endpoint. |
| **2026-08-17** | **Product Dynamic Search Schema Field Fix & Defensive Error Guards** | `ai.service.ts` | Replaced invalid `category` field in `Product.findMany` with valid fields (`name`, `sku`, `description`, `location`), and wrapped RAG search methods in try/catch. |
| **2026-08-17** | **Website Data Fetch & AI Training Tool (2 Quota Deduction & Confirmation Modal)** | `schema.prisma`, `website-crawler.service.ts`, `ai-training.service.ts`, `orchestrator.service.ts` | Built recursive website HTML text crawler (up to 12 pages, 25k chars limit), generated structured summary via LLM, deducted 2 AI Response credits, injected into system prompt, and added confirmation modal. |
| **2026-08-17** | **AI Token Optimization, Prompt Caching Architecture & Dynamic Tool Indexing** | `ai.service.ts`, `orchestrator.service.ts` | Restructured system prompts into Static Header (placed at top for 100% prompt cache hits) and Dynamic Footer (at bottom). Built Stage 0 indexing (`searchRelevantProducts`, `searchRelevantQnas`, max 5) and skipped vector search on generic greetings ("hi", "salam"). |
| **2026-08-17** | **Quota Carry Forward Engine & Homepage FAQ Update** | `schema.prisma`, `billing.service.ts`, `payments.service.ts`, `subscription/page.tsx` | Added `carriedForwardAiQuota` and `carriedForwardMessageQuota` to `Subscription`. Unused quotas on paid plan renewals now carry forward to next period. |
| **2026-08-16** | **Facebook Comments Live Inbox Multi-Reply & Socket Thread System** | `schema.prisma`, `facebook-comments.service.ts`, `inbox/page.tsx` | Added `replyHistory` JSON field, broadcast real-time `facebook_comment` socket events, supported public/private/both human multi-reply modes, and rendered chat thread view. |
| **2026-08-16** | **Full System Audit & Mobile Viewport / Feature Lock Hardening** | `ClientLayout.tsx`, `ai-training/page.tsx`, `team/page.tsx`, `whatsapp-web.service.spec.ts` | Unlocked Channel Integration menu for all tenants, added `max-h-[90vh]` modal scroll bounds, and verified 100% test pass rate across 68 backend test suites (505 tests). |
| **2026-08-11** | **Superadmin Tenant Impersonation System ("Enter Tenant Panel")** | `tenants.service.ts`, `sp@dmin/tenants/page.tsx`, `sp@dmin/impersonate/page.tsx` | Built silent Superadmin impersonation feature generating 2-hour JWTs, logging `SUPERADMIN_IMPERSONATED_TENANT` to `audit_logs`, and opening tenant workspace in new tab. |
| **2026-08-11** | **Support AI Prompt Caching Fix — Vertical-Aware Per-Vertical Cache** | `support-chat.service.ts`, `ai-cache.service.ts` | Fixed 3 Support AI cache bugs, creating vertical-aware system prompt cache keys across Gemini & OpenAI to reduce per-message token costs by ~78%. |
| **2026-08-11** | **Business Nature-Aware Support AI Training** | `support-chat.service.ts` | Added vertical-specific terminology context blocks (`resolveBusinessNatureContext`) across all 9 verticals + retail for ZiniChat Support AI. |
| **2026-08-10** | **Vector Embedding Dimension Mismatch Fix (768-dim Gemini Embeddings)** | `schema.prisma`, `ai.service.ts`, `ai-training.service.ts` | Updated `KnowledgeChunk.embedding` from `vector(1536)` to `vector(768)` (Gemini `text-embedding-004`), recreated HNSW index, and updated embedding generation. |
| **2026-08-10** | **TrxID Case Sensitivity & Trimming Fix for MFS Payments** | `mfs-payments.service.ts`, `SmsReceiver.kt` | Changed TrxID verification lookup to case-insensitive `findFirst({ trxId: { equals, mode: 'insensitive' } })` and trimmed whitespace. |
| **2026-08-10** | **Subscription & Quota Guards on Background AI Webhook Handlers** | `quota.service.ts`, `orchestrator.service.ts` | Added `isTenantSubscriptionActive` guard in `OrchestratorService` to drop incoming webhook messages silently for expired/suspended tenants. |
| **2026-08-10** | **API Throttling & Infinite Bot Loop Prevention** | `app.module.ts`, `inbox.service.ts` | Configured NestJS throttler (100 req/min global, 300 req/min webhooks) and built `checkBotLoopSafeguard` (disables AI auto-reply if 5 AI messages sent in 30s). |
| **2026-08-10** | **Offline Local Buffering for Android SMS Gateway** | `SmsBufferManager.kt`, `PendingSmsSyncWorker.kt` | Added WorkManager `PendingSmsSyncWorker` to buffer un-synced MFS SMS in SharedPreferences when offline and auto-flush to webhook on reconnect. |
| **2026-08-10** | **Baileys Auto-Reconnect & Socket Cleanup** | `whatsapp-web.service.ts` | Built exponential backoff reconnect strategy (up to 5 attempts), halted loops on code 440/409 socket conflicts, and dispatched socket drop alerts to admins. |
| **2026-08-06** | **ZiniChat Multi-Vertical 8: Logistics & Infrastructure (`isLogisticsMode`)** | `schema.prisma`, `orchestrator.service.ts`, `products/page.tsx`, `orders/page.tsx` | Implemented logistics mode (`shipment_quote_request` intent, route pricing, fleet capacity, "Shipments & Bookings" orders label, `Truck` icon). |
| **2026-08-06** | **ZiniChat Multi-Vertical 7: Manufacturing & Industrial (`isManufacturingMode`)** | `schema.prisma`, `orchestrator.service.ts`, `products/page.tsx`, `orders/page.tsx` | Implemented manufacturing mode (`bulk_rfq_inquiry` intent, MOQ, wholesale pricing, "RFQ / Quotations" orders label, `Factory` icon). |
| **2026-08-06** | **ZiniChat Multi-Vertical 6: Education & Academies (`isEducationMode`)** | `schema.prisma`, `orchestrator.service.ts`, `products/page.tsx`, `orders/page.tsx` | Implemented education mode (`course_admission_inquiry` intent, course duration/schedule, "Admissions" orders label, `GraduationCap` icon). |
| **2026-08-06** | **ZiniChat Multi-Vertical 5: Healthcare & Clinics (`isHealthcareMode`)** | `schema.prisma`, `orchestrator.service.ts`, `products/page.tsx`, `orders/page.tsx` | Implemented healthcare mode (`appointment_request` intent, doctor visiting hours/fees, "Appointments" orders label, `Stethoscope` icon). |
| **2026-08-06** | **ZiniChat Multi-Vertical 4: Financial Services (`isFinancialServiceMode`)** | `schema.prisma`, `orchestrator.service.ts`, `products/page.tsx`, `orders/page.tsx` | Implemented financial mode (`consultation_request` intent, service package fees, "Consultations" orders label, `Briefcase` icon). |
| **2026-08-06** | **ZiniChat Multi-Vertical 3: Technology & Software (`isTechSoftwareMode`)** | `schema.prisma`, `orchestrator.service.ts`, `products/page.tsx`, `orders/page.tsx` | Implemented tech mode (`demo_request` intent, software tiers/demo links, "Demo Requests" orders label, `Cpu` icon). |
| **2026-08-06** | **Superadmin Login Route Obfuscation to `/sp@dmin`** | `middleware.ts`, `sp@dmin/*` | Renamed superadmin routes from `/superadmin` to `/sp@dmin` for security obfuscation. |
| **2026-08-04** | **Facebook Comment Automation (Public/Private AI Replies & Config Modal)** | `schema.prisma`, `facebook-comments.service.ts`, `CommentConfigModal.tsx` | Built comment auto-reply engine (public/private/both modes, rate limiting, keyword filters, credit deduction safety) and dark glassmorphic config modal. |
| **2026-08-04** | **Meta Pixel & CAPI Parameter Builder + Google Analytics 4 Integration** | `meta-pixel.*`, `google-analytics.*`, `acquisition/track` | Added `fbc`/`referrerUrl` support to Meta CAPI, created public GA4 config endpoint, fixed GA `client_id` session consistency, and passed all test suites. |
| **2026-08-03** | **Password Reset Email Dispatch & Case-Insensitive Lookup** | `auth.service.ts`, `smtp.service.ts` | Fixed forgot-password email delivery with case-insensitive search (`mode: 'insensitive'`), synchronous direct mail dispatch, and frontend URL resolution. |
| **2026-08-03** | **PWA Push Notifications & Installation Banner** | `push-notification.service.ts`, `sw.js`, `PwaInstallBanner.tsx` | Added PWA manifest, install banner, VAPID Web Push notifications (AES payload encryption), service worker registration, and profile push settings toggle. |
| **2026-07-31** | **Smart Storage Manager & VPS Disk Unlinking** | `storage.service.ts`, `storage/page.tsx` | Built 4-category storage API breakdown, physical VPS disk unlinking (`fs.promises.unlink`), progress bar UI, and 30d/90d cleanup actions. |
| **2026-07-31** | **Strict Anti-Hallucination Guardrails & AI Safety Pipeline** | `orchestrator.service.ts`, `ai-training.service.ts` | Increased confidence threshold to 0.8, added 60-day document freshness cutoff, enforced explicit order confirmation keywords (`CONFIRM`), and capped tags to 10. |
| **2026-07-31** | **Inbox 6 Major Upgrades (Lightbox, Quote & Reply, Forward, Block, Stage Selector)** | `inbox.service.ts`, `inbox/page.tsx`, `ConversationSidebar.tsx` | Built lightbox image download, message quote & reply preview, message forwarding modal, contact blocking, inline CRM stage selector, and 50/50 parameter filter bar. |
| **2026-07-30** | **Inbox AI Event-Wise Behavior Toggles & Structured Classification** | `orchestrator.service.ts`, `ai-training/page.tsx` | Implemented 2-stage LLM classification + deterministic code handlers for `order_placement`, `image_reading`, `support_detection`, `product_matching` with UI feature locks. |
| **2026-07-30** | **Inbox CRM Upgrade (Collaborators, Activity Logs, Presence, Smart Tabs)** | `inbox.service.ts`, `activity-log.service.ts`, `user-presence.service.ts`, `inbox/page.tsx` | Added starred/archived/resolved conversation flags, collaborator assignments, activity trail, user presence status, Smart Tabs bar, and 7-section CRM right sidebar. |
| **2026-07-29** | **Full Production Readiness Audit & Certification (25 / 25 Phases — 100%)** | `testing-reports/*` | Completed full-platform code-trace audit across all 25 phases. Passed NestJS build (0 errors), NestJS unit tests (377/377 passed), frontend typecheck (0 errors), frontend tests (6/6 passed). |
| **2026-07-28** | **ZiniChat Enterprise Support AI Engine & Session Management** | `support-chat.service.ts`, `SupportWidget.tsx` | Built Support AI with real-time tenant context injection, function calling tools (`create_support_ticket`, `navigate_to_page`), session auto-closure (>30m), and prompt editor. |
| **2026-07-28** | **Executive BI Dashboard & Date Range Filters** | `tenant-stats.service.ts`, `dashboard/page.tsx` | Built Executive BI Dashboard with 6 KPI cards, 0-100 business health score, area/bar/pie charts, and YouTube-style date range filters (`today`, `7d`, `15d`, `30d`, `90d`, `this_month`). |
| **2026-07-28** | **Inboxes Real-Time Status & Reconnect Button** | `inbox.service.ts`, `whatsapp-web.service.ts`, `settings/inboxes/page.tsx` | Added real-time dynamic channel status (`Active 🟢` vs `Disconnected 🔴`), reconnect/scan QR CTA button, and AI auto-reply toggle endpoint `PATCH /inbox/channels/:id/ai-reply`. |

---

## 5. Project Directory Structure

```
ZiniChat/
├── .agents/                      # Workspace Agent Instructions & Custom Rules
│   └── AGENTS.md                 # Primary Agent Rules & Execution Guidelines
├── android-sms-gateway/          # Kotlin Native Android App for MFS SMS Ingestion
│   └── app/src/main/             # Android Receiver, WorkManager, Buffer & Manifest
├── backend/                      # NestJS Modular Monolith Backend
│   ├── prisma/                   # Database Schema (`schema.prisma`) & Migrations
│   └── src/
│       ├── ai/                   # LLM SDK Integrations & Vector RAG Engine
│       ├── ai-training/          # Persona Setup, Q&A Training & Live Simulator Agent
│       ├── audit-logs/           # Superadmin Audit Logging Module
│       ├── auth/                 # JWT Auth, OTP Verification, Google OAuth, BYOK
│       ├── billing/              # Subscriptions, Quota Reset Engine & Plan Limits
│       ├── broadcasts/           # Segmented Outbound Campaign Engine & BullMQ Queue
│       ├── business-nature/      # 8-Vertical Mode Configuration Engine
│       ├── channels/             # WhatsApp (Cloud & Baileys), Messenger, Instagram DM APIs
│       ├── client-brands/        # Superadmin Client Brand Marquee Showcase
│       ├── common/               # Shared Guards, Decorators, Interceptors & Filters
│       ├── contacts/             # CRM Leads Engine, CSV Import & Phone Normalizer
│       ├── crypto/               # AES-256-CBC Secret Encryption Helpers
│       ├── currency/             # Multicurrency (BDT ৳ / USD $) Provider
│       ├── file-validation/      # Buffer Inspection, Magic Bytes & Extension Guard
│       ├── google-analytics/     # GA4 Measurement Protocol v2 Server-to-Server CAPI
│       ├── inbox/                # Realtime Omnichannel Live Inbox & Socket.IO Gateway
│       ├── inquiries/            # Platform Sales & Demo Inquiries Module
│       ├── labels/               # CRM Tags, Labels & Prompt Rules Engine
│       ├── landing-page/         # Public Features & FAQs Management
│       ├── leads/                # Multi-Vertical Kanban Lead Stages
│       ├── login-logs/           # Secure Login Audit Log & 90-Day Purge Cron
│       ├── meta-pixel/           # Meta CAPI Acquisition Event Dispatcher
│       ├── mfs-payments/         # bKash/Nagad/Rocket EMVCo Bangla QR & SMS Gateway
│       ├── notifications/        # Realtime WebSockets, Emails & Team Lead Alerts
│       ├── orchestrator/         # Inbox AI 2-Stage Classifier & Prompt Caching Engine
│       ├── orders/               # E-Commerce & Multi-Vertical Booking Engine
│       ├── packages/             # Superadmin Package & Plan Management
│       ├── payments/             # Manual, Sandbox & Auto MFS Subscriptions
│       ├── products/             # Tenant Catalog & Dynamic Attributes Store
│       ├── smtp/                 # SMTP Email Dispatcher & Custom Alert Templates
│       ├── stats/                # Tenant Executive BI & Superadmin Analytics
│       ├── storage/              # Smart File Storage & VPS Disk Unlinking
│       ├── support-chat/         # Platform Support AI Agent (`SupportChatService`)
│       ├── team/                 # Team Roles, Granular Permissions & Seat Limits
│       ├── tenants/              # Tenant Isolation, Workspace Customization & Impersonation
│       ├── tickets/              # Realtime Support Ticket System
│       ├── users/                # User Accounts, Roles & Profile Management
│       └── website-widget/       # Web Embed Live Chat Widget Backend
├── frontend/                     # Next.js 16 App Router Frontend
│   ├── public/                   # Static Assets, PWA Icons, `llms.txt`
│   └── src/
│       ├── app/
│       │   ├── (auth)/           # Login, Signup, OTP Verification, Forgot Password
│       │   ├── (marketing)/      # Landing Page, Pricing, Features, FAQ, Success Stories, Legal
│       │   ├── (tenant)/         # Tenant Dashboard, Live Inbox, CRM, Settings, AI Training
│       │   ├── api/              # PWA Manifest, Analytics & Acquisition Endpoints
│       │   └── sp@dmin/          # Obfuscated Superadmin Operations Workspace
│       ├── components/           # Glassmorphic UI Components, Modals, SEO (JsonLd)
│       ├── context/              # Language (EN/BN), Currency (BDT/USD), Notification Contexts
│       ├── hooks/                # `useLanguage()`, `useCurrency()`, `useFeature()`
│       ├── lib/                  # API Clients, Socket Listeners & Formatting Utilities
│       └── middleware.ts         # JWT Session Guard, Role Router & Security Obfuscation
├── nginx/                        # Nginx Proxy Configurations
├── redis-local/                  # Local Redis Cache Configs
├── scripts/                      # Operations & MCP Deployment Pipeline
│   ├── invoke-mcp.js             # Deployment Script (`node scripts/invoke-mcp.js <target> <branch>`)
│   ├── sync-live-plans.js        # Live Server Package Settings Template Sync
│   └── check-*.js                # Diagnostics, Health Checks & Log Fetching Tools
├── supabase/                     # Supabase Migration & Vector DB Tools
└── docker-compose.yml            # Multi-Container Deployment Orchestration (Live & Test)
```

---

## 6. Operations & Next Steps
- **Active Operations**: Live system maintenance, package template synchronization, and user onboarding monitoring.
- **Deployment Protocol**: Always use `node scripts/invoke-mcp.js live main` after local testing and git commit/push.
