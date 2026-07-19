# Workspace Rules for Omnichannel AI Business Assistant Platform

This document contains rules and behavioral guidelines specific to this workspace. All AI agents MUST adhere to these rules.

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
