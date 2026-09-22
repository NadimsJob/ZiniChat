# ZiniChat — Meta CAPI Hub + MCP Ads Copilot
## Final Implementation Plan (v3 — Fully Finalized)

> **Status Tracking:**
> - `[ ]` = Not started
> - `[/]` = In progress
> - `[x]` = Done

---

## 0. Architecture Decisions — All Confirmed

| বিষয় | সিদ্ধান্ত |
|---|---|
| **MCP Type** | Internal orchestrator — Superadmin registers Meta App once, tenants OAuth করে নিজের Ad Account connect করে |
| **Credit Model** | Existing `AiUsageLog`/`aiQuota` pool থেকে deduction — নতুন Wallet নেই |
| **Unit Cost** | Superadmin-configurable: `adRunUnitCost=10`, `autoScaleUnitCost=5` |
| **Shared Pool Warning** | Tenant UI-তে explicitly দেখানো হবে |
| **CAPI Storage** | Metadata only — payload store হবে না |
| **CAPI Event Source** | Hybrid: Inbox auto-trigger + External webhook |
| **AI Sale Trigger** | Order intent detected by AI (`OrchestratorService`) |
| **Purchase Value** | System-এ available হলে নেব, না হলে skip |
| **Duplication** | Detect করলে suppress/delete (event_id matching) |
| **CAPI Sending** | Real-time + BullMQ retry on failure |
| **Creative Assets** | Hybrid: Catalog suggest + Merchant upload/approve |
| **Facebook Page** | Auto-detect from Messenger connection (required, block if missing) |
| **Targeting Style** | Advantage+ Audience (Meta latest best practice) |
| **Policy Rejection** | Units refund হবে, campaign FAILED_REFUNDED, notification |
| **Campaign Management** | Pause/Resume/Metrics UI included |
| **Balance Warning** | Ad account balance check + dashboard warning |
| **Conversation Flow** | 5-turn (Turn 4 = creative review আলাদা) |
| **Session Storage** | Redis with 24h TTL — DB-তে permanent store না |
| **Retention Policy** | CapiEventLog: 60 days, AiTokenUsageLog: 6 months (cron purge) |
| **Tenant Guidance** | প্রতিটা নতুন page-এ bilingual (EN/BN) help text, empty states, step-by-step instructions |

---

## 1. Superadmin Control Layer — Full Hierarchy

```
Level 1 (Emergency):  MetaMarketingApiConfig.isEnabled = false
                      → সব tenant-এর সব কিছু বন্ধ (one-click)

Level 2 (Global):     FeatureRollout.isGlobal = true
                      → সব tenant পাবে (plan ছাড়াই)

Level 3 (Plan-wise):  Plan.features includes 'capi_hub' | 'meta_ads_copilot'
                      → সেই plan-এর সব tenant পাবে

Level 4 (Tenant):     FeatureRolloutTenant override
                      → নির্দিষ্ট tenant manually grant/revoke
                         (Plan-এ না থাকলেও দেওয়া যাবে, থাকলেও বন্ধ করা যাবে)

Level 5 (Tool):       McpToolRegistry.isEnabled per tool
                      → নির্দিষ্ট MCP tool (e.g., শুধু read-only, write বন্ধ)
```

### Superadmin Activity Reports

**Per-tenant** (`/sp@dmin/tenants/[id]` — নতুন tabs):
- CAPI Tab: Pixel status, events this month (success/fail), top events, last event time
- Ads Tab: Ad Account status, campaigns (running/paused/failed), AI units used for ads, last campaign

**Platform-wide** (`/sp@dmin` dashboard — নতুন section):
- CAPI-enabled tenants count, events today, success rate
- Ads Copilot-enabled tenants, active campaigns, platform AI units for ads, policy rejections

---

## 2. Token & Storage Optimization Strategy

### Token Consumption (Ads Copilot)

```
Per campaign creation (5-turn):
├── Static Header (cacheable):  ~1,500 tokens — Meta policy, campaign structure
├── Dynamic Context per turn:   ~500 tokens — max 3 products from existing pgvector
├── Conversation History:       compressed summary after Turn 3 (max 100 tokens)
└── Estimated total:            ~10,000-12,000 tokens per campaign

Optimization:
├── Anthropic prompt caching on static header
├── Stage 0 RAG reuse (existing searchRelevantProducts, max 3)
└── Turn 3+ history compression (summary, not full history)

Cost vs Revenue:
├── Actual cost: ~$0.03-0.05 per campaign
└── Merchant pays: flat 10 AI Response units (margin positive)
```

### Storage Plan

```
Conversation Sessions: Redis TTL 24h → zero permanent DB storage
AdCampaignDraft:       Archive/delete after 90 days (cron)
AiTokenUsageLog:       Aggregate + purge after 6 months (cron)
CapiEventLog:          Metadata only + purge after 60 days (cron)
RAG/Vector:            Existing pgvector reuse — no new index needed
```

---

## 3. Tenant Panel — New Menu Category & Guidance Text

### New Sidebar Category: `📊 MARKETING & ADS`

```
📊 MARKETING & ADS
├── CAPI Hub (Server-Side Tracking)
│   ├── Pixel Setup
│   ├── Event Configuration
│   └── Event Logs
├── Ad Account
└── Ads Copilot
```

### Guidance Text Requirements (Every New Page Must Have)

প্রতিটা নতুন page-এ নিচের UI elements বাধ্যতামূলক:

**1. Page Header Description (bilingual):**
```
EN: "Server-Side Tracking sends conversion data directly from ZiniChat's 
    server to Meta — more accurate than browser pixels, works even with 
    ad blockers."
BN: "সার্ভার-সাইড ট্র্যাকিং সরাসরি ZiniChat সার্ভার থেকে Meta-তে 
    কনভার্সন ডেটা পাঠায় — ব্রাউজার পিক্সেলের চেয়ে নির্ভুল।"
```

**2. Step-by-step Setup Guide (expandable accordion):**
- প্রতিটা field-এর পাশে ছোট info icon (?) → tooltip বা modal-এ বিস্তারিত
- "কোথায় পাবেন" link সহ (Meta Business Manager URL)

**3. Empty State (feature not set up yet):**
- Icon + headline + description + primary CTA button
- Example: `🎯 Pixel এখনো সেটআপ হয়নি → "Setup করুন" button`

**4. Feature Locked State (rollout/plan gate):**
- Existing `FeatureLockedModal` pattern reuse
- কোন plan-এ available সেটা দেখানো

**5. Inline Warnings:**
- Quota sharing warning: `"⚠️ Ads Copilot ও AI Chatbot একই AI Response কোটা শেয়ার করে"`
- Balance warning: `"⚠️ Ad Account-এ পর্যাপt balance নেই"`

---

## Phase 0 — Feature Rollout Toggle System

**Status:** `[x]`
**Estimated time:** 2-3 days
**Dependency:** None — এটা সব Phase-এর prerequisite

### Prisma Schema

```prisma
model FeatureRollout {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  featureKey  String   @unique
  // 'capi_hub' | 'meta_ads_account_connect' | 'meta_ads_agent' | 'ads_auto_scaling'
  isGlobal    Boolean  @default(false)
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tenants     FeatureRolloutTenant[]
  @@map("feature_rollouts")
}

model FeatureRolloutTenant {
  id               String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  featureRolloutId String         @db.Uuid
  tenantId         String         @db.Uuid
  isEnabled        Boolean        @default(true)
  enabledAt        DateTime       @default(now())
  featureRollout   FeatureRollout @relation(fields: [featureRolloutId], references: [id])
  tenant           Tenant         @relation(fields: [tenantId], references: [id])
  @@unique([featureRolloutId, tenantId])
  @@map("feature_rollout_tenants")
}
```

