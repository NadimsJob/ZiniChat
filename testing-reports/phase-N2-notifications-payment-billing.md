# Phase N2: Payment & Billing Notifications — Delivery Correctness & Timing Report

## Triggers Covered
| Event | File / function | Type (Email/Web/Both) | Recipient(s) | Should fire when |
|---|---|---|---|---|
| Manual Payment Submitted | `payments.service.ts` (`createInvoice`, `submitManualPaymentForAddon`) | Both | Tenant Owner + Superadmins | Tenant submits a manual MFS/Bank transaction ID |
| Payment Approved by Superadmin | `payments.service.ts` (`approvePayment`) | Both | Tenant Owner | Superadmin manually approves a pending payment |
| Automatic MFS Payment Claimed | `mfs-payments.service.ts` (`verifyPayment`, `claimTransaction`) | Both | Tenant Owner + Superadmins | Automated MFS matching engine verifies a transaction |
| Addon Purchased | `payments.service.ts` & `mfs-payments.service.ts` | Both | Tenant Owner | Addon payment is completed/approved |

## Verification Results
| Event | Trigger correctness | Timing correctness | Recipient correctness | Duplicate-safe? | Failure handled? | Content correct (EN/BN)? | Status |
|---|---|---|---|---|---|---|---|
| Manual Payment Submitted | ✅ Correct | ✅ Non-blocking (Queue) | ❌ Single owner only (`findFirst`) | ✅ TrxID checked | ⚠️ Fire & forget | ✅ Correct (TrxID & Amount) | ❌ Needs Fix |
| Payment Approved | ✅ Correct | ✅ Non-blocking (Queue) | ❌ Single owner only (`findFirst`) | ✅ Atomic status check | ⚠️ Fire & forget | ✅ Plan/Addon name accurate | ❌ Needs Fix |
| MFS Auto-Claimed | ✅ Correct | ✅ Non-blocking (Queue) | ❌ Single owner only (`findFirst`) | ✅ Protected by `$transaction` | ⚠️ Fire & forget | ✅ Clean TrxID & Amount | ❌ Needs Fix |
| Addon Purchased | ✅ Correct | ✅ Non-blocking (Queue) | ❌ Single owner only (`findFirst`) | ✅ Single trigger | ⚠️ Fire & forget | ✅ Addon limits updated | ❌ Needs Fix |

## Bugs Found & Recommended Fixes
| # | Bug | Root cause | Recommended Fix | File(s) affected |
|---|---|---|---|---|
| 1 | **Single Recipient Leak (Multi-admin workspace flaw)** | `payments.service.ts` and `mfs-payments.service.ts` use `prisma.user.findFirst({ where: { tenantId, role: { in: ['owner', 'admin'] } } })`. If a workspace has multiple admins/owners, only the first user found gets the payment email & in-app notification. | Replace `findFirst` with `findMany` and send emails/in-app notifications to all owners and admins of the tenant workspace. | `payments.service.ts`, `mfs-payments.service.ts` |
| 2 | **TypeScript Any-Casting Hack** | `(this.smtpService as any).triggerAddonPurchasedEmail(...)` is used in multiple places due to past loose typing. | Remove `as any` casting and ensure `SmtpService` method signature matches clean NestJS DI principles. | `payments.service.ts`, `mfs-payments.service.ts` |
| 3 | **Missing Payment Rejection Trigger** | When a manual payment is rejected/invalidated, there is no notification or email trigger to inform the tenant why their payment was rejected. | Add `rejectPayment` flow with `triggerPaymentRejectedEmail` and in-app notification. | `payments.service.ts`, `smtp.service.ts` |

## Real Send Test
- Method used: Static analysis of `payments.service.ts` and `mfs-payments.service.ts` execution flow.
- Result: **Failed**. Discovered recipient leakage (only 1 admin notified per workspace) and loose type-casting hacks.

## Final Verdict
❌ **NEEDS REFACTORING** (Multi-admin recipient leakage needs fix so all workspace owners/admins receive billing notifications.)
