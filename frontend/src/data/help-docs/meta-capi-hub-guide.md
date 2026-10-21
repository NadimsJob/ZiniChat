# Meta Conversions API (CAPI Hub) Complete Guide

ZiniChat CAPI Hub is an automated server-side tracking gateway that forwards customer actions directly from the ZiniChat cloud server to Meta (Facebook) Graph API. This bypasses browser ad-blockers, iOS 14.5+ privacy limitations, and lost tracking pixels, providing higher Event Match Quality (EMQ) and accurate ROAS attribution.

---

## 1. Zero-Hassle 1-Click Setup (Connected Pixel Auto-Discovery)

ZiniChat eliminates the friction of copying and pasting long access tokens and Pixel IDs from Meta Events Manager:

### Automated Pixel Discovery
1. If you have already connected your Facebook Page or Meta Ad Account in ZiniChat, navigate to **Settings > CAPI Hub** (`/dashboard/settings/capi-hub`).
2. The system automatically inspects your connected Meta accounts via Graph API (`GET /act_{ad_account_id}/adspixels`) and displays all existing Pixels in the **"Auto-Discovered Connected Pixels"** section.
3. Select your desired Pixel from the dropdown and click **"1-Click Connect Selected Pixel"** (`১-ক্লিকে পিক্সেল কানেক্ট করুন`).
4. ZiniChat securely links the pixel using your existing encrypted OAuth token—**no manual token generation or copy-pasting required**.

### Advanced / Manual Setup (External Pixels)
If your Pixel belongs to an external Business Manager or is not yet linked:
1. Click the **"Advanced / Manual Setup"** accordion.
2. Input your **Meta Pixel ID / Dataset ID** (e.g. `102938475610293`).
3. Paste your **Conversions API Access Token** generated from Meta Events Manager > Settings > Conversions API.
4. *(Optional)* Paste your **Test Event Code** (e.g. `TEST12345`).
5. Click **Save & Activate Tracking**.
6. The system automatically initializes standard tracking events (`Purchase`, `Lead`, `Contact`, `InitiateCheckout`, `AddToCart`, `ViewContent`).

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