### Files

**Backend:**
- `[NEW]` `backend/src/feature-rollout/feature-rollout.module.ts`
- `[NEW]` `backend/src/feature-rollout/feature-rollout.service.ts`
  - `isFeatureEnabled(tenantId, key)` — hierarchy check: global → plan → tenant override
  - `enableForTenant(featureKey, tenantId)`
  - `disableForTenant(featureKey, tenantId)`
  - `enableGlobally(featureKey)`
- `[NEW]` `backend/src/feature-rollout/feature-rollout.controller.ts` — Superadmin only
- `[NEW]` `backend/src/feature-rollout/feature-rollout.service.spec.ts`
- `[MODIFY]` `backend/src/app.module.ts` — FeatureRolloutModule import
- `[MODIFY]` `backend/src/packages/packages.service.ts` — Plan.features check for capi_hub, meta_ads_copilot

**Frontend:**
- `[NEW]` `frontend/src/hooks/useRolloutFlag.ts`
  ```typescript
  export function useRolloutFlag(featureKey: string): { enabled: boolean; loading: boolean }
  ```
- `[NEW]` `frontend/src/app/sp@dmin/settings/feature-rollout/page.tsx`
  - Feature list table: featureKey, isGlobal toggle, tenant count enabled
  - Per-tenant search + enable/disable
- `[MODIFY]` `frontend/src/app/sp@dmin/ClientLayout.tsx`
  - "Feature Rollout" menu entry under SETTINGS

### Seed Data
```typescript
const rolloutKeys = [
  { featureKey: 'capi_hub', description: 'CAPI Hub server-side tracking' },
  { featureKey: 'meta_ads_account_connect', description: 'Meta Ad Account OAuth connection' },
  { featureKey: 'meta_ads_agent', description: 'Ads Copilot AI agent' },
  { featureKey: 'ads_auto_scaling', description: 'Auto-scaling engine' },
];
// All isGlobal: false by default
```

### Testing Plan
```
Unit Tests (feature-rollout.service.spec.ts):
├── isFeatureEnabled: false by default ✓
├── enableForTenant → true for that tenant only ✓
├── isGlobal: true → all tenants return true ✓
├── Tenant override revokes even if plan has feature ✓
├── Plan.features includes key → tenant on that plan gets access ✓
└── Access hierarchy order: global > plan > tenant override ✓

Integration Tests:
├── GET /feature-rollout (superadmin) → list ✓
├── PATCH /feature-rollout/:key/global (non-superadmin) → 403 ✓
└── useRolloutFlag hook returns correct boolean ✓
```

### Cross-Phase Dependency Test
```
After Phase 0 complete, verify before Phase 1:
├── Phase 1 backend service: isFeatureEnabled('ai_response_ad_deduction') ← must work
└── Phase 2 backend guard: isFeatureEnabled('capi_hub') ← must return false (not yet enabled)
```

### Exit Criteria
- `[x]` Superadmin UI থেকে specific tenant-এর জন্য toggle → instant effect
- `[x]` Global enable → সব tenant-এ true
- `[x]` Plan.features check works
- `[x]` `npx tsc --noEmit` → 0 errors
- `[x]` Jest: all unit tests pass

---

## Phase 1 — AI Response Deduction Engine (Quota Saga)

**Status:** `[x]`
**Estimated time:** 1-2 days
**Dependency:** Phase 0 complete

### Prisma Schema (AiUsageLog extend)

```prisma
model AiUsageLog {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String   @db.Uuid
  assistantId   String?  @db.Uuid          // CHANGED: nullable (ad entries have no assistant)
  featureName   String?                    // NEW: null=chat, 'AD_RUN', 'AD_AUTOSCALE'
  unitsConsumed Int      @default(1)       // NEW: chat=1, ad-run=10, autoscale=5
  status        String   @default("COMMITTED") // NEW: RESERVED | COMMITTED | REFUNDED
  referenceId   String?                    // NEW: AdCampaignDraft.id (idempotent ops)
  tokensUsed    Int
  cachedTokens  Int      @default(0)
  costUsd       Decimal  @db.Decimal(10, 4)
  createdAt     DateTime @default(now())

  tenant    Tenant       @relation(fields: [tenantId], references: [id])
  assistant AiAssistant? @relation(fields: [assistantId], references: [id])

  @@index([tenantId, createdAt])
  @@index([referenceId])
  @@map("ai_usage_logs")
}
```

> **Migration Note:** পুরনো rows-এর `unitsConsumed` default `1` → `count()` to `sum(unitsConsumed WHERE status IN ('COMMITTED','RESERVED'))` → backward-compatible।

### Files

- `[MODIFY]` `backend/src/tenants/quota.service.ts`
  ```typescript
  // checkAiQuota(): count() → aggregate._sum.unitsConsumed (COMMITTED + RESERVED only)
  async checkAiQuota(tenantId: string): Promise<void>

  // NEW:
  async reserveAiResponseUnits(
    tenantId: string, units: number, featureName: string, referenceId: string
  ): Promise<void>
  // Redis lock 'lock:tenant:{id}:ai-quota'
  // Quota check → RESERVED row insert
  // Throws if quota exceeded (existing error style)
  // Triggers existing 80%/100% notification hooks

  async commitReservedUnits(referenceId: string): Promise<void>
  // RESERVED → COMMITTED

  async refundReservedUnits(referenceId: string, reason?: string): Promise<void>
  // RESERVED → REFUNDED (idempotent — duplicate call = no error)
  ```

- `[MODIFY]` `backend/src/tenants/quota.service.spec.ts` — 3 new methods + race condition test

### Testing Plan
```
Unit Tests:
├── reserveAiResponseUnits → RESERVED row created ✓
├── commitReservedUnits → COMMITTED ✓
├── refundReservedUnits → REFUNDED ✓
├── Duplicate refund (same referenceId) → idempotent, no error ✓
├── Race condition: 2 concurrent reserves → only 1 succeeds (Redis lock) ✓
├── checkAiQuota sum includes RESERVED + COMMITTED ✓
└── 80%/100% notification triggers correctly with sum logic ✓

Manual Verification:
└── Dashboard "X/Y AI responses" shows correct count after reserve/refund
```

### Cross-Phase Dependency Test
```
After Phase 1, verify before Phase 6:
├── reserveAiResponseUnits(tenantId, 10, 'AD_RUN', 'test-ref') → RESERVED row ✓
├── commitReservedUnits('test-ref') → COMMITTED ✓
├── refundReservedUnits('test-ref') → (re-reserve first, then refund) REFUNDED ✓
└── Dashboard AI usage count changes correctly ✓
```

### Exit Criteria
- `[x]` `QuotaService` can reserve, commit, and refund units
- `[x]` Jest: Saga unit tests pass (concurrent locks mock-tested)
- `[x]` `npx tsc --noEmit` → 0 errors
- `[x]` Jest: all pass including existing quota tests

---

## Phase 2 — CAPI Hub (Multi-Tenant Server-Side Tracking)

**Status:** `[x]`
**Estimated time:** 4-5 days
**Dependency:** Phase 0 complete (rollout flag `capi_hub`)

### Prisma Schema

