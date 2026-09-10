# Workspace Rules for ZiniChat

All AI agents MUST adhere to these workspace-specific behavioral and technical guidelines. No exceptions.

## 1. CRITICAL: Git & Deployment Rules
* **No Auto-Push**: NEVER run `git push` or deploy via MCP (`invoke-mcp.js`) without explicit user approval ("deploy", "push it"). Local `git commit` is allowed.
* **Deployment Workflow**: PC pushes to GitHub; Server pulls from Git. Direct file/SFTP transfers prohibited.
* **MCP Deployment Protocol**: Use `invoke-mcp.js` with positional arguments (`node scripts/invoke-mcp.js live main` or `node scripts/invoke-mcp.js test staging`). NEVER pass CLI flags (e.g. `--target=live`). Fix bugs locally, push, then deploy. Read-only server investigation allowed. SSH keys require `fs.readFileSync` (node-ssh Windows bug).
* **Live Server Env Vars & Migrations**: `docker compose restart` doesn't reload `.env`. Use `docker compose --env-file .env.live up -d backend`. Migrations (`prisma db push`) use `DIRECT_URL` (points to `supabase-live-supavisor-1:5432`).
* **Hotfix Workflow**: Stash -> Pull Main -> Branch `hotfix/name` -> Fix & Test Local -> Push -> Deploy Test -> Merge Main -> Deploy Live -> Return to Feature Branch.

## 2. Context & Code Architecture
* **Maintain Context**: Always read `project-context.md` at start. After ANY implementation, add a row to top of **Implementation History Log** table and update Directory Structure & Next Steps.
* **Structure**: NestJS Modular structure. Scope tables with `tenant_id`. Log superadmin actions to `audit_logs`.
* **Prisma Safety**: Manually delete dependent records if `onDelete: Cascade` is missing. Check if backend is running on Windows before `npx prisma db push` (prevent `EPERM` lock). Proactively generate migrations after `schema.prisma` changes.
* **Docker & Networking**: Pass `NEXT_PUBLIC_*` via `ARG` in `Dockerfile` & `build.args` in `docker-compose.yml`. Route dockerized backend to host-Supabase via Docker network port `5432` (`supabase-pooler:5432`).

## 3. UI/UX, Design & Features
* **Glassmorphism & Brand**: Enforce Unified Dark Glassmorphism (`bg-surface/70 backdrop-blur-xl`), brand Green (`#1F824A`) & Orange (`#EE8D27`).
* **Dense & Responsive**: Use compact text (`text-[12px]`) and internal modal scrolling (`max-h-[90vh]`). ALL web layouts MUST be simultaneously optimized for mobile native app view (bottom sheets, single-line actions).
* **Localization**: Use `useLanguage()` hook (`{language === 'en' ? 'EN' : 'BN'}`). Never hardcode English.
* **Superadmin Package Sync**: Any feature added to `superadmin/packages` MUST be mirrored in `superadmin/tenants` Customize Plan modal.
* **Data Guards**: Parse raw JSON feature strings to JS arrays before checking. Filter `status: 'active' | 'trialing'` for active subscriptions.

## 4. Quotas, Billing & SMS Gateway
* **Limit Checks**: Enforce `QuotaService` before entity creation (Fallback: `Tenant.customLimit` > `Plan.limit`).
* **Subscription Math**: UI `messages.used` = `Math.max(messagesUsed, aiUsedInPeriod)`. Compute metrics relative to `periodStart`. Use "AI Response Usage", not "AI Credits".
* **MFS & SMS**: Wrap MFS payment claims & SMS webhooks in `prisma.$transaction`. EMVCo Bangla QR payloads require Tag 63 Hex CRC-16. Enforce `X-SMS-GATEWAY-API-KEY`.
* **Android SMS APK**: Use internal `android-sms-gateway` Kotlin App. Build Debug APKs (`assembleDebug`), ensure `android.useAndroidX=true` and `Theme.AppCompat` in Manifest.

## 5. Integrations: AI, WhatsApp & Messaging
* **Multi-Vertical Adaptive System**: Flags in `BusinessNature` (`isPropertyMode`, `isHospitalityMode`, `isTechSoftwareMode`, `isFinancialServiceMode`, `isHealthcareMode`, `isEducationMode`, `isManufacturingMode`, `isLogisticsMode`). `OrchestratorService` branches prompts, disables retail orders for non-retail, auto-moves Kanban stages, logs `ContactNote`. UI components (`products/page.tsx`, `orders/page.tsx`, `ClientLayout.tsx`, `/dashboard/page.tsx`) adapt labels, icons, attributes.
* **Team Routing & Event Parity**: Route alerts via `NotificationsService.createNotificationForSpecializedTeam()` matching `User.specializationTags`. AI actions MUST trigger UI real-time sockets, notifications, and emails.
* **Inbox AI 2-Stage Classification**: Stage A: LLM strict JSON Interface. Stage B: Backend validates stock, plan features, isolation.
* **AI Prompt Caching & Token Optimization**: Static Header at top, Dynamic Footer at bottom. Stage 0 Dynamic Indexing (`searchRelevantProducts`, `searchRelevantQnas`, max 5). Skip product/vector queries on generic greetings ("hi", "salam").
* **3 AI Agents Parity**: Inbox Agent, Simulator Agent (`AiTrainingService.testSimulate`), ZiniChat Support Agent (`SupportChatService`). All read tenant catalog standard fields + 100% custom attributes (`Product.attributes`). Wrap Prisma `Json` columns in JSON guards. Mirror live inbox features in simulator.
* **WhatsApp Web (Baileys)**: Store `creds.json` in Docker volume `zinichat_backend_sessions`. Set `keepAliveIntervalMs: 25000`. Cleanly `destroySocket` on 440/409 (no auto-reconnect loop). Auto-retry `sendMessage`.

## 6. Guards, Testing & Notifications
* **Guards & Roles**: Ensure JWT payloads return arrays (e.g., `permissions`). Isolate routes in `middleware.ts` (Superadmin vs Tenant).
* **Notifications**: Notify ALL owners/admins (`role: { in: ['owner', 'admin'] }`) via `NotificationsService` and `SmtpService`.
* **TypeScript & Jest**: Include `.spec.ts` in root `tsconfig.json`. Provide `@nestjs/bullmq` mocks. Every NestJS service MUST have a `.spec.ts` file. Align frontend TS interfaces with backend payloads.

## 7. Strict UI/UX & Design Alteration Rules
* **No Unauthorized Design Changes**: Do NOT change design, styles (Tailwind classes, layouts, theme settings) or UI structure unless explicitly instructed.
* **Fit into Existing Design**: Implement all features within existing UI/layout framework.
* **Double Confirmation**: Request explicit confirmation before any design/layout changes, or before deleting/replacing existing features, buttons, or UI segments.
