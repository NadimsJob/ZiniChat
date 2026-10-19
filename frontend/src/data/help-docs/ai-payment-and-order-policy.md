# AI Payment Policies, Delivery Charges & Vision Screenshot Verification Manual

## Overview
The **AI Payment & Order Policy Engine** empowers ZiniChat merchants to automate their order capture, delivery fee calculations, and payment proof verifications directly within conversational channels (Facebook Messenger, WhatsApp, Instagram DM, and Live Web Chat).

---

## 1. Supported Payment Policies

Merchants can select one of three payment policies from **Settings > AI Training > Order Placement**:

| Policy Mode | Description | Customer Workflow |
| :--- | :--- | :--- |
| 🟢 **Cash on Delivery (COD)** | 100% of order value (Products + Delivery fee) is collected in cash upon arrival. | AI presents full bill and asks customer to reply `CONFIRM` or `YES PLACE ORDER`. Order is logged immediately. |
| 🟡 **Delivery Charge Advance** | Delivery fee (e.g., ৳60 Inside Dhaka / ৳120 Outside Dhaka) must be paid upfront via MFS. | AI requests advance delivery fee, shares merchant bKash/Nagad accounts, and waits for a payment screenshot. Product price remains COD. |
| 🔵 **Full Advance Payment** | 100% of the total amount (Product price + Delivery fee) must be sent upfront via MFS. | AI shares merchant MFS accounts for the full balance and waits for a screenshot before confirming the order. |

---

## 2. Dynamic Inside & Outside Dhaka Delivery Charges

Under **Delivery Charges**, configure:
* **Inside Dhaka Delivery Charge (BDT)**: e.g. ৳60 or ৳70
* **Outside Dhaka Delivery Charge (BDT)**: e.g. ৳120 or ৳130

The AI automatically inspects the customer's delivery address, district, or area keyword (e.g. Mirpur, Dhanmondi, Chittagong, Sylhet) to apply the correct rate to the grand total.

---

## 3. Mandatory 4 Customer Details Collection Protocol

Before generating an official order proposal or logging an order, the AI validates four mandatory customer fields:
1. **Full Name** (e.g., "Md. Rahim")
2. **11-digit Valid Bangladesh Phone Number** (e.g., `017XXXXXXXX`, `018XXXXXXXX`)
3. **Detailed Delivery Address** (House, Road, Area)
4. **Delivery Location** (Inside Dhaka vs. Outside Dhaka)

If any details are missing, the AI gently asks **only** for the missing items. When provided, the AI automatically updates the contact's CRM record.

---

## 4. Vision AI Payment Screenshot Verification Engine

When a customer uploads an image during an active `AWAITING_PAYMENT_PROOF` proposal:
1. **Receipt Recognition**: Vision AI scans the image using Gemini / OpenAI Vision models.
2. **Data Extraction**: Extracts MFS provider (`bKash`, `Nagad`, `Rocket`), paid amount (BDT), TrxID, sender mobile, and status (`success`).
3. **Exact Amount Matching**:
   - **Amount Matches/Exceeds**: The order is confirmed immediately. An entry is made into the `Order` table with `status: 'confirmed'`, `createdBy: 'ai'`, and notes with transaction details. The AI sends the customer their unique Order ID (#ODR-XXXX).
   - **Underpaid**: The AI informs the customer of the amount received vs. the required balance and prompts for the remaining sum.
   - **Unclear / Broken Image**: The AI politely requests a clear screenshot or the raw Transaction ID text.

---

## 5. Merchant Setup Guide

1. Navigate to **Dashboard > Settings > AI Training**.
2. Locate the **Order Placement** tool card. Ensure the toggle switch is **ON**.
3. Select your desired **Payment Policy Mode** (`Cash on Delivery`, `Delivery Charge Advance`, or `Full Advance Payment`).
4. Enter your standard **Inside Dhaka** and **Outside Dhaka** delivery charges.
5. Add your **bKash / Nagad / Rocket** receiving numbers and select the account type (`Personal`, `Merchant`, `Agent`).
6. Optionally, write an **Additional Payment Note** (e.g., *"Please send money to the personal number and share the screenshot"*).
7. Click **Save Policy Settings**. Instant toast feedback will confirm successful persistence.
