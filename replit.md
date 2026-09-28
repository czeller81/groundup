# Ground Up BJJ

Ground Up is the production web application and member platform for Ground Up Jiu-Jitsu & Fitness in Oxnard, California.

## Architecture

- React 18 + TypeScript + Vite frontend
- Express + TypeScript backend
- PostgreSQL / Neon through Drizzle ORM
- Session-authenticated member, coach, and admin portal
- Google Calendar-backed class schedule and Ground Up-owned reservation boundary
- Stripe membership/payment integration
- Discovery Pass onboarding
- Scoped service-to-service AI management API
- Delegated member AI self-service foundation (default off)

## Scheduling and reservations

Google Calendar is the schedule source. Ground Up stores normalized class occurrences and is authoritative for reservation eligibility, capacity, duplicate/overlap checks, waitlists, membership/Discovery Pass entitlement use, and reservation audit events.

Legacy private-session bookings remain separate from modern class reservations.

## AI integrations

### Management/provider API

The existing `/api/ai/v1` API uses the scoped `LIME_AGENT_API_KEY` / `LIME_AGENT_API_SCOPES` service credential model. Missing scopes grant nothing.

### Delegated member self-service

The `/api/ai/member/v1` foundation lets an authenticated member create a short-lived, scoped delegation for an agent. Delegated tokens are stored only as hashes and are bound to the canonical Ground Up member identity.

This feature is **default off**. Production activation requires:

1. the member-AI migration to be applied,
2. schema readiness to pass,
3. acceptance/security tests to pass,
4. explicit `MEMBER_AI_SELF_SERVICE_ENABLED=true`.

The delegated API never allows an agent to sign the liability waiver. Waiver acceptance remains a human action in the member portal. Booking creation requires explicit confirmation and idempotency and is re-authorized at the Ground Up reservation transaction boundary.

## Database migrations

Committed migrations live in `migrations/`. The delegated member-AI schema is introduced by:

`migrations/20260927_member_ai_self_service.sql`

Do not run schema changes against an unconfirmed database target.

## Development

Install dependencies and run:

`npm run check`

`npm test`

`npm run build`

## Security

- Never commit environment files or production credentials.
- Store production secrets in the deployment platform.
- Do not expose member session cookies or delegated bearer tokens in logs.
- Customer-specific agent actions must use delegated identity; a service credential alone must never select a member by arbitrary email or user ID.
- Ground Up remains authoritative for booking eligibility and waiver state.

## Repository workflow

Normal development should use a feature/fix branch and pull request. Keep `main` reviewable and deployable.
