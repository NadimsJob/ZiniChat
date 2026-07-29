# Omnichannel AI Business Assistant Platform — Full System Architecture (v4, Final Production)

This is the single consolidated architecture document representing the **100% Production-Verified** state of the **ZiniChat Omnichannel AI Business Assistant SaaS Platform**. It updates and supersedes all previous architecture revisions (v1, v2, v3).

---

## 1. Product Summary

A multi-tenant SaaS platform where each tenant (a business) gets:
- A unified inbox across **WhatsApp Official (WABA Cloud API), WhatsApp Web (Baileys QR & Pairing Code), Meta Messenger, and Instagram DM**.
- A self-serve **AI Assistant** (configurable system prompt, RAG knowledge base from PDF/DOCX/TXT/OCR, tool calling, multi-provider model selection: OpenAI, Gemini, Anthropic, Groq, DeepSeek).
- Broadcast campaigns with Meta template sync and BullMQ batch processor.
- Lead CRM & Kanban pipeline with custom stages, notes, and Excel export.
- Product Catalog & Order Management with transactional stock deduction/restock and AI automated order creation.
- ZiniChat Live Website Chat Widget embed engine.
- Bilingual UI Engine (English & Bengali with `localStorage` persistence).

...and where the platform owner gets a **Superadmin Panel** with full visibility and control over every tenant, tenant plan customization overrides, global payments & MFS gate settings, Meta CAPI & Google Analytics integration, AI model configs, Global Template Library, Support Ticket management, Landing Page CMS, and audit logs.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend (tenant dashboard, superadmin panel, marketing) | Next.js 16 (App Router) + TypeScript + Tailwind CSS (Frosted Glassmorphism Theme) |
| Backend | Node.js + NestJS (Modular Monolith architecture) |
| Database | PostgreSQL + `pgvector` extension (HNSW vector indexing for RAG embeddings) |
| Cache/Queue | Redis + BullMQ (sequential broadcast batching, GA/Pixel event queues) |
| Realtime | Socket.io (namespaces for `/inbox` and `/notifications` real-time alert bells) |
| File Storage | Local upload storage with quota enforcement and clean media unlinking |
| Auth & RBAC | JWT + refresh tokens; Google OAuth SSO; strict role & tenant-scoped guards (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `SubscriptionGuard`) |
| AI Engine | Multi-provider router: OpenAI, Google Gemini (`v1beta/openai`), Anthropic Claude, Groq, DeepSeek (BYOK & Platform-key modes) |
| Messaging Channels | WhatsApp Cloud API, Baileys WhatsApp Web engine (QR & 8-digit Pairing Code), Meta Messenger API, Meta Instagram Messaging API |
| Payments & MFS Gateway | SSLCommerz (BDT) + Native bKash, Nagad, Rocket, Bank SMS gateway with Bangla QR EMVCo Hex CRC-16 checksum & `$transaction` double-spend locking |
| Custom Android Utility App | Proprietary Kotlin Android App (`android-sms-gateway`) for zero-config MFS SMS parsing |
| Analytics & Tracking | Facebook Meta Pixel & Conversions API (CAPI) + Google Analytics (GA4 Measurement Protocol v2 API) |
| Notifications & Emails | Real-time WebSockets (`NotificationsService`) + Custom SMTP (`SmtpService`) |
| Hosting & Deployment | Docker Compose + Traefik Reverse Proxy + SSL certificates (Live: `zinichat.com`, Staging: `test.zinichat.com`) |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│    Meta Graph API / WABA / Baileys  │     │   AI Providers (OpenAI, Gemini,     │
│ (WhatsApp / Messenger / Instagram)  │     │   Anthropic, Groq, DeepSeek)        │
└──────────────────┬──────────────────┘     └──────────────────┬──────────────────┘
                   │ webhooks/send                             │ completions
                   ▼                                           ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                       NestJS Backend (Modular Monolith)                     │
   │                                                                             │
   │  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐ │
   │  │ Channel        │  │ AI Engine & RAG │  │ Support AI Agent             │ │
   │  │ Adapters       │  │ (pgvector +     │  │ (function calling, inline    │ │
   │  │ (WA/Web/MSG/IG)│  │ tool-calling)   │  │  channel connect UI)         │ │
   │  └────────────────┘  └─────────────────┘  └──────────────────────────────┘ │
   │  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐ │
   │  │ Live Inbox &   │  │ Broadcast Engine│  │ Meta Pixel CAPI &            │ │
   │  │ Realtime Socket│  │ (BullMQ queue)  │  │ Google Analytics (GA4)       │ │
   │  └────────────────┘  └─────────────────┘  └──────────────────────────────┘ │
   │  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐ │
   │  │ MFS & Bangla QR│  │ Commerce & CRM  │  │ SUPERADMIN MODULE            │ │
   │  │ Gateway Engine │  │ (catalog/orders)│  │ (tenants, custom plan, CMS)  │ │
   │  └────────────────┘  └─────────────────┘  └──────────────────────────────┘ │
   └───────────┬──────────────────┬──────────────────┬──────────────────────────┘
               ▼                  ▼                  ▼
       ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐
       │  PostgreSQL   │  │    Redis      │  │ Local / S3 Storage│
       │  + pgvector   │  │ (cache/queue) │  │   (media/docs)    │
       └───────────────┘  └───────────────┘  └───────────────────┘
               ▲                                     ▲
               │ REST/WebSocket                      │ REST/WebSocket
      ┌────────┴──────────┐                 ┌────────┴──────────┐
      │ Tenant Dashboard  │                 │ Superadmin Panel  │
      │ (Next.js App)     │                 │ (Next.js App)     │
      └───────────────────┘                 └───────────────────┘
