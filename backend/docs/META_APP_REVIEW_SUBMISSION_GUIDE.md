# ZiniChat — Meta App Review Submission Guide

This document contains the official submission details, permission justifications, and screencast walkthrough script for Meta App Review approval.

---

## 1. App Credentials & Business Verification

- **App ID**: Configured under Superadmin `MetaMarketingApiConfig`
- **Business Portfolio**: ZiniChat (`3833563216908598`) — **Verified Meta Tech Provider**
- **App Review Type**: Business App (Server-to-Server & Merchant OAuth Integration)

---

## 2. Requested Permissions & Purpose

| Permission | Purpose & Justification |
|---|---|
| `ads_management` | Enables ZiniChat's AI Ads Copilot to create and manage ad campaigns, ad sets, and ad creatives on behalf of connected merchant ad accounts upon explicit user approval. |
| `ads_read` | Allows ZiniChat to fetch ad account telemetry (impressions, clicks, spend, CTR, conversions) and balance for dashboard display and auto-scaling performance evaluation. |
| `business_management` | Enables merchants to select and manage ad accounts linked to their Meta Business Manager. |
| `pages_show_list` | Automatically links merchant's Facebook Page to their ad account for ad creative specification. |
| `pages_read_engagement` | Enables incoming customer conversation routing for Messenger channels. |

---

## 3. Screencast Video Recording Script (Walkthrough)

When recording the screencast for Meta App Review submission, follow these exact steps:

```
Step 1: Merchant Log In & Ad Account Connection
  - Navigate to https://zinichat.com/login and log in with merchant test account.
  - Go to "Marketing & Ads > Ad Account" in the left sidebar navigation.
  - Show the prerequisite check (Facebook Page connected via Messenger).
  - Click "Connect Meta Ad Account" -> complete Meta OAuth login dialog.
  - Show the connected ad account card with balance and currency.

Step 2: Ads Copilot AI 5-Turn Campaign Creation
  - Navigate to "Marketing & Ads > Ads Copilot".
  - Click "Start AI Ad Creation".
  - Turn 1: Select a product from the store catalog cards.
  - Turn 2: Select target cities/locations (Advantage+ Audience).
  - Turn 3: Set daily budget and campaign duration.
  - Turn 4: Review the AI-generated ad copy and product image preview.
  - Turn 5: Show the Final Approval Summary Card displaying campaign details and AI quota deduction warning notice.
  - Click "Approve & Publish Ad" -> show success banner and Meta PENDING_REVIEW status badge.

Step 3: Server-Side Tracking (CAPI Hub)
  - Navigate to "Marketing & Ads > CAPI Hub".
  - Show configured Pixel ID, Dataset ID, and active event triggers (Purchase / Lead).
  - Click "Test Event" -> demonstrate event log entry.

Step 4: Campaign Management & Safety Auto-Scaling
  - Go back to "Ads Copilot > Campaign Manager" tab.
  - Show active campaign list with Pause/Resume toggle button.
  - Click "Auto-Scaling ON" -> show budget cap configuration modal and active scaling badge.
```

---

## 4. Test User & Credentials for Reviewers

- **Test Merchant Email**: `appreview@zinichat.com`
- **Test Merchant Password**: `MetaReview2026!`
- **Test Ad Account ID**: `act_10158392019482`
- **Test Facebook Page**: ZiniChat Demo Store (`https://facebook.com/zinichat.demo`)
