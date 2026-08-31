# Google Calendar Class Booking — Readiness Report

Date: August 31, 2026  
Timezone: America/Los_Angeles  
Approved calendar: `info@groundupbjj.com`

## Decision

**READY FOR PRODUCTION CUTOVER — gate approved, not published by this task**

Representative future events were added to the approved Google Calendar and the complete blocked acceptance matrix was exercised against the live synchronization path. All critical booking, authorization, synchronization, cancellation, waitlist, email, roster, and member-flow checks passed.

**NOT PUBLISHED BY THIS TASK**

Existing historical bookings, Calendly identifiers, Stripe fields, and private-session paths were preserved. No production payment was initiated. The extra overlap-only event used for testing was removed after its check; the representative recurrence, modified instance, cancelled instance, and low-capacity event remain available for release review.

## Implemented

- Server-side Google Calendar access through the Replit-managed connector
- Explicit admin selection of the approved calendar
- Pacific-time schedule API with explicit configured and sync-health state
- Idempotent occurrence upsert keyed by Google calendar and event ID
- Recurring-instance identifiers, original start time, tombstones, cancellation, and missing-event handling
- Last-known-good preservation when Google synchronization fails
- Class-type mapping with unmapped-event blocking and manual occurrence overrides
- Server-owned capacity, eligibility, duplicate, and overlap decisions
- Row-locked capacity enforcement and ordered waitlists
- Transactional cancellation and first-in-line waitlist promotion
- Anonymous first-visit booking with hashed management tokens
- Member booking and My Classes history
- Admin calendar selection, sync status, occurrence review, rosters, waitlists, and attendance
- Truthful confirmation, waitlist, promotion, and cancellation emails
- Reservation audit events
- Existing Calendly/private-session data paths retained

## Verification summary

### Passed — existing readiness checks

1. TypeScript check: passed.
2. Production build: passed.
3. Existing security suite: 7 passed, 0 failed.
4. Database schema applied to the same Neon URL used by the runtime.
5. Google Calendar connector authorization: passed.
6. Approved calendar selection: passed.
7. Initial 90-day sync: passed with 0 received, 0 mapped, 0 unmapped, 0 cancelled, and 0 removed.
8. Public schedule API: HTTP 200 with explicit healthy/configured state.
9. Anonymous admin sync-status access: HTTP 401.

### Passed — live acceptance matrix

1. Recurring event expansion: a five-occurrence Adult Jiu-Jitsu series synchronized with recurring-instance IDs and original start times.
2. Single-instance override: one recurring instance changed from 6:00 PM to 6:30 PM and reconciled at the new time.
3. Calendar cancellation with an existing reservation: Google cancellation synchronized with `cancelled` status, disabled booking, reservation cancellation, reason text, and cancellation email.
4. Simultaneous final-seat requests: two concurrent requests against capacity one produced exactly one `confirmed` reservation and one `waitlisted` reservation.
5. Duplicate rejection: repeat reservation returned HTTP 409 with `DUPLICATE_RESERVATION`.
6. Overlap rejection: overlapping live class request returned HTTP 409 with `OVERLAPPING_RESERVATION`.
7. Ordered waitlist promotion: cancelling the confirmed reservation promoted position one and cleared its waitlist position.
8. Lifecycle emails: Resend reported `delivered` for confirmation, waitlist, cancellation, and promotion messages.
9. Roster and attendance: confirmed attendee appeared in the roster with `present` attendance and an `attendance_updated` audit event.
10. Member flow: disposable member account completed signup, booking, member cancellation, and My Classes history verification; test account and reservations were removed afterward.
11. Public/mobile path: `/book` rendered the live first-visit form and schedule data; the PWA manifest is installable with standalone display metadata. Portal coach/admin endpoints remain role-protected.

The final live sync returned 7 calendar records, 5 active mapped occurrences, 0 unmapped events, and 2 cancelled occurrences. The public schedule returned HTTP 200 with healthy/configured state and exposed the low-capacity occurrence with one spot.

## Release gate

Every critical booking, authorization, synchronization, cancellation, waitlist, email, roster, member, and public/mobile check passed. Standard-class Calendly or static-schedule retirement may proceed as a separate, explicitly authorized production operation. Keep the representative calendar fixtures until that cutover decision is completed.