```prisma
model TenantCapiIntegration {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String   @unique @db.Uuid
  pixelId       String
  datasetId     String?
  accessToken   String   // encrypted via CryptoService
  testEventCode String?
  webhookToken  String   @unique @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  webhookSecret String   // bcrypt hashed — for X-ZiniChat-Secret validation
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  eventConfigs  TenantCapiEventConfig[]
  events        CapiEventLog[]
  @@map("tenant_capi_integrations")
}

model TenantCapiEventConfig {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId              String   @db.Uuid
  integrationId         String   @db.Uuid
  eventName             String
  // Meta standard: Purchase | Lead | ViewContent | InitiateCheckout | Schedule |
  //               CompleteRegistration | Contact | PageView | AddToCart | Search
  isEnabled             Boolean  @default(false)

  // Sources
  sourceInboxAiIntent   Boolean  @default(false)  // OrchestratorService order intent
  sourceOrderCompleted  Boolean  @default(false)  // OrdersService status=completed
  sourceLeadCreated     Boolean  @default(false)  // LeadsService new lead
  sourceWidgetForm      Boolean  @default(false)  // WebsiteWidget pre-chat form
  sourceAppointment     Boolean  @default(false)  // Booking/appointment confirm
  sourceExternalWebhook Boolean  @default(false)  // External POST /capi-hub/webhook/:token

  // Parameters to include
  includeValue          Boolean  @default(true)
  includeCurrency       Boolean  @default(true)
  includeOrderId        Boolean  @default(false)
  includeContentIds     Boolean  @default(false)
  includeUserData       Boolean  @default(true)   // always SHA-256 hashed before send

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  tenant        Tenant                @relation(fields: [tenantId], references: [id])
  integration   TenantCapiIntegration @relation(fields: [integrationId], references: [id])
  @@unique([tenantId, eventName])
  @@map("tenant_capi_event_configs")
}

model CapiEventLog {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  integrationId String   @db.Uuid
  tenantId      String   @db.Uuid
  eventName     String
  eventId       String?  // dedup key
  source        String   // 'inbox_ai' | 'order' | 'lead' | 'widget' | 'webhook'
  status        String   // 'sent' | 'failed' | 'suppressed_duplicate'
  responseCode  Int?
  errorMessage  String?
  // NO payload field — metadata only
  createdAt     DateTime @default(now())
  integration   TenantCapiIntegration @relation(fields: [integrationId], references: [id])
  @@index([tenantId, createdAt])
  @@index([eventId])          // dedup lookup
  @@map("capi_event_logs")
}
```

### Files

**Backend:**
- `[NEW]` `backend/src/capi-hub/capi-hub.module.ts`
- `[NEW]` `backend/src/capi-hub/capi-hub.service.ts`
  - `createIntegration(tenantId, dto)` — encrypted token save
  - `fireEvent(tenantId, eventName, data, source)` — PII hash + send + dedup check
  - `handleWebhook(webhookToken, secret, body)` — external webhook endpoint handler
  - `testEvent(tenantId, eventName)` — test_event_code included
  - `getEventLogs(tenantId, filters)` — last 200 logs
  - `getEventConfigs(tenantId)` — all event configs
  - `updateEventConfig(tenantId, eventName, dto)`
  - `purgeOldLogs()` — 60-day retention (called by cron)
- `[NEW]` `backend/src/capi-hub/capi-hub.controller.ts`
  - `POST /capi-hub/integration` — create/update pixel
  - `GET /capi-hub/integration` — get current config
  - `GET /capi-hub/event-configs` — all event configs
  - `PATCH /capi-hub/event-configs/:eventName`
  - `POST /capi-hub/test-event/:eventName`
  - `GET /capi-hub/logs`
  - `POST /capi-hub/webhook/:webhookToken` — PUBLIC (no JWT, secret in header)
- `[NEW]` `backend/src/capi-hub/capi-hub.processor.ts` — BullMQ queue (retry on failure)
- `[NEW]` `backend/src/capi-hub/capi-hub.service.spec.ts`
- `[MODIFY]` `backend/src/orchestrator/orchestrator.service.ts`
  - Order intent detected → `capiHubService.fireEvent(tenantId, 'Purchase', {...}, 'inbox_ai')`
  - Graceful skip if tenant has no CAPI integration
- `[MODIFY]` `backend/src/orders/orders.service.ts`
  - Order status → completed → fire Purchase event
- `[MODIFY]` `backend/src/leads/leads.service.ts`
  - New lead created → fire Lead event
- `[MODIFY]` `backend/src/website-widget/website-widget.service.ts`
  - Widget form submit → fire Lead event
- `[MODIFY]` `backend/src/app.module.ts` — CapiHubModule
- `[MODIFY]` `backend/src/stats/tenant-stats.service.ts` — CAPI stats for superadmin

**Frontend (Tenant Panel):**
- `[NEW]` `frontend/src/app/(tenant)/dashboard/settings/capi-hub/page.tsx`
  **Page Sections:**
  1. **Page Header** — bilingual description + "What is server-side tracking?" expandable guide
  2. **Setup Status Badge** — Pixel connected ✅ / ⚠️ Not setup
  3. **Pixel Setup Card** — Pixel ID, Dataset ID, Access Token fields
     - Each field-এ info tooltip: "কোথায় পাবেন → Meta Events Manager > Settings"
     - Test Connection button → green/red badge
  4. **Webhook Card** — External webhook URL + Secret Key (copy button)
     - Guide: "আপনার website থেকে এই URL-এ POST request পাঠান"
  5. **Event Configuration Table** — per event row:
     - Toggle (enable/disable)
     - Source checkboxes (Inbox AI / Order / Lead / Widget / Webhook)
     - Parameters checkboxes
     - "Test" button
     - Vertical-specific recommendations highlighted
  6. **Event Logs** — last 200 rows, filterable by event/status/source
  - `useRolloutFlag('capi_hub')` guard → FeatureLocked state if not enabled

- `[MODIFY]` `frontend/src/app/(tenant)/dashboard/ClientLayout.tsx`
  - `📊 MARKETING & ADS` category add
  - `CAPI Hub` menu entry (rollout-gated)

**Superadmin:**
- `[MODIFY]` `frontend/src/app/sp@dmin/tenants/[id]/page.tsx`
  - New "CAPI Hub" tab: pixel status, event counts, success rate, last event

- `[MODIFY]` `frontend/src/data/help-docs/helpDocs.ts` — CAPI Hub article

### PII Hashing (always before send)
```typescript
function hashPII(value: string): string {
  return crypto.createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}
// Applied to: email, phone, firstName, lastName, city, zip, country
```

### Deduplication Logic
```typescript
// Before sending, check last 24h for same eventId:
const existing = await prisma.capiEventLog.findFirst({
  where: { eventId: data.eventId, tenantId, createdAt: { gte: minus24h } }
});
if (existing) {
  // Log as 'suppressed_duplicate', do NOT send to Meta
  return;
}
```

### Multi-Vertical Event Recommendations
```
Retail:      Purchase ⭐, Lead, ViewContent, AddToCart, InitiateCheckout
Property:    Lead ⭐, Schedule, ViewContent, Contact
Hospitality: Schedule ⭐, Purchase, Lead, Contact
Healthcare:  Schedule ⭐, Lead, Contact, CompleteRegistration
Education:   Lead ⭐, CompleteRegistration, Schedule, Contact
Tech/SaaS:   Lead ⭐, CompleteRegistration, Contact
Logistics:   Lead ⭐, Contact, Purchase
Finance:     Lead ⭐, Contact, Schedule
```