```

---

## 4. Multi-Tenancy & Quota Enforcement Model

1. **Shared Database & Tenant Isolation**:
   - Every tenant-scoped table contains `tenant_id`. Every service query strictly filters by `tenant_id`.
   - Superadmin accounts carry `role: superadmin`, bypass tenant scoping, and log all actions to `audit_logs`.

2. **Plan Limits & Custom Overrides**:
   - Base subscription plans hold default limits (`messageQuota`, `aiQuota`, `storageLimitMb`, `catalogLimit`, `channelLimit`, `seatLimit`).
   - The `Tenant` model holds custom override fields (`customMessageQuota`, `customAiQuota`, `customStorageLimitMb`, `customCatalogLimit`, `customChannelLimit`, `customSeatLimit`).
   - `QuotaService` calculates effective limits by checking `customOverride ?? planDefault`. Custom overrides take priority.

3. **Active Subscription Resolution**:
   - All tenant quota and plan queries filter exclusively for `status === 'active' || status === 'trialing'`, ignoring `pending` payment checkout attempts.

---

## 5. System Modules Overview

### 5.1 Auth, Onboarding & User Management
- Signup, login, forgot/reset password, email verification, onboarding wizard.
- First login triggers tenant acquisition tracking to Meta Pixel & GA4.

### 5.2 Omnichannel Messaging Layer
- Common internal `Message` schema for WhatsApp Cloud API, Baileys WhatsApp Web (QR & Pairing Code), Messenger, and Instagram DM.
- Real-time socket events for messages, conversation status, and notifications.

### 5.3 Live Inbox & CRM Pipeline
- Multi-channel conversation view, assigned agent filter, tags, labels (`<Label: Name>` AI instruction sync), and notes.
- Kanban CRM pipeline with stage CRUD and Excel export.

### 5.4 AI Engine & Knowledge Base (RAG)
- Document parsing (PDF, DOCX, TXT, OCR images) chunked into `KnowledgeChunk` vector embeddings (`pgvector`).
- Custom prompt tuning, business nature templates, and tool calling (`create_order`, `check_inventory`, `handover_to_human`).

### 5.5 Support AI v2 Engine
- Dynamic tenant context injection (plan, expiration date, active channels, message quota).
- Function calling tools (`create_detailed_support_ticket`, `request_tenant_permission`, `navigate_to_page`, `show_channel_connect_ui`, `get_tenant_workspace_status`).
- Inline channel connection UI rendered inside chat bubble.
- Session memory & Bengali context summaries (`SupportConversation.contextSummary`).

### 5.6 MFS Payment Gateway & Bangla QR Engine
- EMVCo compliant dynamic Bangla QR generator with Hex CRC-16 checksum.
- Atomic `prisma.$transaction` double-spend locking for manual TrxID verification.
- Custom Kotlin Android utility app (`android-sms-gateway`) for zero-config SMS forward parsing.

### 5.7 Meta CAPI & Google Analytics (GA4) Integration
- FB Ad campaign acquisition tracking via Meta Graph API v18.0 & CAPI.
- GA4 Measurement Protocol v2 API integration with AES-256-CBC key encryption.
- BullMQ async queue workers (`MetaPixelProcessor`, `GoogleAnalyticsProcessor`) with retries.

### 5.8 Superadmin Panel & Landing Page CMS
- Tenant management & plan customization modal with live usage badges (`Used: X msgs`, `Active: Y seats`).
- System health, packages/coupons CRUD, payment history, AI provider settings.
- Global Template Library CRUD, Meta template monitoring, public inquiries CRM.
- Landing Page CMS editor with bilingual EN/BN text rendering.

---

## 6. Database Schema Summary

```sql
-- Tenancy, Auth, Audit & Analytics
tenants(id, business_name, plan_id, status, custom_message_quota, custom_ai_quota, custom_storage_limit_mb, custom_catalog_limit, custom_channel_limit, custom_seat_limit, custom_plan_updated_at, custom_plan_updated_by, created_at)
users(id, tenant_id NULLABLE, name, email, password_hash, role, profile_pic_url, first_login_at, created_at)
audit_logs(id, actor_user_id, action, target_tenant_id, metadata_json, created_at)
smtp_config(id, host, port, username, password, welcome_subject, welcome_body, is_welcome_enabled)
notifications(id, user_id, title, message, type, is_read, created_at)
ai_configs(id, name, provider, model_name, api_key, api_endpoint, is_default, is_support_ai_default)
meta_pixel_configs(id, pixel_id, access_token, test_event_code, is_enabled)
tenant_acquisition_events(id, tenant_id, user_id, event_name, event_id, status, error_message, created_at)
google_analytics_configs(id, measurement_id, api_secret, is_enabled)
google_analytics_events(id, tenant_id, user_id, event_name, client_id, status, error_message, created_at)

