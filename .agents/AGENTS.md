# Workspace Rules for Omnichannel AI Business Assistant Platform

This document contains rules and behavioral guidelines specific to this workspace. All AI agents MUST adhere to these rules.

---

## 0. Git Push — Requires Explicit User Approval (CRITICAL)

**This is the highest priority rule and overrides all other workflow rules.**

* **NEVER run `git push` or `git push origin <branch>` without the user explicitly saying so.** Phrases like "deploy", "push it", "send it to git", "github e dao" count as explicit approval.
* **Local commits (`git commit`) are allowed** during development to save progress — but pushing to remote is strictly forbidden without user approval.
* **Deployment via MCP (`invoke-mcp.js`) also counts as a push-equivalent action** and requires explicit user confirmation before triggering.
* **Why**: The user wants full control over what goes to GitHub and when. Never auto-push as part of a development or fix workflow.

---

## 1. Automatic Context Tracking & Maintenance

### Rule: You must maintain the `project-context.md` file.
* **Reading Context**: At the beginning of every session or task execution, you must read the contents of [project-context.md](file:///f:/AI%20Assistant%20SAAS/project-context.md) to understand the current implementation state, recent changes, and active focus.
* **Updating Context**: After implementing any feature, changing any file structures, updating database schemas, or modifying the architecture, you **must immediately update** [project-context.md](file:///f:/AI%20Assistant%20SAAS/project-context.md).
* **Logging Changes**: For every implementation:
  - Add a new row to the top of the **Implementation History Log** table.
  - Update the **Current Status & Active Focus** section.
  - Ensure the **Directory Structure & Key Files** list accurately reflects newly created or modified files.
  - Keep the **Next Steps / Backlog** list up to date.

---

## 2. Coding and Structural Guidelines
* Use modular structure for NestJS.
* Scope every database table with `tenant_id` (except platform-wide or superadmin tables).
* Log all superadmin activities to the `audit_logs` table.

---

## 3. UI/UX & Tailwind Guidelines
* **Unified Glassmorphism Theme (Single Mode)**: The application NO LONGER uses separate Light and Dark modes. Always design components using the unified frosted glass layout (`bg-surface/70 backdrop-blur-xl`).
* **Brand Colors**: Always incorporate the brand colors (Green `#1F824A` and Orange `#EE8D27`) using standard Tailwind utilities or custom classes, ensuring a premium aesthetic.
* **Compact UI**: All forms, popups, and tables must be highly dense and compact. Minimize padding and font sizes (e.g., `text-[12px]` or `text-[13px]`) to maximize information density on SaaS screens.
* **Responsive Modals**: Always ensure modals are scrollable internally (`overflow-y-auto`, `max-h-[90vh]`) so they don't lock or overflow on small laptop screens.
* **Simultaneous Mobile Native App Responsiveness (CRITICAL)**: Whenever any design or layout change is requested for web/desktop view, you MUST simultaneously optimize and test the layout for mobile responsive view in a native app style (e.g., compact touch cards, single-line action bars, collapsable banners, bottom sheets, zero horizontal page overflow). Never implement web-only changes without adapting the mobile user experience in parallel.

---

## 4. Backend & Database Best Practices
* **Cascading Deletions**: In Prisma, if `onDelete: Cascade` is not explicitly set in the schema, you MUST manually delete dependent records (like `auditLogs`) before deleting a parent record (like a `User`) to prevent Foreign Key constraint 500 Internal Server Errors.
* **Authentication Payload**: When working with `JwtStrategy` and `PermissionsGuard`, ensure that the JWT payload correctly returns the required arrays (like `permissions`) so the guards don't strip them and throw `403 Forbidden` errors.
* **Next.js App Router Layouts**: If a specific page (e.g., `login`) is inside a folder with a `layout.tsx` (like `/superadmin`), conditionally bypass the layout UI (sidebar/navbar) by checking the `pathname` inside the layout if you want a clean screen.

---

## 5. Notification & Event Triggers
* **Notification Triggers**: Every time a key event is implemented (e.g. system events, signups, messaging, billing updates, limits reached, settings altered), you must trigger a database & real-time notification using `NotificationsService` for the affected User(s) or Superadmins. Always write code with notifications in mind to ensure the notification feed stays alive.

---

## 6. Language & Localization
* **Bilingual Support (English/Bengali)**: The application is bilingual. When creating or modifying React UI components, ALWAYS use the `useLanguage()` hook (`const { language } = useLanguage();`) from `@/components/LanguageProvider`. Render text conditionally based on the active language (e.g., `{language === 'en' ? 'English Text' : 'বাংলা টেক্সট'}`). Never hardcode English-only text in user-facing UI.

---

## 7. Quotas & Subscription Customization
* **Limit Enforcement**: Every time a new feature involves creating data (files, messages, AI tokens), you MUST enforce limits via `QuotaService`.
* **Superadmin Overrides**: When implementing limit checks, always remember that the `Tenant` model holds custom override fields (e.g., `customMessageQuota`, `customStorageLimitMb`). These overrides take priority over the base `Plan` limits. If a custom field is null, fallback to the Plan limit.

---

## 8. Prisma Operations on Windows
* **EPERM File Lock Prevention**: The user operates on a Windows environment. When the NestJS backend (`npm run start:dev`) is running, it locks the `query_engine-windows.dll.node` file. 
* **Rule**: Before running `npx prisma db push` or `npx prisma generate`, you MUST check if the backend is running. If it is running, you must either:
  1. Politely ask the user to temporarily stop the backend terminal (`Ctrl+C`) before you execute the Prisma generation commands.
  2. Or, acknowledge the `EPERM` error if run in the background and explicitly instruct the user to restart their backend to apply the changes and fix the TS compilation errors. Do not keep retrying `prisma generate` blindly while the server holds the lock.

---

## 9. TypeScript & Jest IDE Configuration
* **Test File Visibility**: When setting up tests (Jest) in a TypeScript project (like NestJS or Next.js), the root `tsconfig.json` MUST NOT exclude `.spec.ts` or `.test.tsx` files. It MUST also explicitly include the test directories (e.g., `"include": ["src/**/*", "test/**/*"]`). This ensures the IDE language server correctly loads global types for test files.
* **Build Separation**: Exclude test files exclusively inside `tsconfig.build.json` to keep them out of production builds.
* **Type Definitions**: Always ensure `@types/jest` is installed in `devDependencies`. If test files throw `Cannot find name 'describe'` or `Cannot use namespace 'jest'`, this is an indicator that either the types are missing from `package.json` or excluded by `tsconfig.json`.

---

## 10. Dockerized Next.js Environment Variables
*   **Build-Time Requirement**: When building a Next.js application inside Docker for production (`standalone` mode), all `NEXT_PUBLIC_*` variables (such as `NEXT_PUBLIC_API_URL`) MUST be explicitly passed as build arguments. 
*   **Implementation**: Add `ARG NEXT_PUBLIC_VAR` in the `Dockerfile` before the build step, and provide the value under the `build.args` section in `docker-compose.yml`. Relying solely on runtime `.env` files or `environment` blocks will cause the frontend to fallback to default/localhost values.

---

## 11. Backend to Host-Supabase Networking
*   **Direct Network Attachment**: When connecting a dockerized backend to a self-hosted Supabase instance running in separate containers on the same host, DO NOT route traffic through the host gateway (`host.docker.internal`).
*   **Implementation**: 
    1. Define the Supabase network as an external network in the application's `docker-compose.yml` (e.g., `supabase_test_network: external: true, name: supabase-test_default`).
    2. Attach the backend service to this network.
    3. Construct the `DATABASE_URL` using the internal container name and internal port (e.g., `postgresql://...user...pass@supabase-pooler:5432/postgres`).

---

## 12. Supavisor Self-Hosted Configuration
*   **Internal Port Mapping**: If setting up a new self-hosted Supabase instance or fixing Supavisor `(ENOIDENTIFIER)` errors, ensure that Supavisor communicates with the Postgres container over the internal Docker network port (`5432`), not the host-exposed port (like `5435` or `5436`).
*   **Fixing pooler.exs**: Verify that `/volumes/pooler/pooler.exs` has `"db_port" => "5432"` hardcoded or correctly resolved, overriding default `.env` variables like `POSTGRES_PORT` if they reference the host port.

---

## 13. Git Branching & Hotfix Workflow
* **Rule**: When guiding the user or executing Git commands during an emergency live bug fix (Hotfix), you must enforce the following workflow:
  1. Stash or commit the current work on the active feature branch (`git stash` or `git commit`).
  2. Switch to the `main` branch and pull the latest production code (`git checkout main`, `git pull origin main`).
  3. Create a dedicated hotfix branch (`git checkout -b hotfix/issue-name`).
  4. Implement the fix, test locally, and push the hotfix branch (`git push origin hotfix/issue-name`).
  5. Guide the user to deploy to the Staging/Test server for verification.
  6. Once verified, merge the hotfix into `main` and deploy to Live.
  7. Return to the original feature branch and resume work (`git checkout feature-branch`, `git stash pop`).
* **Never** commit directly to `main` or hot-patch live servers without testing on a separate branch first.

---

## 14. Database Migrations
* **Rule**: Whenever any change is made to the database structure (e.g., modifying `schema.prisma` or adding tables), the agent MUST proactively generate the migration script (e.g., running `npx prisma migrate dev --name <migration_name>` or equivalent) without waiting for the user to ask.
* **Why**: This ensures that structural changes are immediately recorded in source control, preventing deployment failures on staging/live servers caused by forgotten database migrations.

---

## 15. Deployment Workflow & Constraints
* **Architecture Shift**: This project enforces a strict "PC -> Git -> Server" workflow. The local PC must push changes to GitHub (`git push`), and the server must pull the changes from Git (`git pull`).
* **MCP Deployment Exception**: You are allowed to use the `deploy-server` MCP tool to automate the server-side deployment. However, this tool MUST ONLY execute SSH commands on the server to run `git pull` and restart the application.
* **Strict Rule**: Direct file transfers, SFTP uploads, or copying local files from the PC to the server are permanently prohibited. NEVER attempt to create or run direct deployment scripts that transfer files.

---

## 16. Strict Deployment Agent Protocol (MCP Level Enforcement)
* **Scope Lock ("No matubbori")**: When triggered for a deployment task, the agent is strictly bound to the deployment workflow. It must not perform any unprompted changes, side tasks, or unrelated file modifications.
* **Interactive Server Selection**: If the user says "deploy", the agent MUST halt and ask: *"Which server do you want to deploy to? (e.g., test or live)"* before proceeding.
* **Deployment Execution**: Upon approval, the agent must use the `deploy_to_server` MCP tool to trigger the `git pull` on the remote server.
* **Local-First Bug Fixing (Git Flow)**: If an error occurs during a server deployment (e.g., on the `test` server):
  1. The agent MUST NOT try to hot-patch or edit code directly on the remote server.
  2. The agent MUST analyze and fix the code on the **local PC codebase**.
  3. The agent MUST commit and push the fix to Git (`git push`).
  4. Finally, the agent MUST instruct the remote server to pull the new code from Git using the deployment MCP tool.
* **Read-Only Server Access**: If the user requests to investigate a server issue, the agent is permitted to *check* logs and read files on the server to diagnose the problem, but any resulting code changes MUST be made locally and deployed via Git.

---

## 17. MCP Server Deployment & Troubleshooting Learnings
This rule documents the exact workflow discovered during a live test server deployment session to ensure future agents can seamlessly deploy and fix issues on this PC.

* **Invoking the MCP Deploy Server:** Instead of relying on a native injected tool, deployments on this PC are triggered by modifying and running the scratch script `c:\Users\ASUS\.gemini\antigravity-ide\scratch\invoke-mcp.js`. Update the `target` ("test" or "live") and `branch` (e.g., "main" or "hotfix/...") in this script, then execute it via `node c:\Users\ASUS\.gemini\antigravity-ide\scratch\invoke-mcp.js`.
* **SSH Key Parsing Fix (`Unsupported key format`):** The `node-ssh` library in `scripts/mcp-deploy-server.js` fails to parse newer Windows `id_rsa` keys if passed as an absolute file path. The script has been fixed to read the key explicitly via `fs.readFileSync`. If an SSH error occurs, ensure the script is still reading the key as a string (utf8) and that `.env.deploy` has the `_SSH_PASSPHRASE` variable if the key is encrypted.
* **Remote Database Migrations:** Remote migrations are automated by appending the command directly to the restart command in `scripts/.env.deploy` (e.g., `TEST_RESTART_CMD=... && docker compose exec -T backend npx prisma db push`).
* **Handling Deployment Build Failures:** If a Docker build fails on the remote server (e.g., Next.js JSX syntax error), **do not edit code on the server**. Instead, trace the error locally, fix the syntax (e.g. missing closing tags), commit the fix to the active feature/hotfix branch, push it to GitHub, and then run `invoke-mcp.js` again to pull the new code onto the server.
* **`docker compose restart` vs `docker compose up -d`:** `docker compose restart` does NOT reload the `env_file`. If you update a `.env` file on the server (e.g., fixing `DIRECT_URL` in `backend/.env`), you MUST run `docker compose --env-file .env.live up -d backend` to recreate the container and pick up the new environment variables. Using `restart` will keep the old, cached env vars.
* **Live Server Prisma `DIRECT_URL` Config:** The live server's `backend/.env` must have `DIRECT_URL` pointing to `supabase-live-supavisor-1:5432` (NOT `supabase-pooler`). `prisma db push` and migrations use `DIRECT_URL`, not `DATABASE_URL`. If migrations fail with `P1001: Can't reach database server at supabase-pooler:5432`, it means `DIRECT_URL` is misconfigured on the live server. Fix it with `sed` on the server, then run `docker compose up -d` to reload, then retry `prisma db push` via `docker exec`.
* **Diagnostic Scripts:** The following helper scripts exist in `scripts/` for live server troubleshooting (run from `f:\AI Assistant SAAS\scripts\`):
  - `node check-live-logs.js` — View running containers + backend logs
  - `node check-live-network.js` — Inspect supabase network attachment
  - `node check-live-env.js` — Check `DATABASE_URL` and `DIRECT_URL` inside the container
  - `node run-live-migration.js` — Run `prisma db push` directly inside the live backend container
  - `node fix-live-direct-url.js` — Auto-fix `DIRECT_URL`, recreate container, and run migration

---

## 18. NestJS & Prisma Unit Testing Best Practices
This rule documents testing strategies for the platform to prevent recurring TS errors and false failures when writing Jest tests for NestJS services.

* **BullMQ Queue Mocking:** When testing services that inject BullMQ queues via `@InjectQueue('queue-name')`, you MUST provide the queue token using `@nestjs/bullmq`'s `getQueueToken('queue-name')` in the `TestingModule` providers.
  * *Example Setup:* `{ provide: getQueueToken('whatsapp-outbound'), useValue: { add: jest.fn() } }`
  * *Example Spy:* `const mockQueue = module.get(getQueueToken('whatsapp-outbound')); expect(mockQueue.add).toHaveBeenCalled();`
* **Complete Prisma Mocking:** When a service method calls `prisma.tenant.findUnique` to fetch related configurations before triggering an email or external API, NEVER return a partial mock (e.g., `{ id: 'tenant-1' }`). 
  * If the method expects `tenant.users[0].email` or `tenant.businessName`, the mock MUST provide the full nested object structure to avoid `undefined` reference errors downstream.
* **HTML String Assertions:** When validating email service outputs (`mockSendMail.toHaveBeenCalledWith`), avoid hardcoding full HTML structures if the service wraps the content in a master template (`generateMasterHtml`). Use `expect.stringContaining('Specific Template Text')` to validate the body.
* **Legacy Check Elimination:** When refactoring a processor (e.g., migrating a loop to an asynchronous queue processor), verify that legacy conditionals (like checking `isLast` flags) have been removed from the tests if the new queue delegates individual processing away from the batch handler.

---

## 19. MFS & Bank SMS Payment Gateway Best Practices
This rule documents the design patterns and security safeguards implemented for the SMS-matching payment gateway.

* **Transaction-Safe Operations:** When executing `verifyPayment` or `manualClaimTransaction`, you MUST wrap all reads and writes (checking `payment.status`, verifying `smsTx.isUsed`, setting `isUsed = true`, updating `payment`, and updating `subscription`) inside a secure `prisma.$transaction(async (tx) => { ... })` block. This prevents race conditions and double-spending when users fire multiple parallel claim requests for the same TrxID.
* **EMVCo Bangla QR Payload Structure:** Bangla QR codes are generated dynamically on the fly based on the EMVCo specification. Ensure the payload string ends with Tag 63 (checksum) followed by a 4-character uppercase Hex CRC-16 (calculated using CRC-16-CCITT with polynomial `0x1021`, initial value `0xFFFF`).
* **SMS Gateway API Key Security:** The `syncSmsTransaction` webhook API (`POST /mfs-payments/sms-webhook`) must require the `X-SMS-GATEWAY-API-KEY` header matching the environment variable `SMS_GATEWAY_API_KEY`. Never allow SMS sync data to bypass this validation to prevent fake payment logging.

---

## 20. Multi-Provider AI Resolution & Cookie Session Isolation
This rule documents the architectural safeguards for AI provider routing and authentication cookie isolation.

* **Multi-Provider AI BaseURL Resolution:** When initializing OpenAI SDK instances in AI services (like `SupportChatService`), NEVER assume default OpenAI endpoints (`https://api.openai.com`). Check `aiConfig.provider` and resolve the appropriate base URL:
  * For `provider === 'gemini'`, set `baseURL = aiConfig.apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/'`.
  * Always wrap AI completion requests in a try-catch to handle models that do not support tools/function calling, automatically falling back to standard completion requests or fallback model names (`gemini-2.0-flash`, `gemini-1.5-flash`).
* **Superadmin vs Tenant Session Isolation:** `middleware.ts` MUST enforce strict role isolation for route protection. If `user_role === 'superadmin'` accesses `/dashboard`, redirect them to `/superadmin`. This prevents superadmin authentication tokens (`access_token`) from bleeding into tenant workspaces and causing cross-tenant notification leaks.

---

## 21. Custom Android SMS Gateway & APK Build Rules
This rule documents the transition away from third-party SMS Forwarders and the rules for building custom ZiniChat Android APKs.

* **Third-Party JSON Parsing Bug:** Generic SMS Forwarder apps (like capcom6) frequently throw `400 Bad Request` when parsing complex Regular Expressions from JSON templates. They strip double-escaped characters (e.g., converting `\\s` to `\s`), which breaks backend regex matching engines.
* **Solution (Zero-Config App):** Do NOT instruct users to configure JSON templates or regex in third-party apps for MFS payments. ZiniChat now uses a proprietary Kotlin Android App (`android-sms-gateway`) with hardcoded, zero-config parsers for bKash, Nagad, Rocket, and all BD Banks (Bangla QR). 
* **AndroidX & Gradle Properties:** If modifying the custom Android App (`build.gradle`) and the build fails with `Configuration ':app:releaseRuntimeClasspath' contains AndroidX dependencies`, you MUST ensure that a `gradle.properties` file exists in the Android root directory containing `android.useAndroidX=true` and `android.enableJetifier=true`.
* **Debug vs Release APKs:** The GitHub Actions workflow (`build-android-apk.yml`) MUST build a **Debug APK** (`assembleDebug`), NOT a Release APK. Android OS will reject (App Not Installed) an unsigned Release APK. Since this is an internal utility app not destined for the Google Play Store, the default Gradle debug keystore signature is sufficient and required for successful phone installation.
* **Android 14 Foreground Service Crash:** When using `android:foregroundServiceType="dataSync"`, Android 14 strictly requires both the `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />` AND `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />`. If missing, the app will crash instantly on load with a `SecurityException`. Furthermore, `startForeground()` must explicitly specify the service type on Android 14+.
* **AppCompat Theme Crash:** If `MainActivity` inherits from `AppCompatActivity`, the `AndroidManifest.xml` MUST define a theme that extends `Theme.AppCompat` (e.g., `@style/Theme.AppCompat.NoActionBar`). Using `@android:style/Theme.DeviceDefault` will result in an immediate `IllegalStateException` crash upon UI creation.


---

## 22. AI Automated Actions & Notifications
* **Event Parity**: When an AI agent or automated background process (e.g., ZiniChat Support AI) creates an entity (like a Support Ticket) on behalf of a user, it MUST manually trigger the same notifications, web-socket events, and SMTP emails that the manual frontend UI would normally trigger.
* **Why**: The AI typically writes directly to the database via Prisma, bypassing the standard service methods that contain the notification hooks. Without explicit notification calls, Superadmins and Tenants will be blind to AI-generated activities.

---

## 23. Superadmin Packages & Tenant Custom Plan Synchronization
* **Rule**: Whenever any changes (additions, modifications, or deletions) are made to the system features list (access control checkboxes) inside `frontend/src/app/superadmin/packages/page.tsx`, the EXACT same changes MUST be synchronized with the "Customize Plan" modal in `frontend/src/app/superadmin/tenants/page.tsx`.
* **Why**: The Tenants page allows superadmins to override plan defaults on a per-tenant basis. If a new feature is added to the Packages page, it must also be available to be explicitly overridden inside the Tenants page customization form.

---

## 24. Active Subscription Resolution & Pending Checkout Filtering
* **Rule**: When querying a tenant's active plan for limits, quotas, or superadmin list displays (e.g. `tenantsService.findAll()`), NEVER blindly take `subscriptions[0]`. Unpaid payment attempts create `Subscription` records with `status = 'pending'`.
* **Implementation**: Always filter subscriptions for `status === 'active' || status === 'trialing'`, falling back to the default/Free plan if no active subscription exists. Never allow a `pending` subscription to override the tenant's actual base plan or features.

---

## 25. JSON String Feature Array Substring Prevention
* **Rule**: When rendering feature checkboxes or validating feature permissions on the frontend, NEVER call `.includes()` directly on `tenant.basePlan.features` or `customFeatures` without converting JSON strings to real JavaScript arrays first.
* **Why**: In JavaScript, stringified JSON arrays like `'["ai_assistant","whatsapp"]'.includes('messenger')` perform a substring search on the raw string, returning `true` if matched, which incorrectly checks all checkboxes. Always use a helper function (`parseFeaturesArray`) to parse JSON strings into actual JS arrays before calling `.includes()`.

---

## 26. WhatsApp Web Baileys Docker Persistence & Session Health
* **Rule**: Any service managing Baileys WhatsApp Web connections MUST store session files inside a persistent Docker volume (`zinichat_backend_sessions:/usr/src/app/sessions` in `docker-compose.yml`).
* **Why**: Baileys stores local credentials (`creds.json`) on disk. Without explicit volume mounting, container restarts or deployments permanently wipe active QR sessions, dropping user connections and requiring manual re-pairing.
* **Socket Configuration**: Always set `keepAliveIntervalMs: 25000`, `connectTimeoutMs: 60000`, and `defaultQueryTimeoutMs: 60000` in `makeWASocket()` options to prevent silent TCP socket idle timeouts. Provide auto-reconnect fallback handling in `sendMessage` if the socket connection is temporarily closed.

---

## 27. Subscription Quota Breakdown Period Alignment & Terminology
* **Rule**: When calculating quota breakdown health metrics for tenants (e.g. `messages` vs `ai` response counts), ALL metrics in `subscriptionHealth` MUST be computed relative to the active subscription billing cycle start date (`periodStart`), NOT the dashboard's date-range picker filter.
* **Mathematical Consistency**: Since every automated AI response sends an outbound message, `messages.used` in `subscriptionHealth` MUST always be calculated as `Math.max(messagesUsed, aiUsedInPeriod)` to prevent `Messages Usage` from ever appearing smaller than `AI Response Usage`.
* **Terminology**: Use **"AI Response Usage" / "এআই রেসপন্স কোটা"** for AI quota labels rather than "AI Credits Usage" across all UI cards and modals.

---

## 28. Master Production Audit & Quality Assurance Guidelines
This rule summarizes the core technical safeguards discovered and enforced during the 25-phase full-platform audit:

* **100% Jest Test Coverage**: Every NestJS backend service MUST have a corresponding `.spec.ts` unit test file in the same directory. Never leave a backend service without unit test coverage.
* **Prisma Foreign Key Deletion Safety**: When deleting a parent entity (e.g. `Tenant` or `User`), inspect for dependent records without `onDelete: Cascade` (such as `auditLogs`, `sessions`, `notifications`). Delete dependent child records prior to parent deletion to prevent 500 Foreign Key constraint errors.
* **MFS Payment Transaction Locks**: All MFS payment claims and SMS webhook sync logic MUST be wrapped inside atomic `prisma.$transaction(async (tx) => { ... })` blocks to prevent race conditions and double claims.
* **Multi-Provider AI Fallbacks**: OpenAI/Gemini/Groq/Anthropic completion calls must handle dynamic base URLs (`v1beta/openai` for Gemini) and wrap requests in try-catch blocks with graceful fallbacks.
* **Bilingual UI Parity**: All frontend React components MUST wrap text in `useLanguage()` conditional blocks (`{language === 'en' ? '...' : '...'}`) with `localStorage` persistence (`app-lang`).


