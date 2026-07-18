# Omnichannel AI Business Assistant Platform — Full System Architecture (v3, Consolidated)

This is the single consolidated architecture doc — combines the WhatsApp SaaS base (v1), the omnichannel + AI assistant layer (v2), and adds the **Superadmin control panel** (v3). Use this as the primary context document; v1/v2 files are now superseded by this one.

---

## 1. Product Summary

A multi-tenant SaaS platform where each tenant (a business) gets:
- A unified inbox across **WhatsApp, Messenger, and Instagram DM**
- A self-serve **AI Assistant** they configure themselves (prompt, knowledge base, tools, model choice)
- Broadcast campaigns, basic automation flows, and a lightweight commerce module

...and where the platform owner (you) gets a **Superadmin panel** with full visibility and control over every tenant, every conversation, billing, and system health.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend (tenant dashboard + superadmin panel) | Next.js + TypeScript + Tailwind CSS |
| Backend | Node.js + NestJS (modular monolith to start) |
| Database | PostgreSQL + pgvector extension (for RAG embeddings) |
| Cache/Queue | Redis + BullMQ |
| Realtime | Socket.io (real-time chat, events, and dynamic web notification alert bells) |
| File storage | Local upload / S3-compatible (DigitalOcean Spaces / AWS S3) |
| Auth | JWT + refresh tokens; Google OAuth SSO integration; separate auth guard for superadmin vs tenant users |
| AI Layer | Dynamic AI configs supporting OpenAI/Anthropic/Gemini/Custom proxies (Superadmin managed BYOK/Platform keys) |
| Messaging Channels | WhatsApp Cloud API, Meta Messenger Platform API, Meta Instagram Messaging API |
| Payments & Billing | SSLCommerz/bKash (BDT) + Dynamic Exchange Rate Conversion Engine |
| Welcome Email | Custom SMTP setup with Superadmin template builder and automated welcome mails |
| Automation (optional, phase 3+) | n8n as an optional integration escape hatch, not core |
| Hosting | VPS (DigitalOcean/Vultr) with Docker Compose to start; managed Postgres once live |

---

## 3. High-Level Architecture

```
┌───────────────────────────┐     ┌───────────────────────────┐
│   Meta Graph API family    │     │   AI Providers (OpenAI /  │
│ (WhatsApp / Messenger / IG)│     │   Anthropic) — per tenant  │
└──────────────┬─────────────┘     └──────────────┬─────────────┘
               │ webhooks/send                     │ completions
               ▼                                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  NestJS Backend (modular)                    │
   │                                                                │
   │  ┌───────────────┐  ┌────────────────┐  ┌──────────────────┐ │
   │  │ Channel        │  │ AI Assistant   │  │ Automation        │ │
   │  │ Adapters       │  │ Service (RAG + │  │ (keyword/flow)    │ │
   │  │ (WA/MSG/IG)    │  │ tool-calling)  │  │                    │ │
   │  └───────────────┘  └────────────────┘  └──────────────────┘ │
   │  ┌───────────────┐  ┌────────────────┐  ┌──────────────────┐ │
   │  │ Inbox &        │  │ Broadcast      │  │ Commerce           │ │
   │  │ Conversations  │  │ Engine (BullMQ)│  │ (catalog/orders)   │ │
   │  └───────────────┘  └────────────────┘  └──────────────────┘ │
   │  ┌───────────────┐  ┌────────────────┐  ┌──────────────────┐ │
   │  │ Tenant Auth &  │  │ Billing &      │  │ SUPERADMIN MODULE  │ │
   │  │ RBAC           │  │ Subscriptions  │  │ (see Section 6)    │ │
   │  └───────────────┘  └────────────────┘  └──────────────────┘ │
   └───────────┬─────────────────┬───────────────────┬────────────┘
               ▼                 ▼                   ▼
       ┌───────────────┐ ┌───────────────┐  ┌─────────────────┐
       │  PostgreSQL    │ │    Redis      │  │   S3 Storage     │
       │  + pgvector    │ │ (cache/queue) │  │   (media/docs)   │
       └───────────────┘ └───────────────┘  └─────────────────┘
               ▲                                     ▲
               │ REST/WebSocket                      │ REST/WebSocket
      ┌────────┴─────────┐                  ┌────────┴─────────┐
      │ Tenant Dashboard  │                  │ Superadmin Panel  │
      │ (Next.js)         │                  │ (Next.js, separate│
      │                   │                  │  route/app)       │
      └───────────────────┘                  └───────────────────┘
```