-- Channels & Messaging
channel_connections(id, tenant_id, channel_type, external_account_id, access_token_encrypted, status, expires_at)
contacts(id, tenant_id, channel, external_contact_id, name, tags[], last_seen_at)
conversations(id, tenant_id, contact_id, channel, assigned_agent_id, status, last_message_at, is_ai_enabled)
messages(id, conversation_id, external_message_id, direction, type, content, media_url, status, created_at)

-- Support & Tickets
tickets(id, tenant_id, user_id, ticket_number, subject, description, priority, status, created_at)
support_conversations(id, tenant_id, user_id, ticket_id NULLABLE, status, context_summary, created_at)

-- AI Assistant & RAG
ai_assistants(id, tenant_id, system_prompt, model_provider, model_name, api_key_mode, created_at)
knowledge_documents(id, tenant_id, filename, status, uploaded_at)
knowledge_chunks(id, document_id, content, embedding vector(1536), chunk_index)

-- Broadcast, Commerce & CRM
templates(id, tenant_id, name, category, body, status, external_template_id)
broadcasts(id, tenant_id, template_id, segment_filter, scheduled_at, status)
products(id, tenant_id, name, price, sku, stock_count, is_active)
orders(id, tenant_id, conversation_id, contact_id, status, total)
leads(id, tenant_id, name, phone, email, stage_id, notes, value)

-- Plans & Billing
plans(id, name, price_usd, price_bdt, features, is_active, message_quota, ai_quota, seat_limit)
coupons(id, code, discount_type, discount_value, max_uses, current_uses, is_active)
subscriptions(id, tenant_id, plan_id, status, current_period_start, current_period_end)
payments(id, tenant_id, subscription_id, amount, provider, status, transaction_id, created_at)
```

---

## 7. Production Verification Status

- **Audited Phases**: **25 / 25 Phases (100% Completed)**
- **Backend Jest Unit Tests**: **377 / 377 passed (100% Pass Rate)**
- **Frontend Jest Unit Tests**: **6 / 6 passed (100% Pass Rate)**
- **TypeScript Compilation**: **0 Build Errors**
- **Certification Date**: July 29, 2026