### Testing Plan
```
Unit Tests (capi-hub.service.spec.ts):
├── createIntegration → token encrypted ✓
├── fireEvent → Meta CAPI endpoint called (MSW mock) ✓
├── fireEvent → PII hashed before send ✓
├── Duplicate eventId within 24h → suppressed, not sent ✓
├── testEvent → test_event_code in payload ✓
├── handleWebhook invalid secret → 401 ✓
├── handleWebhook valid → event fired ✓
├── BullMQ retry: Meta fails 2x, succeeds 3rd ✓
├── purgeOldLogs → older than 60d deleted ✓
└── Rollout flag false → endpoint 403 ✓

Integration Tests:
├── OrchestratorService order intent → CapiEventLog created ✓
├── OrdersService completed → Purchase event fired ✓
├── External webhook → event fired + log created ✓
└── Tenant without CAPI → graceful skip (no error) ✓
```

### Cross-Phase Dependency Test
```
After Phase 2, verify before Phase 6 (Ads Copilot):
├── CAPI Purchase event fires when order intent detected ✓
├── Ads Copilot campaign run → future: CAPI Purchase should NOT double-fire ✓
│   (Phase 6-এ campaign_id attribution check add করব)
└── Superadmin tenant CAPI tab shows correct stats ✓
```

### Exit Criteria
- `[x]` Merchant pixel connect করতে পারছে
- `[x]` Test event send → Meta Events Manager-এ দেখা যাচ্ছে
- `[x]` Event log UI-তে দেখা যাচ্ছে
- `[x]` External webhook → event fires
- `[x]` Duplicate suppression works
- `[x]` `npx tsc --noEmit` → 0 errors
- `[x]` Jest: all pass

---

## Phase 3 — Superadmin MCP Connectivity Console ⛔ BLOCKER

**Status:** `[x]`
**Estimated time:** 3-4 days
**Dependency:** Phase 0 complete
**Note:** Phase 4, 5, 6, 7 শুরু হবে না এটা ছাড়া

### Prisma Schema

```prisma
model MetaMarketingApiConfig {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  appId              String
  appSecret          String?   // encrypted via CryptoService
  apiVersion         String    @default("v21.0")
  systemUserToken    String?   // encrypted — platform-level (optional, for admin ops only)
  webhookVerifyToken String?
  isEnabled          Boolean   @default(false)  // MASTER KILL-SWITCH
  adRunUnitCost      Int       @default(10)     // configurable
  autoScaleUnitCost  Int       @default(5)      // configurable
  lastTestedAt       DateTime?
  lastTestStatus     String?   // 'success' | 'failed'
  lastTestMessage    String?
  updatedByUserId    String?   @db.Uuid
  updatedAt          DateTime  @updatedAt
  @@map("meta_marketing_api_config")
}

model McpToolRegistry {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  toolKey     String   @unique
  // 'get_ad_insights' | 'list_campaigns' | 'create_campaign' |
  // 'create_adset' | 'create_ad' | 'scale_ad_budget' | 'pause_ad'
  displayName String
  riskLevel   String   // 'READ_ONLY' | 'WRITE_SPEND' | 'WRITE_STRUCTURAL'
  isEnabled   Boolean  @default(false)
  updatedAt   DateTime @updatedAt
  @@map("mcp_tool_registry")
}
```

### Files

**Backend:**
- `[NEW]` `backend/src/meta-marketing-config/meta-marketing-config.module.ts`
- `[NEW]` `backend/src/meta-marketing-config/meta-marketing-config.service.ts`
  - `getConfig()` — runtime read (never expose raw secret)
  - `updateConfig(dto)` — Superadmin only, audit log
  - `testConnection()` — Graph API ping, save lastTestStatus
  - `isMcpEnabled()` — Phase 5 bootstrap gate
  - `getEnabledTools()` — Phase 5 tool registration
  - `getAdRunUnitCost()` / `getAutoScaleUnitCost()` — Phase 6/7 use
- `[NEW]` `backend/src/meta-marketing-config/meta-marketing-config.controller.ts`
  - All endpoints: `RolesGuard` + `manage:settings` permission
  - `POST /meta-marketing-config/test-connection`
  - `GET/PATCH /meta-marketing-config`
  - `GET/PATCH /meta-marketing-config/tools`
- `[NEW]` `backend/src/meta-marketing-config/meta-marketing-config.service.spec.ts`
- `[NEW]` `backend/src/prisma/seeds/mcp-tools-seed.ts` — 7 tools, all isEnabled: false
- `[MODIFY]` `backend/src/audit-logs/audit-logs.service.ts` — `META_MARKETING_CONFIG_UPDATED` event
- `[MODIFY]` `backend/src/app.module.ts` — MetaMarketingConfigModule

**Frontend (Superadmin):**
- `[NEW]` `frontend/src/app/sp@dmin/settings/meta-marketing-api/page.tsx`
  - Layout: `facebook-auth/page.tsx` pattern copy + adapt
  - **Section 1:** App ID / App Secret / API Version dropdown / System User Token
  - **Section 2:** "Test Connection" button → green ✅ / red ❌ badge + message
  - **Section 3:** Master Kill-Switch toggle (isEnabled) + warning text
  - **Section 4:** Cost Config — `adRunUnitCost` / `autoScaleUnitCost` number inputs
  - **Section 5:** MCP Tool Registry list
    - Per tool: toggle + riskLevel badge (READ_ONLY=green, WRITE_SPEND=orange, WRITE_STRUCTURAL=red)
  - Audit log on every save
- `[MODIFY]` `frontend/src/app/sp@dmin/ClientLayout.tsx`
  - "Meta Marketing API" menu under SETTINGS

### Meta Ad Review Webhook (Policy Rejection)
```typescript
// Phase 3-এ Meta webhook subscription setup:
// POST /meta-marketing-config/webhook/meta-ad-review
// Handles: ad status changes (PENDING_REVIEW → ACTIVE | REJECTED)
// REJECTED → trigger Phase 6 saga compensation
```

### Testing Plan
```
Unit Tests:
├── getConfig() → never exposes raw appSecret ✓
├── testConnection() valid → lastTestStatus 'success' ✓
├── testConnection() invalid → lastTestStatus 'failed' + message ✓
├── isMcpEnabled() false → returns false ✓
├── getAdRunUnitCost() → returns configured value ✓
└── Non-superadmin access → 403 ✓

Integration Tests:
├── PATCH /meta-marketing-config (superadmin) → audit log created ✓
├── POST /meta-marketing-config/test-connection → badge updates ✓
└── Seed: 7 tools all isEnabled false → confirmed ✓
```

### Cross-Phase Dependency Test
```
After Phase 3, verify before Phase 4:
├── isMcpEnabled() = false (default) ✓
├── Phase 4 OAuth URL generation uses MetaMarketingApiConfig.appId ✓
└── Master kill-switch: if isEnabled=false, Phase 5 MCP server refuses to start ✓
```

### Exit Criteria
- `[x]` App ID/Secret বসিয়ে "Test Connection" → সবুজ badge।
- `[x]` `isEnabled: false` → MCP endpoint graceful 503 (Phase 5 চেক)।
- `[x]` **এই Phase শেষ না হলে Phase 4-9 শুরু হবে না।**works
- `[x]` Audit log on config save
- `[x]` `npx tsc --noEmit` → 0 errors
- `[x]` Jest: all pass

---

## Phase 4 — Tenant Meta Ad Account Connection

**Status:** `[x]`
**Estimated time:** 3-4 days
**Dependency:** Phase 3 complete (MetaMarketingApiConfig.appId needed for OAuth)

### Prisma Schema

