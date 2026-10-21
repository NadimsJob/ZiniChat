# Meta Conversions API (CAPI Hub) Complete Guide

ZiniChat CAPI Hub is an automated server-side tracking gateway that forwards customer actions directly from the ZiniChat cloud server to Meta (Facebook) Graph API. This bypasses browser ad-blockers, iOS 14.5+ privacy limitations, and lost tracking pixels, providing higher Event Match Quality (EMQ) and accurate ROAS attribution.

---

## 1. Zero-Hassle 2-Minute Setup

To start tracking server-side conversions, merchants do not need complex code snippets or Google Tag Manager server containers.

1. Navigate to **Settings > CAPI Hub** (`/dashboard/settings/capi-hub`).
2. Input your **Meta Pixel ID / Dataset ID** (e.g. `102938475610293`).
3. Paste your **Conversions API Access Token**:
   - Go to [Meta Events Manager](https://business.facebook.com/events_manager2).
   - Select your Pixel / Dataset > **Settings** tab.
   - Scroll to **Conversions API** > Click **Generate access token** and copy it.
4. *(Optional)* Paste your **Test Event Code** (e.g. `TEST12345` from Events Manager > Test Events tab).
5. Click **Save & Activate Tracking**.
6. The system automatically initializes and enables standard tracking events (`Purchase`, `Lead`, `Contact`, `InitiateCheckout`, `AddToCart`, `ViewContent`) with smart active sources.

---

## 2. 1-Click Test Ping to Meta

After saving, click **Send 1-Click Test Ping to Meta**:
- ZiniChat immediately builds a sample server payload and dispatches it directly to Meta Graph API (`/v19.0/{pixelId}/events`).
- A real-time banner will display:
  - `Meta Graph API 200 OK — Test event acknowledged! (Events received: 1)`
  - The live Meta `FBTrace ID` for auditing.
- Check Meta Events Manager > **Test Events** tab to see your server event appear live within seconds.

---

## 3. High Event Match Quality (EMQ) & E.164 Normalization

Meta matches server events to Facebook/Instagram user accounts using cryptographic hashes. ZiniChat automatically optimizes this:
- **Phone Numbers**: Bangladeshi numbers entered as `017XXXXXXXX` or `+88017XXXXXXXX` are standardized to clean E.164 format (`88017XXXXXXXX`) before hashing.
- **Emails**: Trimmed, lowercased, and hashed with SHA-256.
- **Order Deduplication**: Each order carries an `order_${order.id}` event ID so Meta dedupes browser pixel and server events within a 48-hour window without double-counting revenue.

---

## 4. Managing Events & Trigger Sources

Merchants have full control over tracking behavior:
- **Active Toggle**: Turn individual events on or off with a single click.
- **Trigger Sources**:
  - `📦 Order`: Fires when an order is created, confirmed, or completed.
  - `🤖 Inbox AI`: Fires when Inbox AI detects customer buying intent or contact.
  - `🎯 Lead`: Fires when a customer lead is registered.
  - `💬 Widget`: Fires when customer interacts with website widget.
  - `🌐 Webhook`: Fires when an external platform posts to your webhook endpoint.
- **+ Add Event**: Add additional Meta standard events (`CompleteRegistration`, `Search`, etc.) or custom events at any time.
- **Payload Configuration**: Toggle whether to forward hashed user data, monetary value, currency, order ID, or catalog content IDs.

---

## 5. External Webhook API

For custom websites, Shopify stores, WooCommerce, or landing page builders:
- **Endpoint**: `https://api.zinichat.com/capi-hub/webhook/{webhookToken}`
- **Header**: `x-zinichat-secret: {webhookSecret}`
- **Payload Body**:
  ```json
  {
    "event_name": "Purchase",
    "event_id": "order_custom_1001",
    "user_data": {
      "em": "customer@example.com",
      "ph": "01700000000"
    },
    "custom_data": {
      "value": 1500,
      "currency": "BDT",
      "order_id": "1001"
    }
  }
  ```

---

## 6. Mobile & Desktop Optimization

The CAPI Hub interface is fully responsive:
- **Desktop View**: Clean multi-column data grid with instant toggles and payload inspection.
- **Mobile View**: Ergonomic touch cards with large toggle switches, touchable pill chips for trigger sources (`[📦 Order]` `[🤖 Inbox AI]` `[🎯 Lead]` `[💬 Widget]` `[🌐 Webhook]`), and scroll-friendly conversion logs.
