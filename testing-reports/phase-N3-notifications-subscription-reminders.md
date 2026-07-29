# Phase N3: Subscription Expiry & Reminders — Delivery Correctness & Timing Report

## Triggers Covered
| Event | File / function | Type (Email/Web/Both) | Recipient(s) | Should fire when |
|---|---|---|---|---|
| 7-Day Expiry Reminder | `subscription-reminder.service.ts` (`checkSubscriptionExpiries`) | Both | First User `[0]` only | 7 days before subscription `currentPeriodEnd` |
| 2-Day Expiry Reminder | `subscription-reminder.service.ts` (`checkSubscriptionExpiries`) | Both | First User `[0]` only | 2 days before subscription `currentPeriodEnd` |
| Same-Day Expiry Alert (0 Days) | N/A | Missing | N/A | Day of subscription expiry |
| Expiration Notice (Expired) | N/A | Missing | N/A | Subscription `currentPeriodEnd` passes |

## Verification Results
| Event | Trigger correctness | Timing correctness | Recipient correctness | Duplicate-safe? | Failure handled? | Content correct (EN/BN)? | Status |
|---|---|---|---|---|---|---|---|
| 7-Day Reminder | ✅ Correct | ⚠️ Server UTC dependent | ❌ First user `[0]` only | ⚠️ Re-sends if cron restarts | ⚠️ Fire & forget | ⚠️ Timezone offset in Bengali date | ❌ Needs Fix |
| 2-Day Reminder | ✅ Correct | ⚠️ Server UTC dependent | ❌ First user `[0]` only | ⚠️ Re-sends if cron restarts | ⚠️ Fire & forget | ⚠️ Timezone offset in Bengali date | ❌ Needs Fix |
| Same-Day (0-Day) | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Not Implemented |
| Post-Expiry Notice | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Not Implemented |

## Bugs Found & Recommended Fixes
| # | Bug | Root cause | Recommended Fix | File(s) affected |
|---|---|---|---|---|
| 1 | **Single Recipient Leak (`users[0]`)** | Line 42 uses `const owner = sub.tenant?.users?.[0];`. Co-owners and admins do not receive expiry warning emails or notifications. | Send reminders to all admins and owners (`sub.tenant?.users`) using a loop. | `subscription-reminder.service.ts` |
| 2 | **Timezone & Date Offset Error in Bengali Formatting** | `.toLocaleDateString('bn-BD', ...)` relies on host OS timezone (UTC in Docker). This causes rendered Bengali dates to display 1 day early/late for evening timestamps. | Pass `{ timeZone: 'Asia/Dhaka' }` explicitly in `toLocaleDateString` options. | `subscription-reminder.service.ts` |
| 3 | **Missing Expiry Status Update & Expiration Notice** | `checkSubscriptionExpiries` only checks `[7, 2]` days before expiry. When a subscription passes `currentPeriodEnd`, its status remains `active` in DB and no expiration notification is sent. | Add Day 0 (Expiring today) and Expiration Notice (Expired today & update DB status to `expired`). | `subscription-reminder.service.ts` |
| 4 | **Cron Idempotency & Re-run Hazard** | If the NestJS server restarts or the cron is executed multiple times in a day, all expiring tenants receive duplicate emails. | Track last sent reminder date or check for duplicate notifications on the same day. | `subscription-reminder.service.ts` |

## Real Send Test
- Method used: Static analysis and code-level tracing of `SubscriptionReminderService`.
- Result: **Failed**. Discovered recipient leakage, missing day-0 / post-expiry triggers, and timezone rendering issues in Bengali dates.

## Final Verdict
❌ **NEEDS REFACTORING** (Multi-recipient delivery, Bangladesh timezone formatting, and missing day-0/expiration notifications must be implemented.)