---

## 4. Multi-Tenancy Model

- Shared database, `tenant_id` on every tenant-scoped table (standard, cost-effective approach for this scale).
- Three permission tiers:
  1. **Superadmin** (you/your team) — cross-tenant access, not scoped to any single `tenant_id`.
  2. **Tenant Owner/Admin** — full control within their own tenant only.
  3. **Tenant Agent** — limited to assigned conversations within their tenant.
- Enforce scoping via a NestJS Guard that reads role + tenant_id from the JWT on every request. Superadmin JWTs carry a distinct `role: superadmin` claim and bypass tenant scoping — but every superadmin action should still be logged (see 6.4, audit log) since it's a high-trust bypass.

---

## 5. Core Tenant-Facing Modules

### 5.1 Onboarding
- Signup → business name + connect first channel (WhatsApp via BSP embedded signup, or Messenger/IG via Facebook Login OAuth).
- Setup checklist drives progress UI: `profile_complete`, `channel_connected`, `plan_chosen`, `first_message_sent`.
- "Assisted setup" = internal support ticket, manual ops process for MVP (not automated).

### 5.2 Channel Adapter Layer
- One common internal `Message` format: `{tenant_id, channel, contact_id, direction, content, message_id, timestamp}`.
- Thin adapter per channel (WhatsApp/Messenger/Instagram) translates webhook payloads in and API calls out.
- Inbox, Automation, and AI Assistant modules only ever operate on the common format.

### 5.3 Inbox
- Unified cross-channel conversation view, per tenant.
- Assign to agent, tag, mark resolved.
- Real-time updates via Socket.io tenant room.

### 5.5 AI Assistant Layer
- RAG using `pgvector` for business-specific knowledge (PDFs, docs).
- Tool-calling loop (e.g. `create_order`, `check_inventory`, `handover_to_human`).
- Global `aiOrderEnabled` toggle in Tenant settings dictates whether the `create_order` tool is active.

### 5.6 Broadcast & Automations
- Segment filtering and template-based messaging (meta-approved templates for WA).
- BullMQ queue handling rate limits and backoff.

### 5.7 Commerce & CRM
- Generic `Product` catalog supporting dynamic custom attributes, images, and trackable inventory `stockCount`.
- Full `Order` management UI with bi-directional stock syncing (decrements on order creation, increments on cancellation/refund).
- AI Order Generation: AI handles purchase intent and natively writes to the `Order` model if `aiOrderEnabled` is true.

### 5.8 Tenant Settings & Billing
- Team/role management, channel connections, plan/subscription, BYOK key management (encrypted at rest), and AI Auto-Ordering toggles.

---

## 6. Superadmin Panel (new — full platform control)

This runs as a separate, more privileged Next.js app/route (`/superadmin/*`), talking to the same backend but through superadmin-only guarded endpoints.

### 6.1 Tenant Management
- List/search all tenants; view full tenant detail (plan, usage, channels connected, health status).
- Suspend/reactivate a tenant (e.g. non-payment, abuse).
- Impersonate a tenant for support purposes — **must be logged**, and ideally requires the tenant's implicit consent notice (standard SaaS support practice) or at minimum a visible audit trail.
- Manually adjust a tenant's plan, quota, or trial period.

### 6.2 Billing Oversight
- View all subscriptions, payment history (SSLCommerz/bKash transaction logs), failed payments, upcoming renewals.
- Manually issue refunds/credits.
- Revenue dashboards: MRR, churn, plan distribution.

### 6.3 System Health & Usage Monitoring
- Message volume across all tenants/channels (spot abuse or platform-wide delivery issues).
- AI usage/cost per tenant (critical if you offer platform-provided API keys — you need to see which tenants are consuming the most LLM spend to avoid margin surprises).
- Queue health (BullMQ dashboard — stuck jobs, failed broadcast sends).
- Channel connection health (expired tokens, disconnected WABAs — proactively flag before the tenant notices).

### 6.4 Audit Log
- Every superadmin action (impersonation, plan change, refund, suspension) written to an immutable `audit_logs` table: `actor_id, action, target_tenant_id, metadata, timestamp`.
- This is non-negotiable for a platform with this level of cross-tenant access — protects you if a tenant disputes an action later, and is standard practice for any admin panel with impersonation/billing power.

### 6.5 Content/Compliance Moderation
- Since tenants can write their own AI system prompts and broadcast content, you likely want a lightweight review queue for flagged content (e.g. broadcasts reported as spam, or AI assistants generating complaints) — doesn't need to be automated on day one, but the data model should support flagging from the start.

