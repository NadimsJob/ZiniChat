# Phase N5: Support & Ticket Notifications — Delivery Correctness & Timing Report

## Triggers Covered
| Event | File / function | Type (Email/Web/Both) | Recipient(s) | Should fire when |
|---|---|---|---|---|
| Ticket Created (Manual) | `tickets.service.ts` (`createTicket`) | Both | First owner `[0]` + All Superadmins | Tenant manually submits a support ticket |
| Ticket Created (AI Auto-escalated) | `support-chat.service.ts` | Email + Superadmin Web | All Superadmins only (Tenant Web missing) | AI Support bot creates a ticket |
| Ticket Replied by Admin | `tickets.service.ts` (`addMessage`) | Both | All Tenant Users (Web), First owner `[0]` (Email) | Superadmin/Support agent replies to ticket |
| Ticket Replied by Tenant | `tickets.service.ts` (`addMessage`) | Web only (Email missing) | Assigned Superadmin / All Superadmins | Tenant user replies to a support ticket |
| Ticket Status Updated | `tickets.service.ts` (`updateStatus`) | Both | First owner `[0]` only | Superadmin updates ticket status (e.g. Closed) |
| Ticket Assigned | `tickets.service.ts` (`assignTicket`) | Both | Assigned Superadmin | Superadmin assigns ticket to a support agent |

## Verification Results
| Event | Trigger correctness | Timing correctness | Recipient correctness | Duplicate-safe? | Failure handled? | Content correct (EN/BN)? | Status |
|---|---|---|---|---|---|---|---|
| Ticket Created (Manual) | ✅ Correct | ✅ Non-blocking (Queue) | ❌ First owner `[0]` only (Web) | ✅ Single trigger | ⚠️ Fire & forget | ✅ Correct | ❌ Needs Fix |
| Ticket Created (AI) | ❌ Event Parity missing | ✅ Non-blocking (Queue) | ❌ Tenant web notification missing | ✅ Single trigger | ⚠️ Fire & forget | ✅ Correct | ❌ Needs Fix |
| Ticket Reply (Admin) | ✅ Correct | ✅ Non-blocking (Queue) | ❌ First owner `[0]` only (Email) | ✅ Single trigger | ⚠️ Fire & forget | ✅ Correct | ❌ Needs Fix |
| Ticket Reply (Tenant) | ❌ Email missing | ✅ Non-blocking (Queue) | ❌ Superadmin email missing (Unassigned) | ✅ Single trigger | ⚠️ Fire & forget | ✅ Correct | ❌ Needs Fix |
| Ticket Status Changed | ✅ Correct | ✅ Non-blocking (Queue) | ❌ First owner `[0]` only | ✅ Single trigger | ⚠️ Fire & forget | ✅ Correct | ❌ Needs Fix |
| Ticket Assigned | ✅ Correct | ✅ Non-blocking (Queue) | ✅ Assigned Admin | ✅ Single trigger | ⚠️ Fire & forget | ✅ Correct | ✅ READY |

## Bugs Found & Recommended Fixes
| # | Bug | Root cause | Recommended Fix | File(s) affected |
|---|---|---|---|---|
| 1 | **Single Recipient Leak on Ticket Creation & Status Updates** | `createTicket` and `updateStatus` use `findFirst` or `users[0]`. Co-owners and admins do not receive ticket creation or status change emails/notifications. | Send notifications and emails to all workspace admins/owners (`findMany`). | `tickets.service.ts` |
| 2 | **Single Recipient Leak on Admin Reply Email** | When an admin replies, `addMessage` sends in-app notifications to all tenant users, but sends `triggerTicketRepliedEmail` to only 1 owner (`owner`). | Send `triggerTicketRepliedEmail` to all workspace admins/owners. | `tickets.service.ts` |
| 3 | **Missing Superadmin Email Alert on Unassigned Tenant Reply** | When a tenant replies to an unassigned ticket, `addMessage` calls `createSystemNotificationForSuperadmins`, but does NOT email superadmins. | Send `triggerTicketRepliedEmail` to superadmins (`getAdminNotificationEmails`). | `tickets.service.ts`, `smtp.service.ts` |
| 4 | **AI Event Parity Missing on Auto-Escalation** | When Support AI creates a ticket, it notifies superadmins, but does NOT send an in-app notification to the tenant workspace. | Call `notificationsService.createNotification` for all workspace admins/owners when AI creates a ticket. | `support-chat.service.ts` |

## Real Send Test
- Method used: Static analysis and code tracing of `TicketsService` and `SupportChatService`.
- Result: **Failed**. Discovered multi-recipient email leakage on status/replies, missing AI event parity, and missing superadmin emails on unassigned ticket replies.

## Final Verdict
❌ **NEEDS REFACTORING** (Multi-recipient delivery for ticket status/replies, AI event parity, and superadmin reply email alerts required.)