```prisma
model TenantMetaAdAccount {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @db.Uuid
  adAccountId     String   // act_XXXXXX
  adAccountName   String?
  accessToken     String   // encrypted — user-level long-lived token
  tokenExpiresAt  DateTime?
  currency        String?  // 'BDT', 'USD'
  timezone        String?
  facebookPageId  String?  // auto-populated from Messenger channel connection
  facebookPageName String?
  instagramActorId String? // auto-populated if Instagram connected
  status          String   @default("active") // 'active' | 'disconnected' | 'token_expired'
  connectedAt     DateTime @default(now())
  updatedAt       DateTime @updatedAt
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, adAccountId])
  @@map("tenant_meta_ad_accounts")
}
```

### Files

**Backend:**
- `[NEW]` `backend/src/meta-ads-account/meta-ads-account.module.ts`
- `[NEW]` `backend/src/meta-ads-account/meta-ads-account.service.ts`
  - `initiateOAuth(tenantId)` — MetaMarketingApiConfig থেকে appId read → OAuth URL generate
    - Scopes: `ads_management,ads_read,business_management,pages_show_list,pages_read_engagement`
  - `handleCallback(code, tenantId)` — token exchange → ad account list fetch → save
  - `autoLinkFacebookPage(tenantId)` — existing Messenger channel → page ID auto-populate
  - `getConnectedAccounts(tenantId)` — with balance check
  - `checkAdAccountBalance(tenantId, adAccountId)` — `account_status`, `balance`, `spend_cap`
  - `disconnectAccount(tenantId, adAccountId)`
  - `refreshTokenIfNeeded(tenantId)` — long-lived token refresh
- `[NEW]` `backend/src/meta-ads-account/meta-ads-account.controller.ts`
- `[NEW]` `backend/src/meta-ads-account/meta-ads-account.service.spec.ts`
- `[MODIFY]` `backend/src/app.module.ts` — MetaAdsAccountModule

**Frontend (Tenant Panel):**
- `[NEW]` `frontend/src/app/(tenant)/dashboard/settings/meta-ads/page.tsx`
  **Page Sections:**
  1. **Page Header** — "Meta Ad Account সংযুক্ত করুন"
     - EN: "Connect your Facebook Ad Account to run AI-powered ad campaigns directly from ZiniChat."
     - BN: "আপনার Facebook Ad Account সংযুক্ত করুন এবং ZiniChat থেকেই AI-চালিত বিজ্ঞাপন পরিচালনা করুন।"
  2. **Prerequisites Check Card:**
     - ✅ Facebook Page connected (auto-detect from Messenger)
     - ⚠️ No Messenger connected → "Messenger channel connect করুন আগে" link
     - ✅ Ad Account has balance (warning if low)
  3. **Connect Button** → OAuth redirect (disabled if page not connected)
  4. **Connected Account Card:**
     - Account name, ID, currency, balance status
     - Facebook Page linked
     - Instagram linked (if available)
     - Disconnect button (with confirmation modal)
  5. **Step-by-step Guide:** "Facebook-এ Advertiser permissions কীভাবে দেবেন"
  - `useRolloutFlag('meta_ads_account_connect')` guard
- `[MODIFY]` `frontend/src/app/(tenant)/dashboard/ClientLayout.tsx`
  - "Ad Account" menu under MARKETING & ADS

### Testing Plan
```
Unit Tests:
├── initiateOAuth() → URL contains MetaMarketingApiConfig.appId ✓
├── handleCallback() valid code → token encrypted + page auto-linked ✓
├── autoLinkFacebookPage() → existing Messenger page ID populated ✓
├── checkAdAccountBalance() → balance + status returned ✓
├── disconnectAccount() → status 'disconnected' ✓
├── MetaMarketingApiConfig.isEnabled false → OAuth blocked ✓
└── refreshTokenIfNeeded() → token updated ✓

Integration Tests:
├── OAuth flow mock: code exchange → account appears in list ✓
├── Messenger not connected → prerequisites check shows warning ✓
└── No ad account → Ads Copilot page shows setup prompt ✓
```

### Cross-Phase Dependency Test
```
After Phase 4, verify before Phase 5:
├── TenantMetaAdAccount exists with valid token ✓
├── facebookPageId populated (required for Phase 6 ad creation) ✓
├── Phase 5 MCP tool: getAdInsights uses tenant's own token ✓
└── Balance check: ad account has sufficient balance (else Phase 6 block) ✓
```

### Exit Criteria
- `[x]` Facebook OAuth flow completes, account shows in UI
- `[x]` Page auto-linked from Messenger connection
- `[x]` Balance warning shows if low
- `[x]` Messenger not connected → blocked with guidance
- `[x]` `npx tsc --noEmit` → 0 errors

---

## Phase 5 — MCP Server + Read-Only Tools

**Status:** `[x]`
**Estimated time:** 5-7 days
**Dependency:** Phase 3 + Phase 4 complete

### Files

**Backend:**
- `[NEW]` `backend/src/mcp-ads/mcp-ads.module.ts`
- `[NEW]` `backend/src/mcp-ads/mcp-ads.server.ts`
  - `onModuleInit()`:
    1. `MetaMarketingApiConfigService.isMcpEnabled()` check → false: log warning, don't register tools
    2. Load enabled tools from `McpToolRegistry.getEnabledTools()`
    3. Register only enabled tools
  - Session-level tenant context (tenantId from JWT)
- `[NEW]` `backend/src/mcp-ads/mcp-ads.service.ts`
  - `getAdInsights(tenantId, adAccountId, datePreset, fields)` — READ_ONLY
  - `listCampaigns(tenantId, adAccountId, status?)` — READ_ONLY
  - `listAdSets(tenantId, campaignId)` — READ_ONLY
  - `getAdAccountBalance(tenantId, adAccountId)` — READ_ONLY
  - All methods: fetch tenant token from `TenantMetaAdAccount`, never use superadmin token
- `[NEW]` `backend/src/mcp-ads/mcp-ads.controller.ts` — tenant-gated REST endpoints
- `[NEW]` `backend/src/mcp-ads/mcp-ads.service.spec.ts`
- `[MODIFY]` `backend/package.json` — `"@modelcontextprotocol/sdk": "^1.x.x"`
- `[MODIFY]` `backend/src/app.module.ts` — McpAdsModule

**Frontend (Tenant Panel):**
- `[NEW]` `frontend/src/app/(tenant)/dashboard/ads-agent/page.tsx` (Phase 5 version — read-only)
  **Page Sections:**
  1. **Page Header:**
     - EN: "Ads Copilot — AI-powered ad campaign manager. Create, monitor, and optimize your Meta ads with AI assistance."
     - BN: "Ads Copilot — AI-চালিত বিজ্ঞাপন ম্যানেজার। AI-এর সাহায্যে Meta বিজ্ঞাপন তৈরি, পর্যবেক্ষণ ও অপ্টিমাইজ করুন।"
  2. **Quota Warning Banner:** "⚠️ এই ফিচার আপনার AI Response কোটা শেয়ার করে"
  3. **Ad Account Selector** — connected accounts dropdown
  4. **Balance Status** — green/red badge
  5. **Campaign List** (read-only Phase 5) — name, status, spend, impressions
  6. **Insights Panel** — basic metrics display
  - `useRolloutFlag('meta_ads_agent')` guard

### Testing Plan
```
Unit Tests:
├── isMcpEnabled() false → no tools registered ✓
├── McpToolRegistry isEnabled false → tool not exposed ✓
├── getAdInsights() → correct Graph API call (MSW mock) ✓
├── listCampaigns() → tenant isolation (own token only) ✓
├── Cross-tenant isolation: tenantA cannot access tenantB accounts ✓
└── Tool with WRITE risk → not available in Phase 5 (read-only only) ✓
```

