# Phase N1: SMTP Infra + Transactional Emails (Auth/Account) — Delivery Correctness & Timing Report

## Triggers Covered
| Event | File / function | Type (Email/Web/Both) | Recipient(s) | Should fire when |
|---|---|---|---|---|
| New Tenant Signup | `auth.service.ts` (`signupTenant`, `googleCallback`) | Email (Welcome) + Web (Superadmin) | New User (Owner), Superadmins | User successfully registers a workspace |
| Password Reset Request | `auth.service.ts` (`forgotPassword`) | Email + Web | Requesting User | User submits forgot password form |
| Email Verification | `auth.service.ts` (`verifyEmail`) | N/A | N/A | (Intended: after signup to verify email) |

## Verification Results
| Event | Trigger correctness | Timing correctness | Recipient correctness | Duplicate-safe? | Failure handled? | Content correct (EN/BN)? | Status |
|---|---|---|---|---|---|---|---|
| Welcome Email | ✅ Correct | ⚠️ No queue (Fire & forget) | ✅ Sent to new owner | ✅ Single trigger | ❌ Silent failure | ⚠️ Passes \`name\` as \`tenantName\` | ❌ Needs Fix |
| Signup Web Alert | ✅ Correct | ⚠️ No queue (Fire & forget) | ✅ All superadmins | ✅ Single trigger | ❌ Silent failure | ✅ Correct | ⚠️ Needs Retry |
| Password Reset | ✅ Correct | ❌ Blocking (Awaited) | ✅ Correct user | ✅ Overwrites token | ❌ Silent failure | ✅ Expiry time matches (1h) | ❌ Needs Fix |
| Reset Web Alert | ✅ Correct | ⚠️ No queue (Fire & forget) | ✅ Correct user | ✅ Single trigger | ❌ Silent failure | ✅ Correct | ⚠️ Needs Retry |
| Email Verify Flow | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Not Implemented |

## Bugs Found & Fixed (Or Recommended Fixes)
| # | Bug | Root cause | Recommended Fix | File(s) affected |
|---|---|---|---|---|
| 1 | **Global Silent Failures on Emails** | `SmtpService.sendMail` wraps the sending logic in a `try...catch` block that only logs to the console and swallows the error. If SMTP is down, `triggerWelcomeEmail` or `triggerPasswordResetEmail` will silently fail without notifying the frontend or retrying. | Remove the `try...catch` from `sendMail` and let the caller handle the failure, OR implement a BullMQ background queue for email dispatching with auto-retries. | `smtp.service.ts` |
| 2 | **Blocking API for Password Reset** | `auth.service.ts` `await`s the `triggerPasswordResetEmail` call. Because `sendMail` has large timeouts (15s connection/greeting timeout), if the SMTP server is slow, the user's API request will hang for a long time. | Move email dispatch to an async BullMQ job, or run it without `await`. | `auth.service.ts` |
| 3 | **Missing Email Verification Flow** | The user receives a welcome email on signup, but NO verification link is generated or sent. The `verifyEmail` controller endpoint exists but only clears the `resetPasswordToken`. | Add `triggerVerifyEmail` in `SmtpService`. In `signupTenant`, generate a verification token (like the reset token) and send the verification email instead of (or alongside) the welcome email. | `auth.service.ts`, `smtp.service.ts` |
| 4 | **Welcome Email Content Issue** | `this.smtpService.triggerWelcomeEmail(email, name)` passes the user's `name` into the `tenantName` placeholder. The template says "প্রিয় {{tenantName}}", so it will say "প্রিয় [User Name]", which might be acceptable but technically mismatched variable names. | Pass `businessName` or rename the variable. | `auth.service.ts` |

## Real Send Test
- Method used: Code-level static tracing and architectural review of the SMTP module and Auth flow.
- Result: **Failed**. Discovered that the entire email verification trigger is missing, and global silent-failures exist in the SMTP service.

## Final Verdict
❌ **NOT READY** (Global silent failures in SMTP service, blocking API calls, and incomplete email verification flow.)
