# Security Improvement Checklist

**Last Updated:** November 14, 2025
**Status:** 10/17 Complete (59%)

---

## 🔴 IMMEDIATE PRIORITY (Before Production)

These **MUST** be completed before deploying to production.

- [x] **CRITICAL-01:** Create `middleware.ts` for server-side route protection ✅
  - ✅ Protect `/admin/*` routes from unauthorized access (using existing `proxy.ts`)
  - ✅ Verify admin status before allowing access to admin UI
  - ✅ Redirect non-admins to homepage
  - **Note:** Next.js 16 uses `proxy.ts` instead of `middleware.ts` - already implemented

- [x] **HIGH-01:** Add authorization checks to all Server Actions ✅
  - ✅ Create `requireAdmin()` helper function in `lib/auth-helpers.ts`
  - ✅ Add auth checks to `app/admin/actions.ts` (3 functions)
  - ✅ Add auth checks to `app/actions.ts` (1 function)
  - ✅ Add auth checks to `app/game/[id]/actions.ts` (5 functions)
  - ✅ Add auth checks to `app/game/[id]/cashout/actions.ts` (1 function)
  - ✅ Add auth checks to `app/game/[id]/live/actions.ts` (3 functions)

- [x] **HIGH-02:** Implement input validation with Zod ✅
  - ✅ Install Zod: `npm install zod`
  - ✅ Create validation schemas for Player, Game, RSVP, CashOut, Rebuy
  - ✅ Apply validation to all Server Actions that accept form data
  - ✅ Return user-friendly error messages for validation failures
  - ✅ Created `lib/validation.ts` with comprehensive schemas

- [x] **HIGH-03:** Sanitize error messages ✅
  - ✅ Never return raw `error.message` from database to client
  - ✅ Log detailed errors server-side only (with error codes)
  - ✅ Return generic error messages to users
  - ✅ Implement `handleServerError()` helper with error codes

- [x] **MEDIUM-02:** Add security headers to `next.config.js` ✅
  - ✅ Configure X-Frame-Options (DENY)
  - ✅ Configure X-Content-Type-Options (nosniff)
  - ✅ Configure X-XSS-Protection
  - ✅ Configure Referrer-Policy
  - ✅ Configure Content-Security-Policy
  - ✅ Configure Permissions-Policy

---

## 🟠 HIGH PRIORITY (Within 1 Week)

Important security improvements that should be completed soon.

- [x] **MEDIUM-03:** Add state parameter validation to OAuth callback ✅
  - ✅ Supabase automatically implements PKCE (more secure than state parameters)
  - ✅ Added origin validation in `/auth/callback` route
  - ✅ Validates request origin is from allowed domains
  - ✅ Added error handling for invalid origin
  - **Note:** PKCE + origin validation provides strong CSRF protection

- [x] **MEDIUM-04:** Fix RSVP race condition ✅
  - ✅ Created PostgreSQL function `promote_next_waitlist_player()`
  - ✅ Uses row-level locking with `FOR UPDATE SKIP LOCKED`
  - ✅ Updated `cancelRSVP` Server Action to use DB function
  - ✅ Migration: `20251114162206_fix_rsvp_race_condition.sql`

- [x] **LOW-01:** Remove/protect console.log statements ✅
  - ✅ Created logger utility in `lib/logger.ts`
  - ✅ Replaced all `console.log` with conditional logging
  - ✅ Replaced all `console.error` with logger that doesn't expose details
  - ✅ Production mode only logs errors (no sensitive data)

---

## 🟡 MEDIUM PRIORITY (Within 1 Month)

Security enhancements that improve monitoring and observability.

- [ ] **Setup error monitoring (Sentry)**
  - Create Sentry account and project
  - Install `@sentry/nextjs`
  - Configure Sentry in `sentry.client.config.ts` and `sentry.server.config.ts`
  - Test error reporting
  - Set up alerts for critical errors

- [ ] **Implement audit logging for admin actions**
  - Create `audit_log` table in database
  - Log all admin mutations (create/update/delete)
  - Include: user_id, action, resource_type, resource_id, timestamp
  - Create admin page to view audit logs

- [ ] **Add security alerting**
  - Set up alerts for multiple failed login attempts
  - Alert on RLS policy violations
  - Alert on unusual patterns (e.g., 100+ actions in 1 minute)
  - Configure notification channels (email/Slack)

- [x] **Implement role-based permissions** ✅
  - ✅ Added `role` enum field to `admin_users` table (superadmin, admin, viewer)
  - ✅ Updated RLS policies to support role-based access
  - ✅ Created viewer role with read-only access to all data
  - ✅ Updated `getServerAuth()` to return user role
  - ✅ Added UI controls that hide edit/delete buttons for viewers
  - ✅ Migration: `20251114165112_add_role_based_permissions.sql`
  - **Note:** Admins and superadmins can manage data, viewers can only read

---

## 🔵 NICE TO HAVE

Optional improvements that enhance security but aren't urgent.

- [ ] **Enhanced Content Security Policy**
  - Tighten CSP to remove `unsafe-inline` where possible
  - Use nonces for inline scripts
  - Test CSP in report-only mode first

- [ ] **PII anonymization on player deletion**
  - When admin deletes player, anonymize instead of hard delete
  - Replace email with `deleted_<uuid>@example.com`
  - Replace name with "Deleted Player"
  - Keep historical game data for statistics

- [ ] **Penetration testing**
  - Schedule quarterly security audits
  - Hire security professional for comprehensive pentest
  - Test authentication bypass attempts
  - Test authorization bypass attempts
  - Document findings and remediation

- [ ] **Implement rate limiting**
  - Choose rate limiting solution (Upstash Redis or Vercel KV)
  - Create rate limiting helper in `lib/rate-limit.ts`
  - Apply rate limiting to login page
  - Apply rate limiting to all Server Actions (10 req/10sec per user)
  - Add rate limit exceeded error messages

---

## ❌ NOT IMPLEMENTING

Items from the original audit that we've decided not to implement:

- ~~Session timeout configuration~~ - Supabase defaults are sufficient
- ~~Multi-factor authentication (MFA)~~ - Google OAuth only, MFA not needed

---

## Testing Checklist

Before considering security improvements "complete":

- [ ] Manually test admin route access without authentication
- [ ] Manually test admin route access as non-admin authenticated user
- [ ] Test all Server Actions with missing/invalid input
- [ ] Test Server Actions with XSS payloads in form fields
- [ ] Test RSVP race conditions with concurrent requests
- [ ] Run `npm audit` and ensure 0 vulnerabilities
- [ ] Verify security headers with securityheaders.com
- [ ] Test rate limiting by making excessive requests
- [ ] Verify error messages don't expose sensitive information
- [ ] Test audit logging captures all admin actions

---

## Progress Tracking

**Completion Status:**
- 🔴 Immediate Priority: 6/6 complete ✅ **DONE!**
- 🟠 High Priority: 3/3 complete ✅ **DONE!**
- 🟡 Medium Priority: 1/4 complete (25%)
- 🔵 Nice to Have: 0/4 complete
- Testing: 0/10 complete

**Total:** 10/27 items complete (37%)

---

## Notes

- All changes should be committed with clear security-focused commit messages
- Test each change thoroughly before moving to the next item
- Update this checklist as items are completed
- Add new security concerns as they are discovered