### Cross-Phase Dependency Test
```
After Phase 5, verify before Phase 6:
├── listCampaigns() works with real test ad account ✓
├── getAdAccountBalance() returns real balance ✓
├── MCP server handles isEnabled=false gracefully ✓
└── Phase 6: create_campaign tool NOT yet enabled in McpToolRegistry ✓
     (Superadmin must explicitly enable before Phase 6 testing)
```

### Exit Criteria
- `[x]` MCP server starts, read-only tools registered
- `[x]` Campaign list visible in UI for test ad account
- `[x]` Kill-switch off → graceful 503
- `[x]` Tenant isolation: cross-tenant access impossible

---

## Phase 6 — AI Ad Creator + Write Tools + 5-Turn Flow

**Status:** `[x]`
**Estimated time:** 14-21 days
**Dependency:** Phase 1 + Phase 3 + Phase 4 + Phase 5 complete

### Prisma Schema

```prisma
model AdCampaignDraft {
  id                      String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId                String   @db.Uuid
  adAccountId             String
  facebookPageId          String
  instagramActorId        String?
  status                  String   @default("DRAFT")
  // DRAFT | PENDING_REVIEW | ACTIVE | FAILED_REFUNDED | PAUSED | REJECTED_BY_META
  aiResponseUnitsReserved Int      @default(10)   // from MetaMarketingApiConfig.adRunUnitCost
  sessionKey              String?  // Redis key for conversation (TTL 24h)

  // Turn 1: What to promote
  productIds              String[] // from catalog
  promotionDescription    String?

  // Turn 2: Audience
  targetLocations         Json?    // [{city, country, radius}]
  ageMin                  Int?
  ageMax                  Int?
  audienceType            String   @default("ADVANTAGE_PLUS") // 'ADVANTAGE_PLUS' | 'MANUAL'

  // Turn 3: Budget & Placements
  budgetType              String   @default("DAILY") // 'DAILY' | 'LIFETIME'
  budget                  Decimal? @db.Decimal(10, 2)
  currency                String?
  durationDays            Int?
  placements              String[] // ['facebook', 'instagram']

  // Turn 4: Creative
  headline                String?
  bodyText                String?
  callToAction            String?
  imageSourceType         String?  // 'catalog' | 'upload' | 'url'
  imageProductId          String?  // if catalog
  imageUrl                String?  // after upload to Meta
  metaImageHash           String?  // returned by Meta adimages API

  // Turn 5: Final approval
  approvedAt              DateTime?

  // Meta resource IDs
  metaCampaignId          String?
  metaAdSetId             String?
  metaAdId                String?
  metaAdReviewStatus      String?  // 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  failureReason           String?

  // Auto-scaling (Phase 7)
  autoScalingEnabled      Boolean  @default(false)
  autoScalingMaxBudget    Decimal? @db.Decimal(10, 2)
  autoScalingLastActionAt DateTime?
  autoScalingActionsToday Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId, status])
  @@map("ad_campaign_drafts")
}

model AiTokenUsageLog {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String   @db.Uuid
  featureName  String   // 'AD_CREATOR' | 'AD_INSIGHTS_SUMMARY'
  modelName    String
  inputTokens  Int
  outputTokens Int
  cachedTokens Int      @default(0)
  costUsd      Decimal  @db.Decimal(10, 6)
  draftId      String?
  createdAt    DateTime @default(now())
  @@index([tenantId, createdAt])
  @@map("ai_token_usage_logs")
}
```

### 5-Turn Conversation Design

```
Turn 1 — What to Promote
  AI: "কী প্রমোট করতে চান? আপনার catalog থেকে product সাজেস্ট করছি..."
  Merchant: Product select বা describe করে
  System: Stage 0 RAG → max 3 relevant products fetch

Turn 2 — Target Audience
  AI: "Advantage+ Audience recommended। কোন এলাকায় ad দিতে চান?"
  Merchant: Location, age range (optional)
  System: Advantage+ as default, manual as option

Turn 3 — Budget & Duration
  AI: "দৈনিক কত বাজেট? কতদিন চালাবেন? Facebook, Instagram নাকি দুটোই?"
  Merchant: Budget (in their ad account currency), duration, placements
  System: Balance check warning if budget > available balance

Turn 4 — Creative Review
  AI: "AI-generated copy:" [headline, body, CTA]
  AI: "Product catalog থেকে এই image সাজেস্ট করছি:" [thumbnail]
  Merchant: Approve / Edit copy / Upload different image
  System: Upload image to Meta adimages → get metaImageHash

Turn 5 — Final Approval Card
  ┌─────────────────────────────────────┐
  │ 📋 Campaign Summary                 │
  │ Product: [name]                     │
  │ Audience: Advantage+ · Dhaka        │
  │ Budget: ৳500/day · 7 days           │
  │ Placement: Facebook + Instagram     │
  │ Creative: [image thumbnail] [copy]  │
  │                                     │
  │ ⚠️ This will use 10 AI Response     │
  │    units from your quota            │
  │    (Remaining: X/Y)                 │
  │                                     │
  │ [Cancel]  [✅ Approve & Run Ad]     │
  └─────────────────────────────────────┘
```

### Approve & Run Ad — Saga Pattern

```
1. QuotaService.reserveAiResponseUnits(tenantId, adRunUnitCost, 'AD_RUN', draftId)
   ↓ FAIL → throw "AI Response কোটা শেষ, addon কিনুন" (link to addon page)
2. McpAdsService.createCampaign(tenantId, draft)
   ↓ FAIL → refundReservedUnits(draftId, 'campaign_create_failed')
            → status: FAILED_REFUNDED → notify merchant
3. McpAdsService.createAdSet(tenantId, campaignId, draft)
   ↓ FAIL → McpAdsService.pauseCampaign(campaignId) [compensate]
            → refundReservedUnits(draftId, 'adset_create_failed')
            → status: FAILED_REFUNDED → notify merchant
4. McpAdsService.createAd(tenantId, adSetId, draft)
   ↓ FAIL → McpAdsService.pauseAdSet(adSetId) [compensate]
            → McpAdsService.pauseCampaign(campaignId) [compensate]
            → refundReservedUnits(draftId, 'ad_create_failed')
            → status: FAILED_REFUNDED → notify merchant
5. All success:
   → commitReservedUnits(draftId)
   → status: PENDING_REVIEW
   → AiTokenUsageLog entry (actual tokens used)
   → notify merchant: "বিজ্ञাপন Meta review-এ আছে"
```

### Meta Ad Review Webhook Handler (Policy Rejection)

```typescript
// POST /meta-marketing-config/webhook/meta-ad-review
async handleAdReviewWebhook(payload: MetaWebhookPayload) {
  if (payload.status === 'REJECTED') {
    // 1. Find AdCampaignDraft by metaAdId
    // 2. refundReservedUnits(draftId, 'meta_policy_rejected')
    // 3. status: REJECTED_BY_META
    // 4. Notify merchant with rejection reason
    // 5. Suggest: edit ad copy and resubmit
  }
  if (payload.status === 'ACTIVE') {
    // status: ACTIVE, notify merchant "Ad is now running!"
  }
}
```

### Campaign Management UI

