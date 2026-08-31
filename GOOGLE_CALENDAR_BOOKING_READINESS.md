# Google Calendar Class Booking — Readiness Report

Date: August 31, 2026  
Timezone: America/Los_Angeles  
Approved calendar: `info@groundupbjj.com`

## Decision

**NOT READY FOR PRODUCTION CUTOVER**

The replacement architecture is implemented in the development workspace, but the approved Google Calendar returned zero events for the initial synchronization window (August 30 through November 29, 2026). Live occurrence behavior cannot be accepted until representative class events exist.

**NOT PUBLISHED BY THIS TASK**

Existing historical bookings, Calendly identifiers, Stripe fields, and private-session paths were preserved. No Google event was created, edited, or deleted. No production payment was initiated. The synchronization sent no email because no events or reservations existed.

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

### Passed — 9 checks

1. TypeScript check: passed.
2. Production build: passed.
3. Existing security suite: 7 passed, 0 failed.
4. Database schema applied to the same Neon URL used by the runtime.
5. Google Calendar connector authorization: passed.
6. Approved calendar selection: passed.
7. Initial 90-day sync: passed with 0 received, 0 mapped, 0 unmapped, 0 cancelled, and 0 removed.
8. Public schedule API: HTTP 200 with explicit healthy/configured state.
9. Anonymous admin sync-status access: HTTP 401.

### Blocked by empty approved calendar — 8 checks

1. Recurring event expansion against a real class series.
2. Single-instance time override reconciliation.
3. Google cancellation/deletion propagation with existing reservations.
4. Simultaneous final-seat attempts against a live occurrence.
5. Duplicate and overlapping booking rejection against a live occurrence.
6. Ordered waitlist promotion after cancellation.
7. Confirmation, waitlist, promotion, and cancellation email delivery.
8. End-to-end public, member, coach/admin, and mobile acceptance with populated class data.

Blocked checks are not counted as passes. They must be completed before standard-class Calendly or static-schedule retirement is approved for production.

## Release gate

Add representative future class events to the approved calendar, including one recurring series, one modified instance, one cancelled instance, and one low-capacity occurrence. Then run the blocked acceptance matrix. Production cutover requires every critical booking, authorization, synchronization, and cancellation check to pass.