### 6.6 Global Configuration
- Manage plan definitions (pricing, quotas) platform-wide.
- Manage BSP/channel provider credentials at the platform level (vs tenant-level channel connections).
- Feature flags per tenant or globally (useful for rolling out new modules like Commerce gradually).

---

## 7. Database Schema (consolidated)

```
-- Tenancy, Auth & Settings
tenants(id, business_name, plan_id, status, created_at)
users(id, tenant_id NULLABLE, name, email, password_hash, role, profile_pic_url) -- tenant_id NULL for superadmin users
audit_logs(id, actor_user_id, action, target_tenant_id, metadata_json, created_at)
smtp_config(id, host, port, username, password, welcome_subject, welcome_body, is_welcome_enabled)
notifications(id, user_id, title, message, type, is_read, created_at)
ai_configs(id, name, provider, model_name, api_key, api_endpoint, is_active)
google_auth_config(id, client_id, client_secret, is_enabled)
exchange_rates(id, from_currency, to_currency, rate, effective_from, created_at)

-- Channels
channel_connections(id, tenant_id, channel_type, external_account_id, access_token_encrypted, status, expires_at)

-- Messaging
contacts(id, tenant_id, channel, external_contact_id, name, tags[], last_seen_at)
conversations(id, tenant_id, contact_id, channel, assigned_agent_id, status, last_message_at)
messages(id, conversation_id, external_message_id, direction, type, content, status, created_at)

-- AI Assistant
ai_assistants(id, tenant_id, system_prompt, model_provider, model_name, api_key_mode[byok|platform], created_at)
ai_assistant_tools(id, assistant_id, tool_type, config_json, is_enabled)
knowledge_documents(id, tenant_id, filename, status, uploaded_at)
knowledge_chunks(id, document_id, content, embedding vector(1536), chunk_index)
ai_usage_logs(id, tenant_id, assistant_id, tokens_used, cost_usd, created_at) -- feeds superadmin cost monitoring

-- Automation
automations(id, tenant_id, name, trigger_type, flow_json, is_active)

-- Broadcast
templates(id, tenant_id, name, category, body, status, external_template_id)
broadcasts(id, tenant_id, template_id, segment_filter, scheduled_at, status)
broadcast_recipients(id, broadcast_id, contact_id, status)

-- Commerce
products(id, tenant_id, name, price, sku, is_active)
orders(id, tenant_id, conversation_id, contact_id, status, total)

-- Billing
plans(id, name, price_usd, features, is_active, message_quota, ai_quota, seat_limit)
addons(id, name, price_usd, type, quota_value, is_active)
subscriptions(id, tenant_id, plan_id, status, current_period_end)
payments(id, tenant_id, subscription_id, amount, provider, status, created_at)
```

---

## 8. Security Notes

- Verify all Meta webhook signatures per channel.
- Encrypt access tokens and BYOK API keys at rest (per tenant).
- Superadmin routes behind a separate, stricter auth guard — ideally MFA-enforced, IP-allowlisted if feasible.
- Rate-limit broadcast + AI calls server-side independent of upstream provider limits.
- Log all superadmin cross-tenant actions (Section 6.4) — no exceptions.

---

## 9. MVP Phasing

**Phase 1 — Core loop, single channel:**
- WhatsApp only + Inbox
- AI Assistant: prompt + knowledge base (RAG), BYOK only, no tool-calling yet
- Basic superadmin: tenant list, suspend/reactivate, manual billing (no impersonation/audit log yet — add before opening to real users if impersonation is used)

**Phase 2 — Omnichannel + smarter AI:**
- Add Messenger + Instagram DM (reuse Channel Adapter)
- AI tool-calling (order lookup, handoff, appointment booking)
- Platform-provided API key option + AI usage cost tracking (feeds superadmin panel)
- Full superadmin: audit log, impersonation, system health dashboards

**Phase 3 — Scale features:**
- Broadcast + Commerce modules
- Optional n8n integration point
- Compliance/moderation queue
- Migrate off BSP to direct Meta Tech Provider integration if volume justifies

---

## 10. Open Decisions Still Needed

1. Which BSP first (360dialog vs Gupshup vs Twilio) — affects Phase 1 timeline directly.
2. Impersonation policy — silent audit-log only, or visible notice to the tenant when a superadmin logs in as them.
3. AI cost guardrails — hard per-tenant monthly cap on platform-key usage to prevent runaway billing before you've built full quota enforcement.
