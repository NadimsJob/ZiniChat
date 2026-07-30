# Phase T10b: Inbox AI Strict Tenant Isolation & Event-Wise AI Training Toggles — Testing Report

## Executed Tests & Verification Results

### 1. Two-Stage Orchestration & Tenant Isolation
- **Stage A Structured JSON Classification**: Prompts LLM for JSON containing `replyText`, `intent`, `orderProposal`, `imageProductDescription`, `supportSignal`, `supportReason`.
- **Malformed JSON Fallback**: Plain text outputs gracefully fall back without throwing errors or breaking message flow.
- **Defensive Tenant Guarding**: `assertBelongsToTenant(record, tenantId)` defensively asserts cross-tenant boundary before DB mutations. Cross-tenant attacks strictly rejected.

### 2. Event-Wise AI Behavior Toggles (Double-Gate Validation)
- **Order Placement (`order_placement`)**: Deterministic fuzzy product search, 30-min proposal expiry, 2-step confirmation with live price/stock validation before creation (`createdBy = 'ai'`).
- **Vision Image Reading (`image_reading`)**: When toggle is OFF, vision image analysis is skipped and 1 credit is charged instead of 5.
- **Support Detection & Handover (`support_detection`)**: Flags `requiresFollowUp`, broadcasts socket event, and dispatches in-app notification to tenant admins.
- **Product Photo Matching (`product_matching`)**: Reuses `saveOutboundMessage(..., 'image')` path and validates `minMatchConfidence` score (default 0.6) via token similarity calculation to eliminate false photo sends.

### 3. API & Plan Feature Guarding
- **Toggle API Validation**: `PATCH /ai-training/tools/:toolType` validates plan feature permission via `QuotaService.checkFeature` before allowing tools to be enabled (`isEnabled: true`).
- **Superadmin Sync**: 4 AI tool feature keys (`ai_tool_order_placement`, `ai_tool_image_reading`, `ai_tool_support_detection`, `ai_tool_product_matching`) fully registered across packages and tenant custom override modal.

---

## Status: 100% PASS (Production Ready)
