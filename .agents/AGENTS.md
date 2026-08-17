# Workspace Rules for ZiniChat

All AI agents MUST adhere to these workspace-specific behavioral and technical guidelines. No exceptions.

## 1. CRITICAL: Git & Deployment Rules
* **No Auto-Push**: NEVER run `git push` or deploy via MCP (`invoke-mcp.js`) without explicit user approval ("deploy", "push it"). Local `git commit` is allowed to save progress.
* **Deployment Workflow (PC -> Git -> Server)**: PC pushes to GitHub; Server pulls from Git. Direct file transfers or SFTP uploads to the server are strictly prohibited.
* **MCP Deployment Protocol**: Use `invoke-mcp.js` (target: "test"/"live", branch: "main") to deploy. Do not edit code on remote servers; fix bugs locally, push to Git, then re-deploy. Read-only server investigation is allowed. SSH Keys require `fs.readFileSync` (node-ssh Windows bug).
* **Live Server Env Vars & Migrations**: `docker compose restart` doesn't reload `.env`. Use `docker compose --env-file .env.live up -d backend`. Migrations (`prisma db push`) use `DIRECT_URL` (points to `supabase-live-supavisor-1:5432`, not pooler).
* **Hotfix Workflow**: Stash -> Pull Main -> Branch `hotfix/name` -> Fix & Test Local -> Push -> Deploy Test -> Merge Main -> Deploy Live -> Return to Feature Branch.

## 2. Context & Code Architecture
* **Maintain Context**: Always read `project-context.md` at start. After ANY implementation, add a row to the top of the **Implementation History Log** table and update the Directory Structure & Next Steps.
* **Structure**: Use NestJS Modular structure. Scope tables with `tenant_id`. Log superadmin actions to `audit_logs`.
* **Prisma Safety**: If `onDelete: Cascade` is missing, manually delete dependent records before parent deletion (prevent 500 FK error). Check if backend is running on Windows before `npx prisma db push` to avoid `EPERM` lock.
* **Database Migrations**: Proactively generate Prisma migrations after any `schema.prisma` change.
* **Docker Next.js**: Explicitly pass `NEXT_PUBLIC_*` variables via `ARG` in `Dockerfile` and `build.args` in `docker-compose.yml` for standalone production builds.
* **Supabase Networking**: Route dockerized backend to host-Supabase via external Docker network port `5432` (`supabase-pooler:5432`), not the host-exposed port or `host.docker.internal`.

## 3. UI/UX, Design & Features
* **Glassmorphism & Brand**: Enforce Unified Dark Glassmorphism (`bg-surface/70 backdrop-blur-xl`). Use brand Green (`#1F824A`) & Orange (`#EE8D27`).
* **Dense & Responsive**: Use compact text (`text-[12px]`) and internal modal scrolling (`max-h-[90vh]`). **CRITICAL:** ALL web layouts MUST be simultaneously optimized for mobile native app view (bottom sheets, single-line actions).
* **Localization**: Use `useLanguage()` hook (`{language === 'en' ? 'EN' : 'BN'}`). Never hardcode English.
* **Superadmin Package Sync**: Any feature added to `superadmin/packages` MUST be mirrored in the `superadmin/tenants` Customize Plan modal.
* **JSON Array Substring Bug**: Never run `.includes()` on raw JSON feature strings (e.g. `'["ai","wp"]'`). Parse it to a JS array first.
* **Active Subscriptions**: Filter for `status === 'active' || 'trialing'` to resolve limits. Do not inherit limits from `pending` (unpaid) subscriptions.

## 4. Quotas, Billing & SMS Gateway
* **Limit Checks**: Enforce `QuotaService` before creating entities. Fallback priority: `Tenant.customLimit` > `Plan.limit`.
* **Subscription Math**: Always calculate UI `messages.used` as `Math.max(messagesUsed, aiUsedInPeriod)` to align AI responses. Compute metrics relative to `periodStart`. Use "AI Response Usage", not "AI Credits".
* **MFS Transactions**: Wrap MFS payment claims and SMS webhooks in `prisma.$transaction` blocks to prevent double claims. EMVCo Bangla QR payloads require Tag 63 Hex CRC-16. Enforce `X-SMS-GATEWAY-API-KEY`.
* **Android SMS APK**: Use the internal `android-sms-gateway` Kotlin App (zero-config, hardcoded parsers). Do not use third-party apps (JSON regex parsing bug). Build Debug APKs (`assembleDebug`), ensure `android.useAndroidX=true` and `Theme.AppCompat` in Manifest.