```
Campaign Card:
├── Status badge: PENDING_REVIEW | ACTIVE | PAUSED | REJECTED_BY_META
├── Spend today / Total spend
├── Impressions / Clicks / CTR
├── ROAS (if Purchase event configured)
├── Actions:
│   ├── Pause / Resume (if ACTIVE/PAUSED)
│   ├── View insights (last 7d chart)
│   ├── Enable Auto-scaling (Phase 7 toggle)
│   └── [Cannot edit creative after launch — Meta rule]
└── Rejection reason (if REJECTED_BY_META) + "Edit & Resubmit" button
```

### Prompt Optimization

```typescript
// Static Header (Anthropic cached):
const STATIC_HEADER = `
You are ZiniChat's Ads Copilot. You help merchants create Meta ad campaigns.
Rules:
- Use Advantage+ Audience as default targeting
- Headlines: max 40 characters
- Body text: max 125 characters  
- CTA: max 20 characters
- Never use: "best", "guaranteed", "100% effective", before/after claims
- Always recommend campaigns that maximize conversions, not just clicks
- Use Meta's latest campaign structure: Campaign > Ad Set > Ad
`;
// Cache key: static, never changes → prompt caching saves 80%+ on repeat calls

// Dynamic Context per turn (max 3 products from catalog RAG):
const context = await searchRelevantProducts(tenantId, userInput, 3);

// History compression after Turn 3:
const compressedHistory = turn > 3
  ? `[Summary: Promoting ${product}, targeting ${location}, budget ${budget}]`
  : fullHistory;
```

### Files (Key ones)

- `[NEW]` `backend/src/ads-agent/ads-agent.module.ts`
- `[NEW]` `backend/src/ads-agent/ads-agent.service.ts` — full saga + conversation
- `[NEW]` `backend/src/ads-agent/ads-agent.controller.ts`
- `[NEW]` `backend/src/ads-agent/ads-agent.service.spec.ts`
- `[MODIFY]` `backend/src/mcp-ads/mcp-ads.service.ts` — add write tools
- `[MODIFY]` `backend/src/smtp/smtp.service.ts`
  - `triggerAdPublishedEmail()`
  - `triggerAdFailedRefundedEmail()`
  - `triggerAdRejectedByMetaEmail()`
  - `triggerAdActiveEmail()`
- `[MODIFY]` `frontend/.../ads-agent/page.tsx` — full 5-turn chat UI upgrade
- `[MODIFY]` `frontend/src/app/sp@dmin/tenants/[id]/page.tsx` — Ads Copilot tab

### Testing Plan
```
Unit Tests (ads-agent.service.spec.ts):
├── 5-turn conversation → structured draft generated (mock LLM) ✓
├── History compression after Turn 3 ✓
├── Image upload to Meta adimages → metaImageHash returned ✓
├── Saga: createAdSet fails → campaign paused + units refunded ✓
├── Saga: createAd fails → campaign+adset paused + units refunded ✓
├── Concurrent approvals → only 1 succeeds (Redis lock) ✓
├── Quota exceeded → throws + top-up prompt ✓
├── Meta rejection webhook → units refunded + status REJECTED_BY_META ✓
├── Email notifications: publish/fail/reject/active ✓
└── AiTokenUsageLog entry created per LLM call ✓

Integration Tests:
├── Full 5-turn → approval → campaign created (MSW mock) ✓
├── Balance insufficient → warning shown, approval blocked ✓
└── Page not connected → ads creation blocked ✓
```

### Cross-Phase Dependency Test
```
After Phase 6, verify before Phase 7:
├── AdCampaignDraft with status ACTIVE exists ✓
├── reserveAiResponseUnits + commitReservedUnits saga works end-to-end ✓
├── McpToolRegistry: create_campaign, create_adset, create_ad all isEnabled ✓
└── autoScalingEnabled field exists on draft (Phase 7 needs it) ✓
```

### Exit Criteria
- `[x]` 5-turn conversation completes
- `[x]` "Approve & Run Ad" → Meta campaign created (test ad account)
- `[x]` Saga: failure at any step → compensation + refund
- `[x]` Meta rejection webhook → refund + notification
- `[x]` Campaign management: pause/resume works
- `[x]` `npx tsc --noEmit` → 0 errors
- `[x]` Jest: all pass including all saga paths

---

## Phase 7 — Safety-Guardrail Auto-Scaling Engine

**Status:** `[x]`
**Estimated time:** 7-10 days
**Dependency:** Phase 6 complete

### Logic

```
Every 6 hours (BullMQ CRON):
1. Fetch all ACTIVE campaigns with autoScalingEnabled = true
2. For each:
   a. getAdInsights → last 24h ROAS/CTR
   b. If performance good (ROAS > threshold) AND autoScalingActionsToday < 1:
      → Calculate new budget = current + min(20%, maxBudget cap check)
      → reserveAiResponseUnits(tenantId, autoScaleUnitCost, 'AD_AUTOSCALE', id)
      → McpAdsService.scale_ad_budget(adSetId, newBudget)
      → commitReservedUnits(id)
      → Update autoScalingActionsToday + 1, autoScalingLastActionAt
      → triggerAutoScaleActionEmail()
   c. If scale_ad_budget fails:
      → refundReservedUnits(id, 'scale_failed')
      → notify merchant
3. Reset autoScalingActionsToday to 0 at midnight (separate CRON)
```

### Files

- `[NEW]` `backend/src/ads-agent/ads-agent.processor.ts`
  - `@Cron('0 */6 * * *')` — auto-scale check
  - `@Cron('0 0 * * *')` — reset daily action counter
  - `@Cron('0 2 * * *')` — data purge (CapiEventLog 60d, AiTokenUsageLog 6mo, AdCampaignDraft 90d)
- `[MODIFY]` `backend/src/ads-agent/ads-agent.service.ts` — `enableAutoScaling()`, `disableAutoScaling()`
- `[MODIFY]` `backend/src/smtp/smtp.service.ts` — `triggerAutoScaleActionEmail()`
- `[MODIFY]` `frontend/.../ads-agent/page.tsx` — auto-scaling toggle + history log per campaign

### Testing Plan
```
Unit Tests:
├── autoScalingEnabled false → CRON skips campaign ✓
├── ROAS below threshold → no scaling ✓
├── 20% max increase enforced ✓
├── autoScalingMaxBudget reached → scaling stops ✓
├── autoScalingActionsToday >= 1 → no second action in 24h ✓
├── scale_ad_budget fails → units refunded ✓
├── purge cron: 60d+ CapiEventLog deleted ✓
├── purge cron: 6mo+ AiTokenUsageLog deleted ✓
└── Daily reset: autoScalingActionsToday = 0 at midnight ✓
```

### Exit Criteria
- `[x]` Auto-scaling triggers on CRON schedule
- `[x]` 20% cap + daily action limit enforced
- `[x]` Scale failure → refund
- `[x]` Data purge cron runs correctly

---

## Phase 8 — Meta App Review (Operational, No Code)

**Status:** `[x]`
- `[x]` `ads_management`, `ads_read`, `business_management` permissions formal App Review guide created (`backend/docs/META_APP_REVIEW_SUBMISSION_GUIDE.md`)
- `[x]` ZiniChat Help Center updated (`frontend/src/data/helpDocs.ts` - `ads-copilot-creator-guide`)
- `[x]` Screen recording walkthrough script and test credentials documented
- `[x]` ClickHouse migration evaluation documented for high-volume CapiEventLog

---

## Phase 9 — Comprehensive Automated Testing Suite

**Status:** `[x]`
**Estimated time:** 5-7 days
**Dependency:** Phase 0-7 all complete

### Goal: Manual test না করেও সব কিছু verified হবে

### MSW Mock Server (Meta Graph API)

