# Production remediation status

Updated September 23, 2026.

## Completed in code

- Added `/healthz` as a dependency-free liveness endpoint.
- Added `/readyz` as a database-backed readiness endpoint with a generic 503 response on failure.
- Hardened the legacy authenticated booking path:
  - price, currency, customer identity, and duration are derived server-side;
  - browser-supplied financial, payment-status, and customer fields are ignored;
  - trainer existence and future start time are validated;
  - trainer row locking and overlap checks prevent concurrent pending/paid slot reservations;
  - PaymentIntent creation requires an owned pending booking;
  - PaymentIntent amount and currency are checked against the stored booking;
  - PaymentIntent creation uses a stable booking-scoped Stripe idempotency key;
  - paid status updates require a syntactically valid Stripe payment reference.
- Updated the existing booking form to use the server-returned amount.
- Added focused regression tests for the hardened legacy booking/payment contract.
- Added a read-only, PII-free account-cleanup aggregate report:
  - `npm run audit:account-cleanup`
  - it never updates or deletes accounts.
- Added non-secret configuration names to `.env.example`.

## Owner action still required

These values must be configured by the owner/operator; the application must not invent them:

- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`
- `BOOKING_NOTIFICATIONS_ENABLED=true`

After configuration, verify the Turnstile site/secret pair for both `groundupbjj.com` and `www.groundupbjj.com`, then run an approved internal-recipient email test.

## Not performed

- No production secret changes.
- No deployment.
- No production database mutation.
- No account deletion or quarantine.
- No Stripe object creation.
- No live payment, booking, or customer email.
- No replay or mutation of historical webhook rows.