## 5. Integrations: AI, WhatsApp & Messaging
* **Multi-Vertical Adaptive System**:
  - Vertical mode flags in `BusinessNature` (`isPropertyMode`, `isHospitalityMode`, `isTechSoftwareMode`, `isFinancialServiceMode`, `isHealthcareMode`, `isEducationMode`, `isManufacturingMode`, `isLogisticsMode`).
  - `OrchestratorService` must branch system prompts, disable retail order placement for non-retail verticals, auto-create/move contacts to dedicated Kanban stages, log `ContactNote` details, and trigger targeted notifications.
  - UI components (`products/page.tsx`, `orders/page.tsx`, `ClientLayout.tsx`, `/dashboard/page.tsx`) adapt labels, icons, attributes, and conversion stats based on active vertical mode.
* **Specialized Team Notifications**: Use `NotificationsService.createNotificationForSpecializedTeam(tenantId, requiredTags, title, body)` to route AI lead alerts to team members with matching `User.specializationTags` (e.g. `Doctor Assistant`, `Logistics Dispatcher`, `Property Agent`).
* **Inbox AI Two-Stage Classification (Code Decides)**: Stage A: LLM outputs strict JSON Interface. Stage B: Backend validates stock, plan features, and tenant isolation before execution. Never let LLM mutate records directly.
* **AI Event Parity**: AI background actions (e.g., creating tickets) MUST trigger standard UI real-time sockets, notifications, and emails.
* **AI Prompt Caching Layering & Token Optimization**:
  - Always structure LLM prompts into 2 distinct sections: **Static Header** at the top (System persona, Anti-hallucination rules, Tag rules, Event rules, JSON Output Format schema) for 100% prompt cache hits across calls, and **Dynamic Footer** at the bottom (Customer info, RAG search results, Chat history).
  - Implement Stage 0 Dynamic Indexing (`searchRelevantProducts`, `searchRelevantQnas`) to retrieve max 5 matching items based on user query intent. Generic greetings ("hi", "salam", etc.) MUST skip product catalog & vector DB queries to reduce input tokens from 5,000+ to ~300-500.
* **Prisma JSON Field Safety & AI Simulator Parity**:
  - Never dereference raw properties directly on Prisma `Json` columns (e.g. `(tenant.websiteSummary as any).summary`). Always wrap in a robust JSON deserialization guard handling objects, parsed JSON strings, and raw strings.
  - Any knowledge source added to live inbox AI (`OrchestratorService`) MUST be mirrored in the AI Training Live Simulator (`AiTrainingService.testSimulate`).
* **WhatsApp Web (Baileys) Lifecycle**: 
  - Store `creds.json` in Docker volume `zinichat_backend_sessions`. Set `keepAliveIntervalMs: 25000`.
  - Prevent duplicate socket 440/409 conflicts: DO NOT auto-reconnect on 440/409. Cleanly `destroySocket` (unbind events) before `makeWASocket`. Wrap `sendMessage` in auto-retry for stale sockets.

## 6. Guards, Testing & Notifications
* **Guards & Roles**: Ensure JWT payloads return arrays (e.g., `permissions`) for Guards. Isolate routes in `middleware.ts` (Superadmin vs Tenant).
* **Multi-Recipient Notifications**: Always fetch and notify ALL owners/admins (`role: { in: ['owner', 'admin'] }`) via `NotificationsService` and `SmtpService` for key events. Never leak to `users[0]`.
* **TypeScript & Jest**: Include `.spec.ts` in root `tsconfig.json` so IDE loads types. `tsconfig.build.json` excludes tests. Provide `@nestjs/bullmq` mock tokens. Return full nested Prisma mock objects for services. Avoid hardcoded HTML strings in email assertions. Every NestJS service MUST have a `.spec.ts` file.

## 7. Strict UI/UX & Design Alteration Rules
* **No Unauthorized Design Changes**: Do NOT change any design-related code, styles (Tailwind classes, layouts, components, theme settings) or UI structure unless explicitly instructed by the user.
* **Fit into Existing Design**: Implement all new features/requirements within the existing UI design and layout framework. Avoid proposing or building new designs/themes without prior concern and consent.
* **Double Confirmation on Design & Removals**:
  - Always request a second-time explicit confirmation with detailed explanation before making any design or layout changes.
  - Ask for strict confirmation before deleting, replacing, or deprecating any existing features, buttons, components, or UI segments.