```typescript
// backend/src/test/mocks/meta-graph-api.mock.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const metaMockServer = setupServer(
  // CAPI Events
  rest.post('https://graph.facebook.com/*/events', (req, res, ctx) =>
    res(ctx.json({ events_received: 1, fbtrace_id: 'test-trace' }))),

  // Ad Account
  rest.get('https://graph.facebook.com/*/adaccounts', (req, res, ctx) =>
    res(ctx.json({ data: [{ id: 'act_123', name: 'Test Account', currency: 'BDT' }] }))),

  // Campaign create
  rest.post('https://graph.facebook.com/*/campaigns', (req, res, ctx) =>
    res(ctx.json({ id: 'campaign_test_123' }))),

  // AdSet create (can simulate failure)
  rest.post('https://graph.facebook.com/*/adsets', (req, res, ctx) =>
    res(ctx.status(400).json({ error: { message: 'Simulated failure' } }))),

  // Ad Insights
  rest.get('https://graph.facebook.com/*/insights', (req, res, ctx) =>
    res(ctx.json({ data: [{ impressions: '1000', spend: '50', clicks: '30' }] }))),

  // Image upload
  rest.post('https://graph.facebook.com/*/adimages', (req, res, ctx) =>
    res(ctx.json({ images: { test: { hash: 'test_image_hash_abc123' } } }))),

  // Test connection (for MetaMarketingApiConfig)
  rest.get('https://graph.facebook.com/*', (req, res, ctx) =>
    res(ctx.json({ id: 'app_123', name: 'ZiniChat Ads' }))),
);
```

### Integration Test Suite

```typescript
// Full CAPI Pipeline
describe('CAPI Full Pipeline E2E', () => {
  it('Order intent in inbox → Purchase event fires → log created', async () => {
    // Setup tenant with CAPI config + Purchase event enabled (sourceInboxAiIntent: true)
    // Trigger OrchestratorService.processMessage() with order intent
    // Assert: Meta CAPI mock called with correct pixel + hashed PII
    // Assert: CapiEventLog created with status 'sent'
  });

  it('Duplicate event_id within 24h → suppressed', async () => {
    // Fire event with eventId 'dup-test'
    // Fire same event again
    // Assert: Meta CAPI mock called only ONCE
    // Assert: Second CapiEventLog status 'suppressed_duplicate'
  });

  it('External webhook → valid secret → event fires', async () => {
    // POST /capi-hub/webhook/:token with X-ZiniChat-Secret
    // Assert: CAPI event fires
  });

  it('External webhook → invalid secret → 401', async () => { ... });
});

// Full Ads Copilot Saga
describe('Ads Copilot Saga E2E', () => {
  it('Complete saga: all steps succeed → campaign ACTIVE', async () => {
    // Mock: campaign create OK, adset create OK, ad create OK
    // Call approveAndRunAd()
    // Assert: AiUsageLog status COMMITTED
    // Assert: AdCampaignDraft status PENDING_REVIEW
    // Assert: SMTP mock called (ad published email)
  });

  it('Saga compensation: adset create fails → campaign paused + refund', async () => {
    // Mock: campaign create OK, adset create FAILS
    // Assert: pause_campaign mock called (compensation)
    // Assert: AiUsageLog status REFUNDED
    // Assert: AdCampaignDraft status FAILED_REFUNDED
    // Assert: SMTP mock called (failure email)
  });

  it('Meta rejection webhook → refund + status REJECTED_BY_META', async () => {
    // POST /meta-marketing-config/webhook/meta-ad-review with REJECTED
    // Assert: AiUsageLog REFUNDED
    // Assert: AdCampaignDraft status REJECTED_BY_META
    // Assert: merchant notification created
  });

  it('Quota exceeded → throws before any Meta call', async () => {
    // Set tenant AI quota to 0
    // Call approveAndRunAd()
    // Assert: throws ForbiddenException
    // Assert: Meta campaign mock NOT called
    // Assert: AiUsageLog NOT created
  });

  it('Concurrent approvals → only 1 succeeds (Redis lock)', async () => {
    // Trigger 2 concurrent approveAndRunAd() calls
    // Assert: only 1 succeeds, other throws
    // Assert: only 10 units reserved (not 20)
  });
});

// Cross-Phase Dependency Tests
describe('Cross-Phase Integration', () => {
  it('Phase 0 → 1: FeatureRollout controls quota reservation', () => { ... });
  it('Phase 1 → 6: reserveAiResponseUnits blocks saga if quota=0', () => { ... });
  it('Phase 2 → 6: CAPI Purchase does not double-fire when ad creates order', () => { ... });
  it('Phase 3 → 5: Kill-switch off → MCP server disabled gracefully', () => { ... });
  it('Phase 4 → 6: No ad account → approval blocked', () => { ... });
  it('Phase 5 → 6: Read tools work; write tools blocked until McpToolRegistry enabled', () => { ... });
  it('Phase 6 → 7: AutoScaling CRON processes only ACTIVE campaigns', () => { ... });
});
```

### CI Pipeline

```yaml
# .github/workflows/capi-ads-tests.yml
name: CAPI & Ads Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: POSTGRES_DB: zinichat_test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx prisma db push --schema=./prisma/schema.prisma
      - run: npx jest --coverage --coverageThreshold='{"global":{"lines":80}}'
      - run: npx jest --testPathPattern='integration'
      - run: npx tsc --noEmit
```

### Coverage Targets

| Module | Unit | Integration |
|---|---|---|
| feature-rollout | 95% | ✓ |
| quota.service (new methods) | 95% | ✓ |
| capi-hub | 90% | ✓ |
| meta-marketing-config | 90% | ✓ |
| meta-ads-account | 85% | ✓ |
| mcp-ads | 85% | ✓ |
| ads-agent (saga) | 95% | ✓ |
| ads-agent (auto-scaling) | 90% | ✓ |

### Exit Criteria
- `[x]` All unit tests pass (80%+ coverage per module) (80/80 test suites, 618/618 tests passed)
- `[x]` All integration tests pass with MSW/Axios mocks (capi-full-pipeline & ads-copilot-saga specs)
- `[x]` All cross-phase dependency tests pass (cross-phase-integration spec)
- `[x]` GitHub Actions CI pipeline workflow configured (`.github/workflows/capi-ads-tests.yml`)
- `[x]` `npx tsc --noEmit` → 0 errors across entire backend
- `[x]` `npx tsc --noEmit` → 0 errors across entire frontend

---

## Total Scope Summary

| Phase | New Backend Files | New Frontend Files | New DB Models | Est. Days |
|---|---|---|---|---|
| 0 — Feature Rollout | 4 | 2 | 2 | 2-3 |
| 1 — Quota Engine | 1 (modify) | 0 | 0 (extend) | 2-3 |
| 2 — CAPI Hub | 5 | 1 | 3 | 4-5 |
| 3 — MCP Console | 4 | 1 | 2 | 3-4 |
| 4 — Ad Account | 4 | 1 | 1 | 3-4 |
| 5 — MCP Read Tools | 4 | 1 | 0 | 5-7 |
| 6 — AI Ad Creator | 4 | 1 | 2 | 14-21 |
| 7 — Auto-Scaling | 2 | 0 | 0 (extend) | 7-10 |
| 8 — App Review | 0 | 0 | 0 | External |
| 9 — Testing Suite | 3 | 0 | 0 | 5-7 |
| **Total** | **31** | **7** | **10** | **~55-70 days** |

---

> Phase complete হলে উপরের Status `[ ]` → `[x]` করো।
> Phase in-progress হলে `[/]` করো।
