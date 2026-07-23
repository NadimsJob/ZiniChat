# Project Context & Developer Log

This file serves as the living memory and source of truth for the development of the **Omnichannel AI Business Assistant Platform**. Every AI agent or developer working on this project must read this file at the start of a task and update it immediately after any architecture changes, feature implementations, or major updates.

---

## 1. Project Overview
A multi-tenant SaaS platform where businesses (tenants) manage customer communication via a unified inbox and self-serve AI Assistants across WhatsApp, Meta Messenger, and Instagram DM.
* **Primary Architecture Spec**: [full-platform-architecture-v3.md](file:///f:/AI%20Assistant%20SAAS/full-platform-architecture-v3.md)

---

## 2. Tech Stack & Environment
* **Frontend**: Next.js + TypeScript + Tailwind CSS
* **Backend**: Node.js + NestJS (Modular Monolith)
* **Database**: PostgreSQL with `pgvector`
* **Queue/Cache**: Redis + BullMQ
* **Realtime**: Socket.io
* **AI Layer**: OpenAI & Anthropic SDKs (BYOK & Platform-key mode)

---

## 3. Current Status & Active Focus
- **Active Focus**: Implemented and unit-tested MFS & Bank SMS-matching automated payment gateway (supporting bKash/Nagad/Rocket/Bank Transfer and dynamic EMVCo Bangla QR codes) with unique Paisa/Cents offsets, platform charge percentage configuration, dynamic pricing breakdowns, and real-time Re-Sync checks.
- **Recent Issues Fixed**: Completed 11 backend unit tests for SMS webhook ingestion, dynamic QR generation, and real-time user verification.
- **System**: Backend (NestJS), Frontend (Next.js), Mobile (Kotlin Android app). Bilingual support enabled (English/Bengali) across UI components. Tickets. Implemented strict feature gating for Support AI, Team Management, and Contact Labels via Superadmin Plan settings. Extracted and animated the 2-Minute Setup Widget on the marketing pages.
- **Next Up:** Live testing of the MFS SMS gateway app with physical Android devices, E2E testing of the UI checkout flows.
- Subscription logic, quotas (messages, AI tokens, storage), and superadmin customizations have been strictly enforced on the backend via `QuotaService` and `FeatureGuard`.
- Direct PC-to-Server deployment scripts (MCP Server) have been deprecated and deleted to enforce Git-only deployment constraints.
- **Live and Staging Environments are fully deployed with Traefik routing, reverse proxy networking, and SSL certificates.**
- **Performance & Load Testing has been completed directly on VPS. Capacity projections indicate 1,500+ Tenants (Official API) or 50+ (Unofficial Baileys QR) per 8GB RAM node.**
- **Database vector search is optimized with HNSW indexes to eliminate SSD Sequential Scans and minimize Disk I/O.**

---

## 4. Implementation History Log
This log lists all features and modules implemented, ordered chronologically.

| Date | Feature / Change | Key Files Modified | Status / Notes |
| :--- | :--- | :--- | :--- |
| **2026-07-23** | **Platform Fee Charges & Re-Sync Callback** | `schema.prisma`, `payments.service.ts`, `mfs-payments.service.ts`, `mfs-payments.controller.ts`, `mfs-payments.service.spec.ts`, `pay-mfs/page.tsx`, `settings/mfs/page.tsx` | Added platform charge percentage settings for MFS accounts, pricing breakdowns on checkout, zero-input offset matching within a 2-hour window, and a Re-Sync button for instant verification. |
| **2026-07-23** | **MFS & Bank SMS Payment System** | `schema.prisma`, `app.module.ts`, `mfs-payments/` (Module, Controller, Service, Spec), `pay-mfs/page.tsx`, `settings/mfs/page.tsx`, `subscription/page.tsx`, `android-sms-gateway/` | Implemented end-to-end SMS-matching automated payment gateway supporting bKash, Nagad, Rocket, Bank accounts, and dynamic EMVCo Bangla QR. Created Kotlin Android background listener app. Added 10 Jest unit tests passing successfully. |
| **2026-07-22** | **Unit Testing & Test Mocks Fixing** | `smtp.service.spec.ts`, `broadcasts.processor.spec.ts`, `auth.service.spec.ts`, `instagram-auth.service.spec.ts`, `packages.service.spec.ts` | Successfully ran and fixed all 32 unit tests across 7 suites for the day's features. Repaired Prisma mock payload definitions, fixed BullMQ `whatsappQueue` spy assertions by using `getQueueToken`, and corrected string assertions for HTML email templates. |
| **2026-07-22** | **Detailed Tenant Reports & UI Enhancement** | `tenants.service.ts`, `tenants.controller.ts`, `tenants/page.tsx`, `tenants/[id]/page.tsx` | Upgraded the Superadmin Tenants list to dynamically display subscription status and renewal dates. Built a comprehensive, separate Tenant Report view showing deep statistics, usage progress bars, active limits, and payment history in a unified premium glassmorphism layout. |
| **2026-07-22** | **Superadmin Business Nature Stats** | `stats.service.ts`, `superadmin/page.tsx` | Added aggregation logic in the backend to count tenants grouped by their business nature. Integrated a new Pie Chart into the Superadmin Dashboard to visualize the distribution of business types across the platform. |
| **2026-07-22** | **Business Nature API Fix** | `app.module.ts` | Fixed `404 Not Found` error on `POST /business-natures` by properly registering `BusinessNatureModule` in `app.module.ts` imports array. Pushed to remote and triggered server deployment. |
| **2026-07-21** | **Dynamic Feature Gating & Animated Mockups** | `ClientLayout.tsx`, `SetupJourneyWidget.tsx`, `packages/page.tsx`, `SetupWidgetMockup.tsx`, `(marketing)/page.tsx` | Implemented strict feature gating for Support AI, Team, and Labels based on active plan's allowedFeatures array. Extracted `SetupWidgetMockup` into a shared component with a video-like animated cursor and checklist progression. Fixed backend TS build issues and executed live/test DB migrations. |
| **2026-07-21** | **Pricing Page & Compare Plans Redesign** | `PricingSection.tsx`, `pricing/page.tsx` | Completely redesigned the pricing cards to match a modern aesthetic with a solid yellow popular package, large fonts, and green checkmarks. Fixed the `Compare Plans` table to dynamically map from the Superadmin's Site Editor `pricingJson.compareFeatures` config and ensured it is scrollable and visible on mobile devices. |
| **2026-07-21** | **Promotional Pricing & Discounts** | `schema.prisma`, `payments.service.ts`, `superadmin/packages/page.tsx`, `PricingSection.tsx` | Added dynamic promotional introductory pricing logic to packages. Allows Superadmin to configure `promoPriceMonthlyBdt`, `promoMonths`, and `yearlyDiscountPercent`. Billing engine auto-calculates discounts based on tenant's past successful payments count. Overhauled frontend pricing UI to highlight promotional periods and dynamic yearly save badges. Fixed `priceUsd` to `priceMonthlyBdt` bug in Superadmin packages editor. |
| **2026-07-21** | **Dynamic Legal Pages & Social Links** | `schema.prisma`, `site-editor/page.tsx`, `marketing/privacy/page.tsx`, `marketing/terms/page.tsx`, `marketing/layout.tsx` | Added JSON fields to `LandingPageConfig` for bilingual Privacy Policy, Terms & Conditions, Contact info, and Social Media links. Updated Superadmin Site Editor to manage these fields. Created public dynamic pages and updated footer with togglable social icons. |
| **2026-07-21** | **HNSW Index Implementation** | `schema.prisma`, `migrations` | Implemented HNSW index on `knowledge_chunks` vector column to optimize vector similarity search performance and disk I/O. |
| **2026-07-21** | **Performance & Load Testing** | N/A | Executed 5 Advanced Load/Stress Tests directly on VPS, generated capacity report, and analyzed Traefik ingress limits for high-concurrency scenarios. |
| 2026-07-21 | AI Agent | Support AI | Implemented AI-driven Platform Support Chat widget for tenants, with `SupportConversation`, `SupportMessage` models. Superadmin UI to assign model & view chats. Function calling for automatic ticket creation. |
| 2026-07-21 | AI Agent | AI Config Overrides | Allowed superadmins to change global default AI model with permission modal, and tenants to be assigned specific BYOK/Custom models. Updated Orchestrator to resolve `customAiConfigId`. |
| **2026-07-20** | **Live/Test Deployment & Traefik Routing Fix** | `scripts/.env.deploy` | Fixed a critical deployment bug where Traefik was returning a 404 for test and live servers. Updated `TEST_RESTART_CMD` and `LIVE_RESTART_CMD` to explicitly pass `--env-file .env.test` and `.env.live`, enabling proper Docker label processing for Traefik. Executed programmatic DB migration to push local Site Editor `LandingPageConfig` data to test/live without wiping tenant data. |
| **2026-07-20** | **Web Notification System Fixes** | `leads.cron.ts`, `tickets.service.ts`, `payments.service.ts`, `subscription-reminder.service.ts` | Fixed a major bug where Superadmins were receiving Tenant CRM follow-up alerts due to test-lead assignments. Added strict tenant validation. Updated all background services to target both `owner` and `admin` roles, ensuring Google OAuth tenants receive their alerts. Added missing web notification for Tenant upon ticket creation. |
| **2026-07-20** | **Marketing Pages Full Redesign** | `(marketing)/features/page.tsx`, `about/page.tsx`, `contact/page.tsx`, `faq/page.tsx`, `pricing/page.tsx`, `page.tsx` | Completely redesigned all public marketing pages with unified glassmorphism theme, dynamic interactive elements, responsive tables, categorized accordions, and fully localized Bengali/English copy. Replaced sparse layouts with high-density information architecture and embedded interactive UI mockups. |
| **2026-07-19** | **Deployment Workflow Shift** | `scripts/`, `AGENTS.md` | Deleted all local PC-to-Server deployment scripts (`mcp-deploy-server.js`, `trigger-live.js`, etc.) and updated Workspace rules to strictly enforce Git-only deployments for maximum security. |
| **2026-07-19** | **MCP Deployment & Monitoring Server** | `scripts/mcp-deploy-server.js`, `mcp-config.json`, `backend/.env` | Built a local MCP server that uses `node-ssh` to deploy code and monitor server health without GitHub Actions. Includes tools: `deploy_test_server`, `deploy_live_server`, `check_server_health`, `get_docker_logs`, `restart_services`. Switched from password auth to SSH Key auth (`VPS_PRIVATE_KEY_PATH`). Target directories on VPS are `/var/www/zinichat-test` and `/var/www/zinichat-live`. |
| **2026-07-19** | **Live & Staging Traefik Deployment & Supabase Fixes** | `docker-compose.yml`, `.env.live`, `.env.test` | Deployed live (`zinichat.com`, `api.zinichat.com`) and staging (`test.zinichat.com`, `api-test.zinichat.com`) environments behind Traefik reverse proxy. Fixed Supabase networking (Supavisor tenant config) and Hostinger firewall ports for maximum security. Configured dynamic domain env vars in Compose. |
| **2026-07-19** | **Live Nginx Proxy & Rebuild Config** | `nginx/zinichat.com.conf`, `.env.live` | Created Nginx configuration file for reverse proxy and `.env.live` to correctly inject `NEXT_PUBLIC_API_URL` during live frontend build on port 8200/8201. |
| **2026-07-18** | **Live Server DB Connectivity Fix** | `backend/.env`, `docker-compose.yml`, `pooler.exs` | Diagnosed and fixed complex IPv6 listening and port mapping bugs preventing Supavisor from connecting to the live Postgres database. Ensured `.env` uses URL-encoded passwords and decoupled `POSTGRES_PORT` host bindings to resolve `ECIRCUITBREAKER` and `EAUTHQUERY` errors. |
| **2026-07-15** | **Security Hardening (Phase 2)** | `main.ts`, `app.module.ts`, `storage.controller.ts`, `login/page.tsx` | Implemented strict CORS, Helmet, Throttler rate limiting, strict ValidationPipe, FileInterceptor file filtering, and secure SameSite cookies for JWT. |
| **2026-07-15** | **Support Ticketing System** | `schema.prisma`, `TicketsModule`, `smtp.service.ts`, `superadmin/tickets/page.tsx`, `dashboard/support/page.tsx`, `superadmin/layout.tsx`, `(tenant)/dashboard/layout.tsx` | Implemented end-to-end ticketing system for tenants to contact superadmins, with assignment functionality, dynamic email notifications, and web notifications. |
| **2026-07-15** | **Public Site Inquiries CRM** | `schema.prisma`, `InquiriesModule`, `smtp.service.ts`, `superadmin/inquiries/page.tsx`, `marketing/contact/page.tsx` | Implemented public contact form, DB storage, superadmin UI for inquiries, and dynamic SMTP email notifications for new inquiries. |
| 2026-07-15 | Built 3-Tier BDT Pricing with Monthly/Yearly toggle and Superadmin Coupon System | Schema, Billing, Superadmin UI, Tenant UI | ✅ Completed |
| 2026-07-15 | Built Frontend Storage Management UI and Superadmin Customize Tenant Plan modal | Frontend, UI/UX, Superadmin | ✅ Completed |
| 2026-07-15 | Implemented QuotaService for messaging/storage/AI quotas, Superadmin custom plan overrides, and Storage Cleanup APIs | Backend, DB Schema, Quotas | ✅ Completed |
| 2026-07-22 | Implemented BullMQ queue architecture for the Broadcast System. `BroadcastsProcessor` now queues recipients sequentially with delays to prevent system crashes and Meta API rate-limiting during massive multi-tenant broadcasts. | Backend, Queueing, Optimization | ✅ Completed |
| 2026-07-22 | Implemented Broadcast System and Instagram DM with strict Access Control, integrated new features into `Packages` page, added backend modules, unit tests, and frontend dashboards. | Backend, Subscription, Planning | ✅ Completed |
| 2026-07-22 | Enhanced Tenants UI to track subscription statuses and display detailed reporting page for individual tenants. | Backend, Subscription, Planning | ✅ Completed |
| 2026-07-15 | **Unified Premium UI & Compactness** | Redesigned the Tenant Panel into a single unified "Glassmorphism" theme matching the brand colors (Green & Orange). Replaced dark mode with a highly polished frosted glass layout (`bg-surface` and `backdrop-blur`). Minimized padding and font sizes across Dashboard Overview, Leads, and SetupJourney widget for a dense, compact SaaS UI. Wiped DB as requested by user. | `globals.css`, `dashboard/layout.tsx`, `dashboard/page.tsx`, `leads/page.tsx`, `SetupJourneyWidget.tsx` | ✅ Completed |
| 2026-07-15 | **Leads CRM Pipeline & Default Stages** | Added "Intake" as default Kanban stage. Set inbound WhatsApp messages to auto-assign new contacts to this Intake stage. Implemented full CRUD UI on the `/dashboard/leads` page allowing users to Edit stage names and colors, and Delete stages. | `leads.service.ts`, `inbox.service.ts`, `leads/page.tsx` | ✅ Completed |
| 2026-07-15 | **AI Master Switch & Agent Routing Logic** | Added `isActive` and `replyWhenAssigned` flags to `AiAssistant` model. Built a gamified master toggle UI on the `/dashboard/settings/ai-training` page to completely pause AI or selectively pause AI when a human agent is assigned. Updated `OrchestratorService` to enforce these routing rules during inbound message processing. | `schema.prisma`, `orchestrator.service.ts`, `ai-training.service.ts`, `ai-training/page.tsx` | ✅ Completed |
| 2026-07-15 | **Setup Journey & Dynamic Checklist** | Built `SetupJourneyWidget` for new tenants on the main `/dashboard` page. The widget dynamically renders checklist steps (e.g. Connect WhatsApp, Train AI) based on the tenant's `allowedFeatures`. Implemented `GET /auth/setup-status` in the backend to query DB in real-time and return boolean flags tracking completion of each module. Fully bilingual and theme-compliant. | `auth.service.ts`, `auth.controller.ts`, `SetupJourneyWidget.tsx`, `dashboard/page.tsx` | ✅ Completed |
| 2026-07-15 | **Business Profile & Onboarding Flow** | Added extended profile fields and `isOnboarded` flag to `Tenant` model. Created Superadmin Business Nature CRUD management (`/superadmin/settings/business-nature`). Built mandatory `/dashboard/onboarding` gateway page to capture business details post-signup. Updated `/dashboard/profile` to include Business Profile editing capabilities. | `schema.prisma`, `auth.service.ts`, `business-nature/`, `dashboard/layout.tsx`, `onboarding/page.tsx`, `profile/page.tsx` | ✅ Completed |
| 2026-07-14 | **WhatsApp Media Attachments (Inbound & Outbound)** | Implemented high-res image and video downloading via Baileys `downloadMediaMessage` to local `/uploads` directory. Added base64 image thumbnails and high-res zoom preview in Inbox UI. Added outbound media sending by building `POST /inbox/messages/media` with Multer to upload files, updating BullMQ `whatsappQueue` to pass local file paths, and mapping `fs.readFileSync` buffers to Baileys `sock.sendMessage`. | `whatsapp-web.service.ts`, `whatsapp.processor.ts`, `inbox.service.ts`, `inbox.controller.ts`, `inbox/page.tsx` | ✅ Completed |
| 2026-07-14 | **Dynamic Multi-Channel Inbox** | Added `channelConnectionId` to `Conversation` schema. Updated webhook controller, inbox service, and WhatsApp BullMQ processor to strictly map replies to the exact WhatsApp connection they originated from. Built `GET /channels` endpoint and updated Inbox UI to dynamically render filters for active connections (hiding Messenger if unused) and display specific WhatsApp line labels (e.g. `WA (+880...)`). | `schema.prisma`, `whatsapp.controller.ts`, `inbox.service.ts`, `whatsapp.processor.ts`, `inbox/page.tsx` | ✅ Completed |
| 2026-07-13 | **WhatsApp Widget Implementation** | Implemented embeddable WhatsApp Website Widget for tenants. Gated by `whatsapp_widget` plan feature. Created `WidgetController` to serve dynamic script injection and `WidgetSettings` UI for tenants to copy snippet. | `whatsapp/page.tsx`, `widget.controller.ts`, `whatsapp.module.ts`, `WidgetSettings.tsx`, `packages/page.tsx` | ✅ Completed |
| 2026-07-13 | **Notification Compilation Fix** | Corrected invalid `createSystemNotificationForUser` calls in auth service to match actual notifications service signature `createNotification`. | `auth.service.ts` | ✅ Completed |
| 2026-07-13 | **WhatsApp Unofficial Integration & Rate Limiting** | Implemented `WhatsappWebService` with Baileys using zero-caching and disabled terminal QR printing for low memory footprint. Updated `schema.prisma` with `WhatsappProvider`. Implemented an anti-ban Rate Limiter in `WhatsappProcessor` strictly capping outbound messages for the `WEB_QR` provider at 10 messages/minute. Added the Unofficial "Pairing Code" connection UI in `/dashboard/settings/whatsapp` with explicit disclaimers. Updated Inbox UI to show rate limit blocks. | `whatsapp-web.service.ts`, `whatsapp.processor.ts`, `WhatsappWebConnectModal.tsx`, `whatsapp/page.tsx`, `inbox/page.tsx` | ✅ Completed |
| 2026-07-13 | **WhatsApp QR Package Gating** | Added `whatsapp_qr` feature flag to `Plan` schema features JSON. Updated `PackagesService` and Superadmin Packages UI to allow toggling of the Unofficial WhatsApp Web feature. Updated the tenant WhatsApp Settings UI to dynamically lock the "WhatsApp Web (QR)" tab if the feature is not allowed by the active plan, showing an upgrade prompt instead. Ran data migration script to update existing plans. | `packages/page.tsx`, `billing.service.ts`, `whatsapp/page.tsx` | ✅ Completed |
| 2026-07-11 | **Database Connectivity Fix (Supavisor Migration)** | `backend/.env` — Diagnosed ISP port blocking on port 6543/5432 and mitigated by switching network. Diagnosed Supabase pooler "tenant not found" error by identifying that Supabase had migrated the connection pooler from `aws-0` to `aws-1`. Updated environment variables and restored backend connectivity. | ✅ Done |
| 2026-07-11 | **Leads Kanban Colorization** | `dashboard/leads/page.tsx` — Stage columns now use each stage's color for gradient tint, header, count badge, and card left-border accent. Slide-over panel fixed to `fixed` position to prevent off-screen overflow. | ✅ Done |
| 2026-07-11 | **LeadsModule Registration Fix** | `app.module.ts` — `LeadsModule` was imported but never registered in `imports[]`, causing 404 on all `/leads/*` routes. Fixed. | ✅ Done |
| 2026-07-11 | **PermissionsGuard Owner/Admin Bypass** | `auth/guards/permissions.guard.ts` — Guard was blocking `owner` and `admin` roles because it checked `user.permissions` before checking role. Fixed: role check now happens first, bypassing guard for owner/admin entirely. | ✅ Done |
| 2026-07-11 | **Dummy Data Seeding (All Tenants)** | `scripts/seed-dummy-data.ts`, `scripts/seed-leads.js` — Seeded 3 tenants (Fashion Hub, Tech Store, Foodies) with contacts, channels, orders, products, kanban stages, and agents. Added 6 realistic Bangladeshi leads per tenant. ZiniChat Enterprise & other tenants already had data. | ✅ Done |
| 2026-07-11 | **payments/page.tsx Toast Fix** | `superadmin/payments/page.tsx` — Added missing `react-hot-toast` import; installed package via `npm install react-hot-toast`. Frontend now builds clean with 0 errors (39 pages). | ✅ Done |
| 2026-07-11 | **tsconfig.json scripts exclude** | `backend/tsconfig.json` — Added `"exclude": ["scripts"]` to prevent seed script TypeScript errors from blocking backend compilation in watch mode. | ✅ Done |
| 2026-07-11 | Tenant Agent Management System | `backend/src/team/`, `frontend/src/app/(tenant)/dashboard/team`, `InboxService`, `schema.prisma` | ✅ Completed |
| 2026-07-11 | Email Templates & Notifications | `smtp.service.ts`, `SmtpConfig` DB | ✅ Completed |
| 2026-07-11 | Payment System with Manual Approvals | `PaymentsService`, `frontend/.../superadmin/payments` | ✅ Completed |
| 2026-07-11 | Inbox Real-Time Webhooks | `inbox.gateway.ts`, `inbox.service.ts`, `webhooks.controller.ts` | ✅ Completed |
| 2026-07-11 | Multi-Category Email & Notifications | Expanded `SmtpConfig` schema to support 7 distinct email templates. Rewrote `SmtpService` with HTML Bengali templates. Integrated hooks in `PaymentsService` to trigger Emails + In-App Web Notifications for Payment Submit, Approve, and Sandbox events. Created `SubscriptionReminderService` CRON job to trigger 7-day and 2-day expiry warnings. Overhauled `/superadmin/settings/smtp` frontend with dynamic accordions, variables mapping, and fallback default templates. | `schema.prisma`, `smtp.service.ts`, `payments.service.ts`, `subscription-reminder.service.ts`, `billing.module.ts`, `smtp/page.tsx` |
| 2026-07-11 | AI Orchestrator / Context Engine | Implemented the central `OrchestratorService`. It asynchronously hooks into the `InboxService` to capture inbound text messages. It dynamically builds context-aware LLM prompts by injecting the conversation history (last 10 messages), CRM Contact info (Kanban Stage), and active E-commerce Products. Enforces AI Quotas and routes the LLM response back to BullMQ via `saveOutboundMessage`. | `orchestrator.module.ts`, `orchestrator.service.ts`, `inbox.service.ts`, `app.module.ts` |
| 2026-07-11 | Plan-Based Feature Gating | Replaced static menu toggles with dynamic logical feature keys in the `Plan` schema (`features Json`). Updated Superadmin UI to assign features (`ai_assistant`, `commerce`, `lead_manage`, etc.) to specific plans. Updated `TenantLayout` to fetch allowed features via `/billing/quotas` and dynamically filter sidebar menus to restrict access. Synced Landing Page pricing cards and Tenant Subscription upgrade UI to dynamically render the exact logical features checked by the Superadmin. | `schema.prisma`, `packages.service.ts`, `billing.service.ts`, `dashboard/layout.tsx`, `subscription/page.tsx`, `superadmin/packages/page.tsx`, `marketing/pricing/page.tsx` |
| 2026-07-11 | Tenant Theme & Trial Enforcement | Overhauled Tenant UI with vibrant gradient theme, accent colors, and glassmorphism. Implemented a robust Trial Period system: added `trialDays` to `Plan` and `trialEndsAt` to `Tenant`. Built a global `SubscriptionGuard` to intercept write actions (402 Payment Required) for expired trials. Patched frontend `fetch` globally in `TenantLayout` to display a blocking "Trial Expired" modal. Added Superadmin UI to configure trial days. | `globals.css`, `layout.tsx`, `schema.prisma`, `subscription.guard.ts`, `app.module.ts`, `superadmin/packages/page.tsx` |
| 2026-07-11 | Leads CRM & CRON Notifications | Overhauled Leads UI for maximum data density and responsiveness. Added Kanban/List toggle views with dynamic `KanbanStage` and `ContactNote` models. Added extended lead fields (phone, email, company, address, assignedUser). Implemented `@nestjs/schedule` CRON job (`LeadsCronService`) to constantly scan and dispatch realtime notifications when lead `followUpAt` dates are reached. | `schema.prisma`, `leads.module.ts`, `leads.cron.ts`, `leads.service.ts`, `dashboard/leads/page.tsx` |
| 2026-07-11 | BullMQ Outbound Messaging | Integrated BullMQ for asynchronous processing of outbound WhatsApp messages. | `inbox.module.ts`, `inbox.service.ts`, `whatsapp.module.ts`, `whatsapp.processor.ts`, `app.module.ts` |
| 2026-07-11 | Subscription Quota Limits | Updated `Plan` schema with `channelLimit`. Integrated `BillingService` into `WhatsappAuthService` to strictly block new WhatsApp connection creations (manual and OAuth) when a tenant exceeds their plan quota. Updated frontend `Settings` page with a quota badge and auto-disabled connection buttons when limit reached. | `schema.prisma`, `billing.service.ts`, `whatsapp-auth.service.ts`, `dashboard/settings/whatsapp/page.tsx` |
| 2026-07-11 | Inbox Real-time Messaging | Implemented core Inbox Socket.io real-time connection. Added `InboxModule`, Socket Gateway, updated WhatsApp webhook to broadcast via Socket, built `/dashboard/inbox` chat interface, and global unread badges. | `inbox.module.ts`, `inbox.gateway.ts`, `whatsapp.controller.ts`, `dashboard/inbox/page.tsx` |
| 2026-07-11 | Facebook Auth Configuration | Added `FacebookAuthConfig` database model to store Meta App ID and Secret. Created backend endpoints (`/auth/facebook/settings`) for Superadmin to manage credentials. Built `/superadmin/settings/facebook-auth` UI. Updated `WhatsappAuthService` to dynamically read Facebook credentials from the DB, enabling tenants to self-serve Facebook Embedded Signup. | `schema.prisma`, `auth.controller.ts`, `auth.service.ts`, `whatsapp-auth.service.ts`, `facebook-auth/page.tsx`, `layout.tsx` |
| 2026-07-11 | Security Hardening Audit | Fixed 5 critical issues: (1) Restricted CORS from wildcard `*` to allowlist. (2) Added global `ValidationPipe` with `whitelist:true` to sanitize all request bodies. (3) Secured `/auth/seed-superadmin` with a `SETUP_SECRET_KEY` env gate. (4) Removed hardcoded JWT fallback secret — app throws at startup if `JWT_SECRET` env missing. (5) Locked `POST /currency/rates` to superadmin only. (6) Strengthened frontend `middleware.ts` to validate JWT structure + expiry, not just cookie presence. | `main.ts`, `jwt.strategy.ts`, `auth.controller.ts`, `currency.controller.ts`, `middleware.ts`, `.env` |
| 2026-07-11 | WhatsApp API Connectivity Setup | Enhanced `ChannelConnection` Prisma model to support WhatsApp-specific fields (phoneNumber, wabaId, etc.). Created full backend endpoints (`/channels/whatsapp/*`) for adding manual connections, Facebook OAuth stubs, listing, testing, and deleting connections. Built frontend UI `/dashboard/settings/whatsapp` with bilingual (English/Bengali) instructions and premium dark/light mode interface. Added connection limit indicators for future subscription enforcement. | `schema.prisma`, `whatsapp-auth.controller.ts`, `whatsapp-auth.service.ts`, `dashboard/settings/whatsapp/page.tsx` |
| 2026-07-10 | Google OAuth Authentication | Added `GoogleAuthConfig` database model. Built backend configuration and secure token verification endpoints (`/auth/google/callback`). Created Superadmin UI (`/superadmin/settings/google-auth`) to manage client credentials and toggle platform Google login. Integrated Google Sign-In button on Login and Signup pages to support registration and authentication via Google accounts. | `schema.prisma`, `auth.controller.ts`, `auth.service.ts`, `google-auth/page.tsx`, `login/page.tsx`, `signup/page.tsx` |
| 2026-07-10 | Real-time Web Notifications | Added `Notification` database model. Installed websockets and Socket.io packages. Created backend `NotificationsModule` with a gateway mapping authenticated user connections to push real-time events. Built frontend `<NotificationBell />` client component with dropdown notifications log, unread badges, and sound alerts. Integrated it into Superadmin and Tenant headers. Added rules to `AGENTS.md` to enforce notification hooks. | `schema.prisma`, `notifications/`, `NotificationBell.tsx`, `layout.tsx`, `auth.service.ts`, `AGENTS.md` |
| 2026-07-10 | SMTP & Automated Welcome Email | Added `SmtpConfig` Prisma model to store SMTP credentials and welcome template config. Installed `nodemailer`. Created backend `SmtpModule` with secure endpoints. Built Superadmin UI `/superadmin/settings/smtp` for server setup, dynamic connection testing, and enabling/customizing signup welcome emails. Integrated hook in `AuthService` to send custom welcome emails on registration. | `schema.prisma`, `smtp.module.ts`, `auth.service.ts`, `superadmin/settings/smtp/page.tsx`, `superadmin/layout.tsx` |
| 2026-07-10 | Dynamic Packages & Add-ons | Migrated from static JSON pricing to database-backed `Plan` and `Addon` models. Built backend `PackagesModule`. Created Superadmin UI `/superadmin/packages` for CRUD operations with localized features and dynamic pricing. Removed static pricing from CMS Site Editor. Updated Marketing `/pricing` to fetch dynamic plans. Built Tenant `/dashboard/settings/subscription` page for subscription management and addon purchases. | `schema.prisma`, `packages.module.ts`, `superadmin/packages/page.tsx`, `pricing/page.tsx`, `subscription/page.tsx`, `site-editor/page.tsx` |
| 2026-07-10 | Global Currency Exchange System | Added `ExchangeRate` Prisma model for managing immutable exchange rates. Created Backend `CurrencyModule` with public and protected APIs. Built Superadmin UI (`/superadmin/currency`) to add rates with effective dates. Created `CurrencyProvider` React Context to fetch active rate and provide `formatBDT()` globally. Dynamically updated Pricing page, Superadmin Overview MRR, and Tenant Sidebar to reflect the active rate. | `schema.prisma`, `currency/`, `CurrencyProvider.tsx`, `layout.tsx`, `superadmin/currency/page.tsx`, `superadmin/page.tsx`, `pricing/page.tsx` |
| 2026-07-10 | Tenant User Profile & Avatar Upload | Added `profilePicUrl` to User model in Prisma. Built `PATCH /auth/profile` endpoint with Multer file upload for avatar (5MB max, image-only). Configured NestJS static asset serving for uploads. Created premium `/dashboard/profile` page with profile picture upload, editable name, password change with strength meter, bilingual support, and full light/dark mode compliance. Updated tenant sidebar footer with user avatar, name, and email with link to profile page. | `schema.prisma`, `main.ts`, `auth.controller.ts`, `auth.service.ts`, `dashboard/profile/page.tsx`, `dashboard/layout.tsx` |
| 2026-07-09 | Superadmin UI Polish & RBAC Bug Fixes | Fixed `JwtStrategy` payload to include permissions. Added `JwtAuthGuard` to `TeamController`. Fixed 500 error on user delete by cascading `auditLog` deletion. Completely redesigned Site Editor to use dynamic forms instead of raw JSON. Refactored Team Members UI for perfect light/dark theme compliance and fixed modal scroll overflow. Hid sidebar from `/superadmin/login` page. | `jwt.strategy.ts`, `permissions.guard.ts`, `team.controller.ts`, `team.service.ts`, `site-editor/page.tsx`, `team/page.tsx`, `superadmin/layout.tsx` |
| 2026-07-09 | Superadmin RBAC & Employee Management | Added `permissions` array to `User` schema. Secured Superadmin API endpoints with custom `PermissionsGuard` and `@RequirePermissions`. Built `/superadmin/team` UI for adding/editing employees and assigning menu-wise permissions. Made Superadmin Sidebar dynamic based on decoded JWT permissions. | `schema.prisma`, `auth.service.ts`, `permissions.guard.ts`, `team.module.ts`, `superadmin/layout.tsx`, `superadmin/team/page.tsx` |
| 2026-07-09 | Marketing Translation & UI Branding | Redesigned Logo (ZiniChat). Updated Prisma schema to include `heroTitleBn` and `heroSubtitleBn`. Restructured default Seed data & dynamic CMS config for bilingual English/Bengali support in Superadmin Editor. Full static translation for Home, Features, Pricing, and Contact. | `schema.prisma`, `seed-landing.ts`, `backend/src/landing-page/`, `frontend/src/app/(marketing)/`, `frontend/src/app/superadmin/site-editor/` |
| 2026-07-09 | Tenant Auth System | Added `/auth/signup` API endpoint. Built `/login` and `/signup` frontend pages. Secured `/dashboard` with Next.js Middleware. | `backend/src/auth/`, `frontend/src/app/(auth)/`, `frontend/src/middleware.ts` |
| 2026-07-09 | Interactive Landing Pages & Superadmin CMS | Added `LandingPageConfig` schema. Built dynamic Marketing Pages (`/`, `/features`, `/pricing`, `/about`, `/contact`, `/faq`). Built backend API. Shifted tenant portal to `/dashboard`. Added light/dark mode and language toggle. Added Site Editor to Superadmin. | `backend/prisma/schema.prisma`, `backend/src/landing-page/`, `frontend/src/app/(marketing)/`, `frontend/src/app/(tenant)/dashboard/`, `frontend/src/components/`, `frontend/src/app/superadmin/site-editor/` |
| 2026-07-09 | Superadmin Menus Functional | Created backend modules (Tenants, Billing, AuditLogs, Stats) and frontend UI pages for all Superadmin menus. | `backend/src/(tenants,billing,audit-logs,stats)/`, `frontend/src/app/superadmin/(tenants,billing,audit-logs)/` |
| 2026-07-09 | Superadmin Auth & Routing | Implemented JWT backend auth with `AuthModule` and `UsersModule`. Added `/superadmin/login` page with Next.js Middleware route protection via cookies. | `backend/src/auth/`, `frontend/src/middleware.ts` |
| 2026-07-09 | WhatsApp Embedded Signup | Added `ConnectWhatsAppButton` with FB SDK in frontend. Built backend `/webhooks/whatsapp/connect` endpoint to exchange OAuth code and save `channel_connections` in Prisma. | `frontend/...`, `backend/src/channels/whatsapp/` |
| 2026-07-09 | WhatsApp Channel Adapter | Created `IChannelAdapter` interface and implemented `WhatsappModule` to handle Meta webhook verification (GET) and incoming message parsing (POST). | `backend/src/channels/`, `backend/.env` |
| 2026-07-09 | Deployment Setup | Configured root package.json with scripts to deploy Next.js frontend directly to Vercel via Vercel CLI. | `package.json` |
| 2026-07-09 | Supabase Integration | Defined multi-tenant Prisma schema with `pgvector`, downgraded to Prisma v5 for stability, and integrated `PrismaService` into NestJS. | `backend/.env`, `backend/prisma/schema.prisma`, `backend/src/prisma/` |
| 2026-07-09 | Project Initialization | Installed Git & Node.js. Initialized NestJS backend and Next.js frontend with global premium dark-mode UI layout. | `backend/`, `frontend/src/app/` |
| 2026-07-09 | Developer Context Integration | Created [project-context.md](file:///f:/AI%20Assistant%20SAAS/project-context.md) and workspace agent rule [AGENTS.md](file:///f:/AI%20Assistant%20SAAS/.agents/AGENTS.md) to automatically track future implementations. | `project-context.md`, `.agents/AGENTS.md` |

---

## 5. Directory Structure & Key Files
*(To be updated dynamically as files are created and modified)*

* `full-platform-architecture-v3.md`: Detailed architecture specification.
* `project-context.md`: This file (Developer context and log).
* `.agents/AGENTS.md`: Workspace rules ensuring the agent maintains this context file.
* `backend/`: NestJS monolithic backend application.
* `frontend/`: Next.js frontend application containing Tenant and Superadmin apps.
* `scripts/`: Contains the local MCP Deployment & Monitoring server (`mcp-deploy-server.js`).
* `nginx/`: Nginx reverse proxy configuration files.
* `.env.live`: Environment file for Docker Compose live deployment.

---

## 6. Next Steps / Backlog

1. **Inbox Socket.io Real-time connection** - ✅ IMPLEMENTED.
2. **Subscription Quotas Enforcement** - ✅ IMPLEMENTED.
3. **Outbound Messaging with BullMQ** - ✅ IMPLEMENTED.
4. **AI Assistant Configurations & Training** - ✅ IMPLEMENTED.
5. **Subscription & Payment Gateway** - Implement Stripe/bKash/SSLCommerz integrations for billing.

---

## 7. Production Deployment & Server Setup Requirements
To deploy this system to a production environment (VPS, AWS, or similar), the following software, services, and configurations must be installed and set up on the host server:

### 1. System Dependencies
* **Node.js**: v18.x or v20.x (LTS recommended)
* **Package Manager**: `npm` or `yarn`
* **Process Manager**: `pm2` (recommended to keep the NestJS backend running forever and handle restarts)
* **Reverse Proxy**: Nginx (configured as a reverse proxy to route traffic to NestJS port `3001` and serve static assets)
* **SSL Certificate**: Let's Encrypt / Certbot (Mandatory since WhatsApp and Facebook webhooks strictly require `https://` URLs)

### 2. Databases & Queues
* **PostgreSQL (v15+)**:
  * Must have the **`pgvector`** extension enabled (required for AI Assistant vector embeddings).
  * On Ubuntu: `sudo apt-get install postgresql-15-pgvector` (or equivalent).
* **Redis Server**:
  * Required by BullMQ for background jobs (outbound broadcast queues, WhatsApp message webhooks processing).
  * Configure Redis to run as a service (`systemctl enable redis-server`).

### 3. File Storage & Directory Permissions
* The backend saves uploaded avatar files to a local directory.
* Ensure the `./backend/uploads` directory exists on the server and has read/write permissions for the Node.js process runner user.

### 4. Required Environment Variables (.env)
Configure the following environment variables in production:
* **Backend (`backend/.env`)**:
  * `DATABASE_URL`: Connection string for PostgreSQL (e.g., `postgresql://user:pass@host:5432/db`)
  * `DIRECT_URL`: Connection string for direct migrations (needed if using connection pooling like Supabase)
  * `JWT_SECRET`: Random secure string for signing auth tokens
  * `PORT`: Port the API runs on (default: `3001`)
* **Frontend (`frontend/.env.production`)**:
  * `NEXT_PUBLIC_API_URL`: The public URL of the backend API (e.g., `https://api.zinichat.com`)

---

## 8. Local Development Quick Start

To run the platform locally, ensure that your local Redis server is running, then open two separate terminals.

**1. Start the Backend:**
```bash
cd backend
npm run start:dev
```

**2. Start the Frontend:**
```bash
cd frontend
npm run dev
```

---

## 9. WhatsApp Web (Baileys) Integration Architecture

The platform supports an unofficial WhatsApp connection using `@whiskeysockets/baileys`. Because Baileys is memory-intensive and can cause bans if misused, the architecture is designed carefully:

### 1. Connection Management (`WhatsappWebService`)
- **Zero-caching**: `makeWASocket` is initialized without message caching (using only `useMultiFileAuthState`) to minimize server memory leaks. Terminal QR code printing is disabled.
- **Multiple Connections**: Connections are keyed by `tenantId` in a singleton `Map<string, Socket>`. This allows multiple tenants to have their own WhatsApp sessions running in parallel.
- **Pairing Flow**: 
  - Tenants pair via the `/dashboard/settings/whatsapp` UI. 
  - They provide a phone number to get an 8-character Pairing Code.
  - State is saved securely in the `backend/sessions/whatsapp_web/<tenantId>` folder.

### 2. Inbound Messages & Media
- The service listens to the `messages.upsert` event.
- **Quoted Messages (Replies)**: The `extendedTextMessage.contextInfo.quotedMessage` is parsed to extract the text/media caption of the message being replied to, passing it as `quotedMsg` in the payload.
- **Media (Images/Videos/Documents)**:
  - Low-resolution thumbnails (Base64) are extracted directly from `jpegThumbnail` to prevent UI freezing.
  - The high-resolution original media is downloaded automatically using Baileys `downloadMediaMessage`.
  - The media buffer is saved directly to `backend/uploads/` directory, and a public URL (`mediaUrl`) is passed to the database.
- The `inbox.service.ts` routes the payload, creates a `Message` record, and emits a `new_message` Socket event to instantly update the tenant's UI without refreshing.

### 3. Outbound Messages & BullMQ
- **Asynchronous Sending**: All outbound messages are saved to the database as `pending` and pushed to the BullMQ `whatsappQueue`.
- **Media Uploads**: Outbound attachments are uploaded via `POST /inbox/messages/media` (using `multer` file interceptors) and stored locally in `uploads/`. The `mediaUrl` is mapped in the DB.
- **Worker (`WhatsappProcessor`)**:
  - Consumes the queue and checks if a `mediaUrl` exists.
  - If a file exists, it translates the URL back to an absolute disk path and reads it into a Buffer using `fs.readFileSync()`.
  - Sends the message via Baileys using standard formats (`{ image: buffer, caption: content }`).
- **Rate Limiting**: To prevent WhatsApp numbers from being banned, the processor enforces a strict in-memory limit of **10 messages per minute per tenant** for the `WEB_QR` provider.
