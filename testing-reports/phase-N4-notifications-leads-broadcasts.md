# Phase N4: Leads & Broadcast Notifications — Delivery Correctness & Timing Report

## Triggers Covered
| Event | File / function | Type (Email/Web/Both) | Recipient(s) | Should fire when |
|---|---|---|---|---|
| Site Contact Inquiry | `inquiries.service.ts` (`createInquiry`) | Both | All Superadmins | Landing page contact form is submitted |
| Lead Follow-up Due | `leads.cron.ts` (`handleFollowUpNotifications`) | Web | Assigned Agent / All Admins | Lead `followUpAt` timestamp is reached |
| Broadcast Campaign Completed | `broadcasts.processor.ts` (`process`) | Email only (Web missing) | Owner `users[0]` only | Broadcast processing finishes |
| Broadcast Campaign Failed | `broadcasts.processor.ts` (`process`) | N/A (Missing) | None | Broadcast processing encounters an error |

## Verification Results
| Event | Trigger correctness | Timing correctness | Recipient correctness | Duplicate-safe? | Failure handled? | Content correct (EN/BN)? | Status |
|---|---|---|---|---|---|---|---|
| Site Inquiry | ✅ Correct | ✅ Instant / Queue | ✅ All Superadmins | ✅ Single trigger | ✅ Handled | ✅ Correct | ✅ READY |
| Lead Follow-up | ✅ Correct | ✅ Every 10m Cron | ❌ First owner `[0]` if unassigned | ✅ `followUpNotified` flag | ✅ Handled | ✅ Correct | ❌ Needs Fix |
| Broadcast Complete | ✅ Correct | ✅ Job completion | ❌ Owner `[0]` only (no Admins) | ✅ Single trigger | ❌ No web notif | ✅ Template name & recipient count | ❌ Needs Fix |
| Broadcast Failed | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Not Implemented |

## Bugs Found & Recommended Fixes
| # | Bug | Root cause | Recommended Fix | File(s) affected |
|---|---|---|---|---|
| 1 | **Broadcast Completion Single Recipient & Role Leak** | `broadcasts.processor.ts` queries `role: 'owner'` and selects `users?.[0]`. Admins and co-owners do not receive completion emails. | Query `role: { in: ['owner', 'admin'] }` and send email to all workspace admins/owners. | `broadcasts.processor.ts` |
| 2 | **Missing Broadcast In-App Web Notifications** | No `createNotification` is called when a broadcast campaign completes or fails. Users must manually refresh. | Send `createNotification` for broadcast completion and failure to all workspace admins/owners. | `broadcasts.processor.ts` |
| 3 | **Missing Broadcast Failure Alert Email** | When a broadcast status transitions to `failed` in `broadcasts.processor.ts` catch block, no alert is sent. | Trigger an alert email to workspace admins/owners when a broadcast fails. | `broadcasts.processor.ts` |
| 4 | **Unassigned Lead Follow-up Recipient Leak** | `leads.cron.ts` uses `findFirst` to pick a single owner when a lead is unassigned. | Use `findMany` and send the follow-up reminder notification to all workspace admins/owners. | `leads.cron.ts` |

## Real Send Test
- Method used: Static analysis and code tracing of `InquiriesService`, `LeadsCronService`, and `BroadcastsProcessor`.
- Result: **Failed**. Discovered missing broadcast web notifications, missing broadcast failure alerts, and multi-recipient leaks.

## Final Verdict
❌ **NEEDS REFACTORING** (Broadcast in-app notifications, failure alerts, and multi-recipient lead/broadcast fixes required.)
