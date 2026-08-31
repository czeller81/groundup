# Ground Up — Product, UX, Business & Technical Audit

**Audit date:** August 31, 2026  
**Scope:** Existing repository, local development preview, safe read-only HTTP checks, build/test commands, and deployment logs  
**Method:** Audit only. No application code, database data, secrets, external appointments, payments, production emails, or deployment settings were changed.

## Evidence notation

- **Verified:** observed directly in source, a safe local/runtime check, command output, or deployment log.
- **Inferred:** strongly indicated by source behavior, but not independently exercised end-to-end.
- **Unknown:** cannot be confirmed without production configuration, credentials, provider dashboards, or a safe test account.

---

# 1. Executive verdict

## NOT READY

Ground Up is a substantial, polished-looking React/Express application with a working public site, member portal, lead persistence, admin tools, signed webhook helpers, and a passing baseline test suite. It is not ready to send meaningful traffic or accept production bookings yet.

The primary problem is not that the project lacks code. It is that the customer-facing product is internally undecided: the site presents a broad BJJ and fitness studio for “women, kids & beginners,” while the current business direction calls for a focused women-only Ground Up community and a 12-week Ground Up → Adaptive Capacity journey. At the same time, the site describes an 8-week self-defense offer, uses multiple conversion paths, and sends some visitors to an account wall before they can request an introduction.

There are also material operational and security blockers:

1. A generic booking API accepts client-controlled price/status fields.
2. Coach object-level authorization is incomplete for sensitive member data.
3. Webhook events are claimed before side effects finish, so valid provider events can be permanently lost after an error.
4. A legacy admin surface contains plaintext credential handling and a shipped default credential in client code, even though the legacy endpoint is currently session-protected.
5. Booking capacity/overlap behavior is not transactionally safe.
6. Production readiness is not demonstrated: Stripe is disabled in the current development environment, actual provider setup is unknown, and deployment logs show repeated startup health-check failures before eventual startup.

The fastest path is to resolve the business model and women-only rules first, then consolidate the visitor journey around one truthful first-visit request/booking flow, harden booking/auth/webhooks, and publish the trust/legal surfaces needed for a women-focused physical program.

## Scores

| Area | Score | Assessment |
|---|---:|---|
| Brand clarity | 52 | Strong visual identity and recognizable BJJ/self-defense language, but too many identities compete. |
| Business-model alignment | 38 | Current copy conflicts with the stated women-only and 12-week direction. |
| Visitor trust | 54 | Real facility imagery, named coach, safety language, and useful first-class guidance help; address, policies, and proof are thin. |
| UX quality | 62 | Coherent, thoughtfully built flows, but long pages, competing CTAs, and mixed funnel logic add friction. |
| Mobile UX | 62 | Responsive patterns are present in source; a dedicated device-width visual pass was not directly verifiable. |
| Conversion readiness | 43 | Lead form exists, but status language, CTA destinations, and positioning are inconsistent. |
| Booking readiness | 35 | External Calendly and internal booking paths exist, but capacity, payment, and integrity controls are not production-safe. |
| Lead-capture readiness | 62 | Persistence, validation, notifications, and staff email attempts exist; consent, spam, confirmation, and deduplication are incomplete. |
| Member experience | 55 | Useful forms, membership, bookings, schedule, and cancellation features; no real progress, messaging, or profile/account recovery. |
| Admin/operations readiness | 54 | Admin inbox, members, attendance, notes, and reporting exist; schedule, capacity, content, payments, refunds, and cohorts are missing. |
| Technical quality | 64 | Clear TypeScript/Drizzle structure and passing checks; some legacy duplication, unbounded queries, and configuration drift remain. |
| Security/privacy | 42 | Good baseline headers, hashing, signatures, and generic errors; high-risk authorization, credential, CSRF, validation, and privacy gaps remain. |
| Production readiness | 39 | Build passes, but provider configuration, health behavior, observability, recovery, and critical business integrity are unproven. |
| **Overall** | **49** | Capable baseline, not safe or clear enough for production traffic. |

---

# 2. Application inventory

## Stack and infrastructure

| Component | Current state | Evidence |
|---|---|---|
| Frontend | React 18 + TypeScript, Vite, Wouter, Tailwind/shadcn-Radix, Framer Motion, TanStack Query, React Hook Form/Zod | `package.json`; `vite.config.ts`; `client/src/App.tsx` |
| Backend | Express 4 + TypeScript | `package.json`; `server/index.ts`; `server/routes.ts` |
| Database | PostgreSQL through Drizzle ORM and Neon serverless driver | `server/db.ts`; `shared/schema.ts` |
| Sessions | `express-session`; PostgreSQL-backed in production when a DB URL is present, in-memory store otherwise | `server/index.ts:26-44` |
| Authentication | Custom email/password authentication with bcrypt and cookie sessions; not Replit Login in the implemented routes | `server/routes.ts:658-733`; `server/storage.ts:131-165` |
| Email | Resend through the installed Replit connector | `server/email.ts`; connector metadata |
| Payments | Stripe client/payment-intent support and webhook handler; no complete customer checkout/subscription flow visible | `server/routes.ts:340-397`; `client/src/lib/stripe.ts` |
| Booking/calendar | Calendly embed and signed Calendly webhook; separate internal booking API and static schedule | `client/src/pages/portal/booking.tsx`; `server/routes.ts:607-653`; `client/src/lib/schedule-data.ts` |
| Analytics | First-party event persistence, consent UI, UTM/session attribution, and Meta Pixel | `client/src/lib/analytics.ts`; `client/src/lib/meta-pixel.ts`; `server/routes.ts:486-501` |
| File storage | No application file-upload/storage path found | Repository search |
| External links | Google Fonts, Unsplash reference, social links, and external `1club.ai` progress link | `client/index.html`; `client/src/pages/portal/dashboard.tsx` |
| Deployment | Replit Node 20/web/PostgreSQL 16, port 5000, autoscale build/start configuration | `.replit`; `package.json` |

### Configuration and environment observations

- The runtime supports `NEON_DATABASE_URL` and `DATABASE_URL`; the current repository also includes a broad `.env.example` with Stripe, Resend, session, admin, analytics, calendar, and legacy settings.
- The current development workflow logged `STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.` This is a verified local condition, not proof of production configuration.
- The actual values of secrets and production environment variables were not accessed.
- Configuration drift is visible: `site.config.ts` says `America/New_York` and names Sofia Martinez, while customer-facing/seed content centers Raymi Gonzalez and Oxnard. This is a business and timezone risk.

## Frontend route inventory

Routes are declared in `client/src/App.tsx:53-117`. Status means current observed/source status, not a claim that every flow has passed end-to-end testing.

| Route | Purpose/audience | Auth requirement | Status | Notes |
|---|---|---|---|---|
| `/` | Public marketing homepage | None | WORKING | Safe preview returned 200 and rendered. Strong visual polish; positioning is broad. |
| `/personal-training` | Public PT information | None | WORKING / source-verified | Contains women-only PT positioning; booking CTAs frequently go to portal login. |
| `/coaches` | Public coach profile | None | WORKING / source-verified | Names Raymi and describes credentials/lineage; actual credential verification is unknown. |
| `/pricing` | Public programs/pricing | None | WORKING / source-verified | Contains “anyone” language that conflicts with a women-only direction. |
| `/contact` | Public contact form | None | WORKING / source-verified | Posts to `/api/contact`; persistence and staff notification are implemented. |
| `/privacy` | Public privacy policy | None | WORKING / source-verified | Privacy page exists; other key operational/legal pages do not. |
| `/schedule` | Public class schedule | None | WORKING / source-verified | Static client-side schedule; not a live capacity calendar. |
| `/book` | Public trial/first-visit lead funnel | None | WORKING / source-verified | Three-step request form; does not itself reserve an appointment. |
| `/womens-self-defense` | Public women’s program page | None | WORKING / source-verified | Strongest women-only positioning; calls the program 8 weeks. |
| `/kids` | Public kids program page | None | WORKING / source-verified | Creates a second audience and business identity. |
| `/adaptive-capacity` | Public interest-list page | None | WORKING / source-verified | Interest list only; cohort details are not confirmed. |
| `/admin` | Legacy admin UI | Should be staff-only | DEAD ROUTE / BROKEN | Safe runtime request returned 404 despite a client route and legacy code existing. Legacy API code remains. |
| `/ln/login` | Legacy login alias | None | PARTIAL | Client redirect to `/portal/login`. |
| `/portal/login` | Member login/signup | None | WORKING / source-verified | Safe preview rendered. No password reset or verification flow. |
| `/portal/dashboard` | Member dashboard | Member session | PARTIAL | Frontend redirects unauthenticated users; authenticated behavior not exercised with a test account. |
| `/portal/forms/:slug` | Member intake/waiver form | Member session | PARTIAL | Draft/save/submit/retake behavior exists; server-side answer enforcement is weak. |
| `/portal/booking` | Authenticated Calendly booking | Member session | PARTIAL | Embed exists; actual Calendly setup and webhook mapping are unknown. |
| `/portal/schedule` | Portal schedule display | Should be member-only | PARTIAL / access concern | Component has no visible auth check; content is static. Safe unauthenticated GET returned 200. |
| `/portal/admin` | Modern admin/staff center | Admin/coach | PARTIAL | UI and server role checks exist; schedule/content/payment/cohort operations are missing. |
| `/portal/coach` | Coach center | Coach/admin | PARTIAL | Assigned-member UI exists, but sensitive API object authorization is too broad. |
| Catch-all | Not-found page | None | WORKING | Unmatched client paths use a not-found page where the SPA is reached. |

## Meaningful API inventory

All routes are in `server/routes.ts`. The table groups related endpoints while retaining the important method/auth behavior.

| Endpoint group | Auth | Main behavior | Current assessment |
|---|---|---|---|
| `GET /robots.txt`, `GET /sitemap.xml` | None | Serves SEO files | WORKING; verified 200 locally. |
| `GET /api/trainers`, `GET /api/trainers/:id`, `GET /api/trainers/:id/availability` | None | Public trainer/availability reads | WORKING/source-verified; availability is not the same as reservable capacity. |
| `GET /api/bookings` | Admin/coach | Staff booking list | Protected, but unbounded and backed by a storage method that ignores filters. |
| `POST /api/bookings` | Authenticated + rate-limited | Creates internal booking | HIGH RISK; broad client insert schema accepts client-controlled financial/status/time fields. |
| `PUT /api/bookings/:id/status` | Admin/coach | Staff status update | Protected; business-rule validation needs review. |
| `POST /api/create-payment-intent` | Authenticated + rate-limited | Creates Stripe intent | Partial; ownership check exists, but booking/amount/status/currency consistency is not fully verified. |
| `POST /api/stripe/webhook` | Stripe signature expected | Marks booking paid on `payment_intent.succeeded` | Signature helper is good; event claim/retry and amount/booking consistency are not production-safe. |
| `POST /api/contact` | Public + rate-limited | Validates/persists contact message, creates staff notification, attempts staff email | Functional baseline; no public CAPTCHA, duplicate handling, or visitor confirmation email. |
| `POST /api/trial-leads` | Public + rate-limited | Validates/persists trial/adaptive lead, creates notification, attempts staff email | Functional baseline; response semantics and consent/confirmation need improvement. |
| `POST /api/analytics/events` | Public + rate-limited | Persists event and arbitrary properties | Returns 204 locally; server-side PII scrubbing/retention limits are absent. |
| `GET /api/portal/admin/campaign-report` | Admin/coach | Aggregates funnel/UTM report | Exists; loads data in memory and has no date range/time-series comparison. |
| Notification list/read endpoints | Admin/coach | Staff inbox and read state | Implemented; current notification queue is shared rather than per-staff. |
| Trial lead list/status endpoints | Admin/coach | Staff lead review/status | Implemented; follow-up workflow remains manual. |
| Contact list/status endpoints | Admin | Staff contact inbox/status | Implemented. |
| `POST /webhook/calendly` | Signed webhook + rate-limited | Validates/deduplicates event, creates user/booking | Signature and idempotency baseline exists; claim-before-side-effect is a high-risk failure mode. |
| Signup/login/logout/me | Public except current-user read | Custom account/session lifecycle | Login/signup/logout exist; reset, verification, MFA, lockout, revocation, and session regeneration are absent. |
| Form list/detail/save/retake/submit | Authenticated | Member intake and waiver lifecycle | Implemented; server does not adequately validate dynamic required fields/types. |
| Member booking list/create/cancel | Authenticated | Member booking lifecycle | Implemented; availability, overlap, capacity, and rescheduling are incomplete. |
| Admin stats/members/member detail/notes/role/belt/attendance/forms/bookings | Role-protected | Admin/staff operations | Substantial baseline; authorization and validation need tightening. |
| Membership and session-note endpoints | Authenticated/admin/coach | Membership creation/read and coach notes | Partial; little server-side validation, and coach scope is too broad for member data. |
| Legacy admin login/booking/trainer endpoints | Mixed role-protected | Older admin implementation | Retain historical evidence for now, but retire after a controlled migration. Legacy credential handling is unsafe. |

## Database inventory

Verified Drizzle tables in `shared/schema.ts`:

| Table | Stores | Audit finding |
|---|---|---|
| `users` | Identity, contact, password hash, role, belt, attendance, coach assignment, admin notes | `assignedCoachId` is not visibly declared as a foreign key; role is free text. |
| `forms` | Dynamic form definitions and required/retakeable flags | Flexible but shifts correctness into runtime JSON. |
| `form_responses` | Per-user answers and draft/submitted state | Foreign keys exist; no visible unique constraint preventing duplicate responses for a user/form pair. |
| `trainers` | Coach profile, specialties, belt, JSON availability | Availability is flexible JSON, not an authoritative slot/capacity model. |
| `bookings` | Customer identity, session, times, trainer, price/currency, Stripe/Calendly IDs, status | Calendly event uniqueness exists; no database-level overlap/capacity guard. |
| `webhook_events` | Provider event claims/idempotency records | Claim lifecycle does not visibly distinguish pending, succeeded, and failed processing. |
| `admin_users` | Legacy admin email/password | Plaintext password field and legacy direct comparison are high-risk historical remnants. |
| `memberships` | User membership type/status, price, dates | No visible enum/business constraints; admin can create active records with weak validation. |
| `session_notes` | Member/coach notes and date | Sensitive; coach authorization is not sufficiently scoped. |
| `trial_leads` | Training/adaptive leads, child/program data, attribution, consent, status | Contains minor and potentially sensitive lead information; no visible dedupe/retention workflow. |
| `analytics_events` | Event/session/path/properties | Arbitrary JSON properties create privacy and storage-abuse risk. |
| `contact_submissions` | Contact identity, subject/message, consent/status | No visible duplicate/retention workflow. |
| `staff_notifications` | Shared staff inbox notifications and read time | Useful operational baseline; no per-staff queue model. |

Startup seed behavior creates Raymi Gonzalez and seven forms if absent, including intake/waiver, media release, gym rules, and minor consent forms. Seed failure is logged asynchronously rather than making readiness fail.

---

# 3. Homepage and brand audit

## What a first-time Oxnard visitor understands

The first screen answers some important questions well:

- **What is it?** A “Boutique BJJ & Self-Defense Studio · Oxnard, CA.”
- **Where is it?** Oxnard, CA is visible immediately.
- **What benefit is offered?** “CONFIDENCE BUILT HERE” and real self-defense skills, strength, and confidence.
- **Is it beginner-friendly?** Yes: “No intimidation. Ever.”
- **What action is available?** “Start Your Free Trial.”

It does **not** answer the following clearly enough:

- Is the core program women-only, or is the gym for women, kids, adults, and anyone?
- Is Ground Up primarily BJJ, self-defense, fitness, personal development, or a broader resilience platform?
- Is the actual flagship a free first class, an 8-week self-defense program, a membership, or a future 12-week Adaptive Capacity cohort?
- What happens after the form is submitted: is the appointment booked or is it only a request?
- What is the full location/address, and what should a first-time visitor expect on arrival?

## Strong elements

- The hero copy is concrete about activity, emotional outcome, and location (`client/src/pages/home.tsx:116-138`).
- The first-class guidance is unusually useful: arrive 15 minutes early, meet Coach Raymi, no sparring in the first session, comfortable athletic clothing, and no gear required (`home.tsx:201-289`).
- The site uses actual facility and training imagery and explicitly claims “no stock photos, no actors” (`home.tsx:628-640`).
- Small-group and coaching language supports a premium, personal experience.
- Named coach, lineage, safety language, and testimonials create a credible base.

## Weak, redundant, or confusing sections

1. **Hero audience conflict:** “for women, kids & beginners” is incompatible with a simple women-only promise.
2. **Too many product frames:** The homepage shifts from studio to “human resilience and capability platform,” then offers five paths: Women’s Self-Defense, Women’s BJJ, Kids, Strength & Conditioning, and Adaptive Capacity (`home.tsx:292-412`).
3. **Competing primary actions:** The page repeatedly cycles through free trial, book intro, schedule, program links, and portal login.
4. **Program duplication:** Women’s self-defense, women’s BJJ, and Adaptive Capacity are related in emotional language but not clearly sequenced.
5. **Long page density:** Many sections, uppercase display text, animations, gradients, cards, facility gallery, testimonials, FAQs, and repeated CTAs make the page feel more like a broad template than a focused offer.
6. **Trust content arrives late:** Full location, policy, and operational detail are not prominent enough before the visitor is asked to act.
7. **Hero video risk:** Autoplay background video is visually attractive but can be expensive on mobile and does not appear necessary to explain the offer.

## Positioning conclusion

Customer-facing perception today: **a boutique BJJ/fitness studio with women’s programs, kids classes, beginner training, self-defense, and an adjacent Adaptive Capacity concept.**

It does not currently read as a focused women-only Ground Up community. The code and copy support several identities simultaneously:

- women-only BJJ/self-defense program;
- kids martial arts;
- general strength and conditioning;
- personal training;
- 8-week self-defense course;
- future Adaptive Capacity interest list;
- broader resilience/capability platform.

That breadth may be intentional, but it does not match the stated direction and weakens conversion.

---

# 4. Women-only experience audit

## Consistent or strong language

- Women-only language is clear on the self-defense page: “A welcoming, women-only space” and “Women-only class” (`client/src/pages/womens-self-defense.tsx:102-110`).
- The self-defense FAQ confirms women-only sessions (`womens-self-defense.tsx:335-340`).
- Personal training includes a “Women Only” benefit (`personal-training.tsx:73-80`).
- The public trial page includes “Women’s BJJ Fundamentals” and “Women’s Self-Defense” as explicit selections.
- The footer currently says “Ground Up Women’s BJJ.”

## Conflicts and ambiguity

- Pricing says training is for “women, kids, beginners, and anyone” and its FAQ says “anyone is welcome” (`pricing.tsx:74-76`, `251-255`).
- The member dashboard advertises a free community event as “open to everyone” and “No experience or registration required” (`portal/dashboard.tsx:341-360`).
- Static schedule entries use `audience: ["all"]` for beginner BJJ, strength, recovery, and open mat; open mat is explicitly tagged “Open to All” (`client/src/lib/schedule-data.ts:36-66`).
- Account signup is open to any person and does not collect program/eligibility context (`portal/login.tsx:142-218`).
- Trial leads have no women-only eligibility or program-policy field (`shared/schema.ts:242-295`).
- SEO/JSON-LD repeatedly describe “women, kids, and beginners,” not a focused women-only program (`client/index.html:11-46`).
- The application includes a kids program and minor consent flow, which may be valid but must be explicitly separated from the women-only adult core offer.

## Required business decision

Ground Up needs one explicit rule set before copy and flows can be remediated:

1. Which offerings are women-only?
2. Are kids a separate program under the same brand?
3. Are strength/recovery/open-mat sessions genuinely open to all, and if so, why and how are they described?
4. Is the public community self-defense event women-only or intentionally open?
5. Is “12-week Ground Up → Adaptive Capacity” the flagship, a later product, or only a future experiment?

Until those decisions are made, any copy fix risks moving the contradiction rather than resolving it.

---

# 5. Customer journey and CTA audit

## Implemented journey today

```text
Traffic
  → Homepage / program page / schedule
  → Multiple possible actions
  → /book lead request OR /portal/login
  → Manual staff follow-up OR authenticated Calendly embed
  → Webhook/internal booking record (configuration and integrity partly unknown)
  → Member portal, forms, membership, schedule, cancellation
```

## Journey step assessment

| Step | Status | Evidence and friction |
|---|---|---|
| Discover Ground Up | EXISTS AND WORKS | Homepage renders and communicates BJJ/self-defense/Oxnard. |
| Understand the flagship offer | EXISTS BUT WEAK | Multiple audiences and offers compete; 8-week and 12-week concepts diverge. |
| Build trust | EXISTS BUT WEAK | Coach, facility, safety, and first-class guidance help; address and policies are missing. |
| Choose next action | PARTIAL | CTAs alternate between free trial, book intro, schedule, join, and login. |
| Submit a lead | EXISTS AND WORKS, with gaps | `/book` persists a lead and creates staff notification/email attempt. |
| Receive visitor confirmation | PARTIAL | UI says staff will reach out; API says “Booking confirmed!”; no visitor confirmation email is visible. |
| Get a real appointment | PARTIAL | Authenticated Calendly path exists; public lead path does not reserve a slot. |
| Pay | PARTIAL / NOT WIRED END-TO-END | Stripe intent/webhook code exists; complete checkout and reconciliation are not demonstrated. |
| Attend first session | UNKNOWN | Instructions exist; real schedule/capacity/reminder behavior is unverified. |
| Become a member | PARTIAL | Membership records and portal status exist; billing/access provisioning are not complete. |
| Complete intake/waivers | EXISTS AND WORKS in UI | Draft/save/submit forms exist; server-side required-field enforcement is weak. |
| Continue member journey | EXISTS BUT WEAK | Static schedule and booking/cancellation exist; progress link leaves the app and no cohort model exists. |

## CTA inventory

| CTA pattern | Appears on | Destination | Assessment |
|---|---|---|---|
| Start Your Free Trial | Homepage and public pages | `/book` | Good cold-traffic destination, but “trial” can imply an immediately bookable appointment. |
| Book Free Intro | Program cards/homepage | Mixed: `/book` or `/portal/login` | Conflicting intent; public visitors should not hit an unexplained account wall. |
| Book Your Session | Program and portal surfaces | `/book`, `/portal/booking`, or login | Naming does not distinguish request from confirmed appointment. |
| Learn More | Event/cards | `/contact` or informational page | Appropriate for low-intent actions, but should not compete with the primary event. |
| Join the interest list | Adaptive Capacity | `/adaptive-capacity` form | Correct for an unconfirmed cohort. |
| Member Login | Navbar | `/portal/login` | Correct for existing members. |
| Register/Sign Up | Portal login | Signup tab | Account creation is available without a clearly defined member eligibility path. |
| Track My Progress | Member dashboard | External `1club.ai` | Breaks the member experience and introduces an external dependency. |

### Primary conversion event today

The practical primary conversion is a **trial lead submission**, but the copy and API incorrectly blur “request submitted” and “booking confirmed.” This should be renamed and measured as one truthful event such as:

> “Request a first visit” → lead received → staff confirms a specific time.

If instant scheduling is intended, the public flow should actually reserve a real slot and show the confirmed appointment. The current public flow does not do that.

---

# 6. Booking system audit

## What exists

1. Static public schedule with client-side day/filter controls.
2. Authenticated Calendly embed at `https://calendly.com/groundupbjj`.
3. Calendly signed webhook with event validation and deduplication.
4. Internal booking API with member creation/list/cancellation.
5. Stripe payment-intent creation and payment-intent webhook.
6. Staff booking list/status endpoints.

## What is not demonstrated

- Live provider configuration, event types, staff selection, reminders, and timezone mapping.
- Real capacity enforcement for “max 6.”
- Public appointment reservation from `/book`.
- Rescheduling.
- Visitor/member confirmation email.
- Cancellation/refund/payment reconciliation.
- A complete checkout UI.
- Admin schedule editing.
- A transaction or database constraint preventing two users from taking the same slot.
- Safe retry/dead-letter handling for provider webhooks.

## Verified/inferred defects

- `/book` only creates a lead; it does not create an appointment.
- Portal booking uses Calendly, while internal API booking is a separate path. The two sources of truth are not clearly unified.
- Availability checks only consider `status = 'paid'` and can miss pending bookings and partial interval overlaps (`server/storage.ts:390-401`).
- Check-then-insert booking behavior has no transaction or exclusion/capacity constraint (`server/routes.ts:301-311`, `851-856`; `shared/schema.ts:54-74`).
- Pending records can remain abandoned and do not reliably reserve a slot.
- The generic `POST /api/bookings` accepts broad insert-schema fields including client-controlled `amountCents`, `currency`, `status`, customer identity, and start/end data (`server/routes.ts:293-317`).
- Payment intent creation does not fully bind the payment amount/currency and booking state to a server-owned booking record.

## Booking readiness: FAIL

The UI is substantial, but financial integrity, capacity, source-of-truth, and provider configuration are not strong enough for production booking.

---

# 7. Lead-capture and email audit

## Lead forms

### `/book`

- Three steps: program selection, optional static class preference, and contact/experience details (`client/src/pages/book.tsx:176-205`, `264-505`).
- Captures first name, last name, email, phone, program, experience, and preferences.
- Uses client validation and posts to `/api/trial-leads`.
- The UI says the coach will reach out, which is more accurate than the API response.
- No CAPTCHA or bot challenge.
- No visible duplicate handling.
- No explicit consent checkbox on the core training/contact flows.
- No visitor confirmation email visible.
- “Max 6” is marketing copy, not enforced in this path.

### `/contact`

- Captures identity, email, phone, subject, message, and consent-related payload fields.
- Zod validation and persistence exist.
- Creates a staff notification and attempts a Resend email to staff.
- Email/notification failures are logged and swallowed so the user can still receive a success response.
- No clear consent copy, duplicate handling, CAPTCHA, response-time promise, or visitor confirmation email is visible.

### `/adaptive-capacity`

- Captures identity, email, role/company, work-life change, capability goal, AI comfort, cohort timing, and explicit interest-list consent.
- The form correctly distinguishes an interest list from training leads.
- Copy says details will be shared when confirmed.
- It is not a program enrollment, cohort registration, payment, or curriculum experience.

## Email inventory

| Email | Status |
|---|---|
| Staff alert for contact submission | Implemented as a Resend attempt; actual delivery unknown. |
| Staff alert for training lead | Implemented as a Resend attempt; actual delivery unknown. |
| Staff alert for Adaptive Capacity interest | Implemented as a Resend attempt; actual delivery unknown. |
| Visitor lead confirmation | Not found. |
| Booking confirmation | Not demonstrated. |
| Booking reminder | Not found in application code. |
| Registration/welcome | Not found. |
| Password reset | Not found. |
| Cancellation/refund | Not found. |

## Lead-capture readiness: PARTIAL

The lead path is operationally useful but should not be described as a confirmed booking, and staff should not depend on best-effort email alone. Database inbox visibility exists and is a positive fallback.

---

# 8. Authentication and member portal audit

## Authentication

### Positive findings

- Normal user passwords are bcrypt-hashed.
- `SafeUser` responses omit `passwordHash`.
- Sessions use HttpOnly cookies, Secure in production, SameSite=Lax, and 24-hour expiry.
- Role middleware returns 401/403 and is used on the modern admin routes.
- Anonymous access to `/api/portal/me` and `/api/portal/admin/stats` returned 401 in safe runtime checks.

### Gaps

- Login and signup set session fields without regenerating the session ID, creating session-fixation risk.
- No password reset, email verification, MFA, login lockout, or session revocation mechanism is visible.
- Signup has a minimum password length but no robust shared schema for email/name/phone/password quality.
- CSRF protection is implicit through SameSite behavior; there is no CSRF token or explicit Origin/Referer validation.
- Rate limits are process-local `Map` instances and do not coordinate across autoscale instances.
- In non-production or degraded production configuration, sessions can fall back to an in-memory store.

## Authorization

- Modern admin endpoints generally require admin or coach roles.
- Coach/member UI suggests assigned-member scope.
- Server routes allow coaches to read/create session notes and update belt rank/attendance for arbitrary path-supplied member IDs; no assigned-coach check is visible (`server/routes.ts:959-1031`).
- This is especially sensitive because forms and session notes can contain health, injury, emergency, minor, or training information.
- The legacy `/api/admin/login` is itself behind `requireRole("admin")`, so it is not a verified anonymous bypass. It is still unsafe as a retained design.

## Member portal value

The account has enough real value to justify an account for an existing member:

- dashboard;
- membership status;
- upcoming/past bookings;
- booking cancellation;
- required forms and submitted answers;
- static class schedule;
- staff notes/attendance are admin-side.

It does not yet provide a complete member relationship:

- no profile editing;
- no password recovery;
- no payment history or subscription management;
- no rescheduling;
- no member messaging/support;
- no in-app progress/cohort milestones;
- progress tracking leaves the app for `1club.ai`.

---

# 9. Admin and operations audit

## What an operator can do today

| Operation | Status |
|---|---|
| See KPI stats | Exists for admin. |
| Review training/adaptive/contact leads | Exists through inboxes and statuses. |
| Receive in-app staff notifications | Exists; shared queue. |
| Receive attempted email alert | Exists through Resend; delivery unknown. |
| Search/paginate members | Exists. |
| View member profile/forms/bookings/notes | Exists for admin. |
| Set role | Exists for admin. |
| Set belt rank/attendance | Exists for admin/coach; coach scope is too broad. |
| Add session notes | Exists for admin/coach; scope is too broad. |
| View/cancel bookings | Exists. |
| Create memberships | Exists. |
| Edit class schedule/capacity | Missing or not wired. |
| Manage instructors through modern UI | Limited; legacy availability API exists. |
| Manage cohorts/curriculum/milestones | Missing. |
| Process payments/refunds/failed billing | Missing or incomplete. |
| Export/retention/access audit | Not found. |
| Update public content without source edits | Missing. |
| Performance/time-series reporting | Partial; current campaign report is aggregate/in-memory. |

The old `/admin` implementation remains in source but is a dead runtime route. Its “Edit Schedule” UI action is non-wired. Keeping two admin concepts increases future authorization and maintenance risk.

---

# 10. 12-week and Adaptive Capacity audit

## 12-week journey

**Status: ABSENT as an implemented product; current marketing uses a different 8-week offer.**

Customer-facing content consistently describes an **8-week self-defense program**, two classes per week, and 16 sessions (`home.tsx:337-344`; `womens-self-defense.tsx:213-228`; `pricing.tsx:179-192`).

No implemented model or UI was found for:

- week-by-week progression;
- cohort dates or enrollment;
- milestones;
- assessment;
- graduation/certification;
- onboarding sequence;
- progress tracking;
- cohort attendance/progression.

## Adaptive Capacity

**Status: PARTIALLY REPRESENTED / INTEREST LIST ONLY.**

The page presents Adaptive Capacity as a separate Ground Up product, describes conceptual pillars, and collects a consented interest list. It does not provide confirmed dates, price, curriculum, delivery model, capacity, or participant experience.

This is appropriate if the product is genuinely not ready. It becomes misleading when the homepage places it beside active training paths without a clear “future cohort” label.

---

# 11. BJJ/self-defense, safety, and trust audit

## What is explained well

- Beginner-friendly tone and no-intimidation language.
- No sparring in the first session.
- Clothing and gear expectations.
- Small-group coaching and personal attention.
- Named coach and stated BJJ/Gracie Barra lineage.
- Women-only language on the strongest dedicated program page.
- Actual facility photographs and calm/premium visual treatment.

## What a first-time participant still needs to ask

- What is the exact street address and where do I park/enter?
- Which specific sessions are women-only?
- Are strength, open mat, recovery, and community events women-only or mixed?
- What is the age requirement for each class?
- What happens if I have a prior injury, medication, pregnancy, or mobility limitation?
- Is there an injury/medical disclaimer and what is the emergency process?
- What is the cancellation/refund policy?
- Is a waiver required before the first visit?
- What is the coach-to-student ratio in practice?
- What is the actual cost after the free first visit?
- Is the 8-week program the main offer or is the 12-week journey the main offer?

## Trust gaps

- Only “Oxnard, CA” is clearly exposed; no complete public address/map is visible.
- Testimonials are initials-only and lack independently verifiable names/context.
- No public Terms page, refund/cancellation policy, medical/injury disclaimer, or pre-booking waiver is linked.
- The privacy page is future-dated “August 24, 2026,” which can undermine confidence.
- Coach/configuration identity drifts between Raymi Gonzalez and Sofia Martinez.
- Business hours and timezone sources conflict.
- “Open to everyone” and “women-only” language is unresolved.

No credentials were invented in this report; the above reflects only what the repository claims and what remains unverified.

---

# 12. Design, mobile, accessibility, and performance audit

## Design

**Assessment: Cohesive but overextended.**

The dark navy/black system with cyan, purple, and coral accents, rounded cards, actual imagery, and consistent typography feels intentional and more premium than a default gym template. The visual language supports confidence and energy.

Risks:

- too many uppercase display headings and neon accents;
- long pages and repeated card patterns;
- motion, grain, gradient, and autoplay video can create an AI/template impression when combined;
- dense information hierarchy makes the central offer harder to find;
- gray secondary text may be low contrast in places;
- legacy and modern portal/admin surfaces are not one coherent product.

## Mobile

A direct screenshot at 375/390/412 px was not available through the current preview tool, so device-specific defects are classified as source-based risks rather than visually verified defects.

Positive source signals:

- mobile navigation exists;
- responsive grid breakpoints exist;
- horizontal schedule controls are intentionally supported;
- portal uses mobile-first cards;
- reduced-motion CSS is present;
- root CSS hides horizontal overflow.

Mobile risks to verify before traffic:

- the hero is viewport-height and includes background video;
- large uppercase headings can consume most of the first screen;
- the analytics consent modal covers a large portion of the viewport;
- multi-step booking cards and form fields need a real 375 px pass;
- schedule tabs and portal tables need touch/overflow testing;
- fixed/sticky navigation, modals, and long form submission states need device testing;
- `overflow-x: hidden` can conceal layout defects instead of fixing them.

## Accessibility

**Readiness: PARTIAL.**

Positive:

- semantic form controls and visible labels appear in most flows;
- many buttons use actual button/link components;
- base focus-ring styles and reduced-motion support exist;
- homepage FAQ includes `aria-expanded`/`aria-controls` treatment.

Gaps:

- pricing, self-defense, and kids FAQ accordions do not consistently match the homepage ARIA treatment;
- portal menu toggle lacks a clear accessible label/state;
- some icon-only controls need explicit accessible names;
- gray secondary text may not meet contrast requirements;
- some labels are not clearly associated with inputs through `htmlFor`;
- login preview produced a browser warning for missing `autocomplete="current-password"`;
- modal focus trapping/return focus and screen-reader announcement were not verified.

## Performance

Verified production build output:

- JavaScript bundle: approximately **852 KB minified** / **243 KB gzip**;
- CSS bundle: approximately **93 KB** / **16 KB gzip**;
- several image assets are **1.3–1.7 MB** each;
- Vite emitted a chunk-size warning for chunks over 500 KB;
- 2,433 modules were transformed.

Most important performance issues:

1. no route-level code splitting is visible;
2. hero autoplay video is loaded on the homepage;
3. several large PNG assets are used;
4. the long homepage likely loads more media/content than a first visit requires;
5. campaign reporting and booking reads load unbounded data in memory as the system grows.

The old Browserslist database warning is maintenance noise, not the primary launch blocker.

---

# 13. SEO/social and privacy/legal audit

## SEO/social

### Present

- title, description, keywords, robots, canonical, Open Graph, Twitter card, geographic metadata;
- JSON-LD `SportsActivityLocation`;
- `robots.txt` and `sitemap.xml`, both verified 200 locally;
- Oxnard and BJJ/self-defense keywords;
- social profile links.

### Problems

- Metadata and JSON-LD frame the business as serving “women, kids, and beginners,” not a clear women-only core.
- `client/src/components/seo.tsx` defaults to `/og-image.jpg`, while the visible public asset is `og-image.svg`; dynamic-route previews may request a missing image.
- JSON-LD includes only city/state, not a complete address.
- No richer FAQ/service schema is visible.
- Naming drifts between “Ground Up BJJ,” “Ground Up Jiu-Jitsu & Fitness,” and “Ground Up Women’s BJJ.”
- Hours and timezone conflict with `site.config.ts`.
- The public message mixes women-only, general, kids, open-to-all, and future-product keywords.

## Privacy/legal surfaces

### Present

- Privacy Policy page covering forms, analytics, Meta Instant Forms, providers, minors, and California contact (`client/src/pages/privacy.tsx`).
- Analytics consent UI; user can decline and still use the site.
- Intake/waiver, media release, gym rules, and minor consent forms exist in seeded form definitions.

### Missing or weak

- Terms of service.
- Public refund/cancellation policy.
- Medical/injury disclaimer.
- Clearly linked liability waiver before booking.
- Photo/media consent explanation before the relevant action.
- Explicit training/contact email consent language.
- SMS consent/disclosure (if SMS is added later).
- Retention/deletion/export process.
- Data-minimization and role/access policy.
- Privacy page date is future-dated and should be reviewed.

This section identifies operational surfaces for professional review; it is not legal advice.

---

# 14. Security audit

## CRITICAL

### Client-controlled booking financial/state fields

`POST /api/bookings` uses a broad insert shape and persists client-provided `amountCents`, `currency`, `status`, customer information, and start/end time. A logged-in caller could attempt to submit a paid booking, alter a price/status, or create a booking outside approved schedule rules.

**Evidence:** `server/routes.ts:293-317`; `shared/schema.ts` booking insert schema.  
**Impact:** financial loss, unauthorized bookings, inaccurate records, and trust damage.  
**Required outcome:** server-owned session type → price/currency/duration/status mapping, immutable payment state transitions, validated time windows, and a single safe creation path.

## HIGH

### Coach object-level authorization

Coach routes accept arbitrary member IDs for sensitive notes, belt rank, and attendance operations without visibly checking assignment.

**Evidence:** `server/routes.ts:959-1031`; documented assigned-member model in `replit.md`.  
**Impact:** cross-member privacy exposure and unauthorized data modification.

### Booking race/overlap/capacity integrity

Availability checks consider only paid records and do not atomically reserve slots. There is no database exclusion/capacity constraint.

**Evidence:** `server/storage.ts:390-401`; `server/routes.ts:301-311`, `851-856`.  
**Impact:** double-booking, capacity overrun, abandoned pending records.

### Webhook event loss after early claim

Stripe and Calendly event IDs are claimed before all business side effects complete. A later database/provider failure can cause a legitimate retry to be treated as already processed.

**Evidence:** `server/routes.ts:383-395`, `631-648`; `server/storage.ts:642-649`.  
**Impact:** missing bookings/payment state and silent operational failure.

### Legacy plaintext/default admin credential handling

`admin_users` stores a plaintext password, the legacy route compares it directly, and the legacy client initializes a default email/password.

**Evidence:** `shared/schema.ts:76-87`; `server/routes.ts:1100-1111`; `client/src/pages/admin.tsx:22-36`, `95-98`.  
**Impact:** credential disclosure and unsafe historical access pattern. The old endpoint is currently behind an admin role check, so an anonymous bypass was not verified.

### Session fixation and incomplete account protections

Login/signup set session fields without regenerating the session ID. Reset, email verification, MFA, lockout, and revocation are absent.

**Evidence:** `server/routes.ts:658-700`.  
**Impact:** account takeover resilience is weaker than a production member portal should be.

## MEDIUM

- CSRF is not explicit; cookie SameSite=Lax is only a partial mitigation.
- In-memory rate limits are not shared across autoscale instances.
- Dynamic form answers and admin/member data have weak server-side validation.
- Analytics accepts arbitrary JSON properties without server-side PII scrubbing or retention controls.
- Sensitive health, injury, medication, DOB, emergency, minor, signature, admin-note, and session-note data is stored without visible field-level encryption, access audit, retention, export, or deletion workflow.
- Booking and campaign-report queries are unbounded; report aggregation occurs in memory.
- CSP has `unsafe-inline` and broad third-party allowances; baseline headers are otherwise a positive.
- Raw error objects are logged in several handlers; log redaction/retention is unknown.

## Dependency observation

`npm audit --omit=dev --audit-level=high` reported **16 vulnerabilities: 2 low, 3 moderate, and 11 high** in the current dependency tree. Notable findings included Drizzle ORM, Express dependency chain, `ws`, `postcss`, `nanoid`, `minimatch`, `picomatch`, and others. This was an audit-only check; no package upgrades were performed because a forced Drizzle upgrade was reported as breaking and the audit specification forbids remediation in this pass.

---

# 15. Production/deployment and testing audit

## Runtime checks performed

| Check | Result |
|---|---|
| `GET /` | 200; homepage rendered in preview. |
| `GET /robots.txt` | 200. |
| `GET /sitemap.xml` | 200. |
| `GET /api/portal/me` | 401 when anonymous, expected. |
| `GET /api/portal/admin/stats` | 401 when anonymous, expected. |
| `GET /api/trainers` | 200. |
| `GET /admin` | 404; legacy client route is not served in the running app. |
| `GET /portal/schedule` | 200 without auth; source shows no component-level auth check. |
| Browser console | Expected anonymous 401 plus missing password autocomplete warning; no fatal frontend error observed. |

No write endpoint was exercised with production-like data. No external appointment, transaction, or email was created/sent.

## Build and tests

- `npm test`: **7 passed, 0 failed**.
- `npm run check`: passed.
- `npm run build`: passed.
- Existing tests cover signature helpers, role middleware, ownership helper, local rate limits, scanner paths, and baseline headers.
- There are no meaningful route/integration, database, browser/E2E, payment, booking, webhook retry, authorization-matrix, migration, coverage-threshold, or dependency-audit tests in the project scripts.

Passing seven security helper tests is valuable, but it does not demonstrate that the real booking, lead, payment, or admin flows are safe.

## Deployment observations

- Replit deployment is configured as autoscale with build/start scripts and port 5000.
- Deployment logs repeatedly show health checks to `/` returning connection refused/500 during startup, followed later by the server listening on port 5000. This may be an expected warm-up race, but it is fragile and there is no dedicated readiness endpoint.
- No health/readiness/liveness endpoint, graceful shutdown/pool close, structured request IDs, metrics, alerting, backup/restore runbook, DR plan, incident runbook, or webhook reconciliation job was found.
- Startup seed operations are asynchronous and log failures without failing readiness.
- Actual production DB URL selection, session store behavior, proxy/HTTPS topology, provider credentials, domain wiring, backups, and monitoring remain unknown.

---

# 16. Business operations audit

## Can Ground Up operate using the system today?

### Yes, with substantial manual work

- receive and review leads through database-backed admin inboxes;
- receive attempted staff email alerts;
- contact prospects manually;
- review members and forms;
- add notes, attendance, belt rank, and memberships;
- inspect/cancel some bookings;
- show a static schedule;
- manually reconcile whether a lead became a real appointment.

### Not reliably or not yet

- guarantee a slot is available;
- prevent duplicate/racing bookings;
- reconcile payment to the intended booking securely;
- manage refunds or failed recurring payment;
- maintain the live class schedule/capacity without source/database work;
- run a 12-week cohort;
- track member milestones or progression;
- message members from the portal;
- manage content and policy pages through admin;
- answer campaign performance over time;
- prove that provider email/reminder/webhook operations work in production.

## Manual work still required

1. Read staff inbox and follow up with every lead.
2. Confirm an actual time after `/book` submission.
3. Reconcile Calendly, internal booking, and payment records.
4. Maintain schedule and capacity outside the public UI.
5. Handle cancellations, reschedules, refunds, and reminders.
6. Resolve privacy/access requests manually.
7. Update offer copy in source code.
8. Track cohort/progress outside the application.

---

# 17. Conversion funnel verdict

## Current funnel

```text
Traffic
  → Homepage or program page
  → Choose among several programs and CTAs
  → /book lead request OR /portal/login
  → Staff follow-up OR authenticated Calendly booking
  → Manual/provider booking confirmation
  → Member account, forms, schedule, and cancellation
  → No implemented cohort/progress journey
```

## Leaks

- **Primary leak:** positioning ambiguity. A visitor cannot confidently determine whether Ground Up is a women-only program, a general gym, a kids academy, a self-defense course, a fitness studio, or a future resilience program.
- **Secondary leak:** CTA fragmentation. Similar “book” language routes to different experiences, including a login wall.
- **Trust leak:** incomplete address, policy, injury, refund, and operational information for a physical-contact women-focused program.
- **UX leak:** the lead form is not a booking, but API language says “Booking confirmed!”
- **Technical leak:** booking/payment/capacity integrity and webhook retry behavior are not safe for production.

## Single biggest reason traffic may fail to convert

**The website does not present one unmistakable, trustworthy first step for one clearly defined audience.** The visual polish cannot compensate for the unresolved women-only/mixed-audience and 8-week/12-week product ambiguity.

---

# 18. What should not be built yet

Until the core offer, first-visit flow, and operational integrity work, the following would distract from launch:

- mobile app;
- complex gamification or belt/progress rewards;
- AI coaching;
- elaborate LMS/curriculum platform;
- sophisticated Adaptive Capacity assessments;
- advanced community/social features;
- complicated membership tiers;
- full cohort graduation/certification system;
- broad content management platform;
- additional payment products before the current booking/payment source of truth is secured.

Adaptive Capacity should remain a clearly labeled interest list until the cohort is actually defined.

---

# 19. Prioritized remediation backlog

Effort is relative engineering effort. “Safe independently” means the work can be made without first changing the core business decision; “No” means it depends on a decision or coordinated migration.

## P0 — Must fix before sending traffic

### P0.1 Decide and enforce the audience/product rules

- **Problem:** Women-only, kids, “anyone,” open-to-all, 8-week, and 12-week language conflict.
- **Impact:** trust loss, wrong leads, unclear eligibility, and poor conversion.
- **Recommended outcome:** publish one canonical audience/offer map; label any separate kids/open event clearly; remove contradictory language across site, schedule, forms, SEO, portal, and emails.
- **Effort:** M.
- **Dependencies:** business owner decision on women-only scope and flagship offer.
- **Safe independently:** No.

### P0.2 Replace the public funnel with one truthful first-visit action

- **Problem:** `/book` creates a lead, while the API says “Booking confirmed”; other CTAs send cold visitors to login.
- **Impact:** false expectations and drop-off.
- **Recommended outcome:** choose “request a first visit” or real instant booking; use one destination and truthful success state; reserve login for existing members.
- **Effort:** M.
- **Dependencies:** canonical offer and booking source of truth.
- **Safe independently:** No.

### P0.3 Lock down booking and payment invariants

- **Problem:** client controls booking price/status/time fields; payment intent and booking are not fully bound.
- **Impact:** financial and schedule tampering.
- **Recommended outcome:** accept only a server-owned DTO; derive price/currency/duration/status from approved session types; enforce allowed time windows, ownership, and immutable payment transitions.
- **Effort:** M.
- **Dependencies:** chosen booking/payment architecture.
- **Safe independently:** Yes, after API contract review.

### P0.4 Fix coach/member object authorization

- **Problem:** coach can use arbitrary member IDs for notes, attendance, and belt updates.
- **Impact:** sensitive member privacy and integrity failure.
- **Recommended outcome:** enforce assigned-coach scope server-side for every read/write; test admin, assigned coach, unassigned coach, member, and anonymous matrices.
- **Effort:** S.
- **Dependencies:** final staff permission model.
- **Safe independently:** Yes.

### P0.5 Make webhooks retry-safe

- **Problem:** event IDs are claimed before side effects finish.
- **Impact:** valid Stripe/Calendly events can be lost permanently.
- **Recommended outcome:** durable pending/processed/failed state, transactional side effects where possible, safe retries, reconciliation/manual replay, and alerting.
- **Effort:** M/L.
- **Dependencies:** provider event contracts and payment/booking source of truth.
- **Safe independently:** Yes, with provider test fixtures.

### P0.6 Remove legacy credential exposure

- **Problem:** plaintext legacy admin password field and default credentials shipped in client code.
- **Impact:** credential disclosure and unsafe auth design.
- **Recommended outcome:** disable/remove legacy route and UI through a controlled migration, rotate any affected credentials, and ensure only the modern role-protected portal remains.
- **Effort:** S/M.
- **Dependencies:** confirm modern admin coverage and credential rotation plan.
- **Safe independently:** No, because access continuity must be verified.

### P0.7 Make booking capacity atomic

- **Problem:** paid-only overlap checks and check-then-insert races do not guarantee capacity.
- **Impact:** double bookings and unsafe customer experience.
- **Recommended outcome:** one authoritative schedule, transactional reservation state, overlap/capacity enforcement, expiration for pending holds, and database constraints where appropriate.
- **Effort:** L.
- **Dependencies:** Calendly vs internal scheduler decision.
- **Safe independently:** No.

## P1 — Must fix before serious launch

### P1.1 Publish trust and operational pages

- **Problem:** no complete address, Terms, refund/cancellation policy, medical/injury guidance, or clearly linked waiver.
- **Impact:** visitors cannot make an informed decision and staff must answer preventable questions.
- **Recommended outcome:** publish business-approved operational copy and link it at contact, booking, footer, and portal entry points.
- **Effort:** S/M.
- **Dependencies:** business/legal review.
- **Safe independently:** No.

### P1.2 Add visitor confirmation and reliable staff alerting

- **Problem:** staff emails are best-effort; visitors do not receive a visible confirmation email.
- **Impact:** missed leads and uncertainty after submission.
- **Recommended outcome:** durable notification status, retry/alert path, accurate confirmation email, and clear response-time expectation.
- **Effort:** M.
- **Dependencies:** verified Resend production configuration and approved copy.
- **Safe independently:** Yes.

### P1.3 Add explicit account protections

- **Problem:** no session regeneration, reset, verification, lockout, MFA, or revocation.
- **Impact:** weaker account security and poor member recovery experience.
- **Recommended outcome:** regenerate on login/signup, implement reset and verification, add abuse controls, and document session lifecycle.
- **Effort:** M/L.
- **Dependencies:** email delivery and auth policy.
- **Safe independently:** Yes.

### P1.4 Choose and unify schedule source of truth

- **Problem:** static schedule, Calendly, internal bookings, trainer JSON availability, and admin legacy endpoints coexist.
- **Impact:** stale availability, operational confusion, and inconsistent customer promises.
- **Recommended outcome:** choose one schedule/booking authority and make all public, portal, admin, payment, and webhook paths reconcile to it.
- **Effort:** L.
- **Dependencies:** business booking decision.
- **Safe independently:** No.

### P1.5 Add end-to-end coverage for critical flows

- **Problem:** seven helper tests do not cover actual routes or browser journeys.
- **Impact:** regressions in auth, booking, leads, webhooks, and admin permissions can ship unnoticed.
- **Recommended outcome:** integration and browser tests for anonymous/member/coach/admin matrices, lead form, booking/cancellation, payment fixture, webhook retry, and form validation.
- **Effort:** L.
- **Dependencies:** stable contracts and safe test fixtures.
- **Safe independently:** Yes.

### P1.6 Review and remediate dependency vulnerabilities

- **Problem:** audit reports 16 vulnerabilities, including 11 high.
- **Impact:** known dependency risk, including possible DoS/security issues.
- **Recommended outcome:** triage direct/transitive reachability, upgrade in small tested groups, and do not force breaking ORM changes without compatibility testing.
- **Effort:** M/L.
- **Dependencies:** lockfile/change-control and regression tests.
- **Safe independently:** Yes.

## P2 — Important improvement

- Add server-side validation and size limits for all dynamic form fields, admin notes, membership data, attendance, dates, and trainer availability.
- Add explicit CSRF/Origin protection for cookie-authenticated mutations.
- Replace process-local rate limiting with a shared production-safe mechanism or document single-instance constraints.
- Add analytics retention, PII scrubbing, and date-range/time-series campaign reporting.
- Replace unbounded booking/report reads with database filtering, pagination, and aggregates.
- Align `site.config.ts`, seed content, page metadata, business hours, phone, coach, timezone, and prices.
- Fix OG image path and add verified local service/FAQ schema.
- Complete labels, focus behavior, modal semantics, accordions, contrast, and autocomplete attributes.
- Optimize images, defer/lazy-load non-critical media, and split frontend bundles by route.
- Add admin schedule/capacity/content tools once the business model is stable.

## P3 — Later enhancement

- In-app progress and cohort milestones after the 12-week curriculum is real.
- Member messaging/support.
- Payment history, refunds, recurring membership management.
- Automated reminders and cancellation/reschedule self-service.
- Content management and richer reporting.
- Reconsider external `1club.ai` only after the core member experience is stable.

---

# 20. Keep / Fix / Remove / Build matrix

## KEEP

- Dark premium visual foundation and recognizable cyan/purple/coral system.
- Actual facility and training imagery.
- Named coach and transparent beginner guidance.
- Women’s self-defense page’s clear women-only language.
- Small-group and no-first-session-sparring reassurance.
- Public lead persistence and database-backed staff inbox.
- Adaptive Capacity interest-list separation and explicit consent.
- Member forms with drafts, submissions, and required-form visibility.
- Admin member search, forms, notes, attendance, and lead inbox baseline.
- Bcrypt password hashing, SafeUser redaction, generic production errors, security headers.
- Stripe raw-body signature verification and Calendly HMAC/timing-safe validation.
- Webhook uniqueness/idempotency foundation.
- Passing TypeScript, build, and seven security-helper tests.

## FIX

- Canonical product/audience message.
- CTA destinations and “request vs confirmed” status.
- Public booking/capacity/payment source of truth.
- Coach object-level authorization.
- Webhook retry/reconciliation lifecycle.
- Legacy auth/admin credential handling.
- Session lifecycle and account recovery.
- Static schedule/admin editing mismatch.
- Missing trust/legal surfaces.
- Email confirmation and alert reliability.
- Dynamic form/admin validation.
- Analytics privacy and reporting time range.
- Configuration drift for name, coach, timezone, prices, hours, and metadata.
- Bundle/media performance and accessibility gaps.

## REMOVE OR RETIRE

- Legacy `/admin` UI and legacy credential route after access continuity is verified.
- Shipped default admin credential values.
- “Anyone,” “open to everyone,” and “open to all” language if the final business rule is women-only.
- Unresolved 8-week claims if the actual flagship is the 12-week journey, or vice versa.
- Dead/non-wired “Edit Schedule” actions.
- Unnecessary duplicate booking paths after source-of-truth decision.
- External progress dependency if it cannot support the intended member experience.

## BUILD

- One business-approved first-visit funnel.
- Real schedule/capacity reservation model.
- Safe payment and webhook reconciliation.
- Explicit auth recovery and permission matrix.
- Visitor/staff email lifecycle.
- Trust, policy, and safety surfaces.
- Cohort/curriculum/progress only after the 12-week product is finalized.
- Production health, logging, alerting, backup, and recovery operations.

---

# 21. Final executive summary

## What Ground Up is today

A React/Vite frontend and Express/Drizzle/PostgreSQL backend for a boutique BJJ/fitness concept. It includes public marketing pages, a static schedule, a three-step lead funnel, custom member authentication, dynamic intake/waiver forms, an authenticated Calendly booking embed, internal booking/payment APIs, a modern admin/coach portal, staff notifications, Resend email attempts, analytics, and several security helpers.

## What Ground Up appears to the customer to be

A polished but broad boutique BJJ and fitness studio for women, kids, beginners, and possibly anyone, with women’s self-defense, BJJ, strength, personal training, and a future Adaptive Capacity concept. It does not yet appear to be one focused women-only Ground Up transformation journey.

## What is working

- Public site starts and renders.
- Static SEO files respond.
- Anonymous protected API checks return 401.
- Public trainer read works.
- Lead/contact persistence and admin notifications exist in code.
- Member forms, dashboard, booking/cancellation, and admin surfaces are substantially built.
- Build, TypeScript check, and 7/7 existing tests pass.
- Baseline hashing, cookie, headers, signature, and generic error protections are present.

## What is broken

- `/admin` is a dead runtime route despite legacy source.
- Public booking language does not match actual lead behavior.
- Generic internal booking accepts client-controlled financial/status fields.
- Capacity/overlap behavior is not safe for production.
- Coach access is broader than the assigned-member model.
- Webhook claim-before-side-effect can lose valid events.
- Legacy admin credential handling is unsafe.
- Some configuration sources disagree on coach, timezone, offer, and pricing.
- Production startup health checks are noisy/fragile.

## What is missing

- One canonical women-only/product definition.
- Implemented 12-week cohort/curriculum/progress model.
- Complete payment/subscription/refund lifecycle.
- Reliable visitor and booking confirmation emails.
- Password reset/email verification/MFA/session revocation.
- Real schedule/capacity administration.
- Terms, refund, medical/injury, and clearly linked waiver surfaces.
- Privacy retention/export/access controls.
- E2E/integration coverage and production observability.

## Biggest business risk

Sending traffic to a site that cannot clearly tell a woman in Oxnard which program she is joining or whether the offer is actually for her.

## Biggest UX risk

Fragmented CTAs that alternate between a lead form, a login wall, an external scheduler, and an interest list while using similar “book/join/start” language.

## Biggest technical risk

Booking/payment integrity combined with weak webhook retry semantics can create incorrect bookings, financial state, or missing appointments.

## Biggest trust risk

Women-only claims, “open to everyone” language, incomplete location/policy information, and coach/configuration drift make the customer verify basic facts manually before feeling safe enough to attend.

## Fastest path to launch

1. Decide the audience and flagship offer.
2. Rewrite the public journey around one truthful first-visit action.
3. Publish address, expectations, safety, waiver, cancellation/refund, medical, and privacy surfaces.
4. Secure booking/payment/capacity/webhook invariants.
5. Fix coach authorization and retire legacy credential handling.
6. Verify Resend/Stripe/Calendly in safe test environments.
7. Add critical-flow integration/E2E tests and production health/alerting.

## Recommended next development phase

**Core launch readiness:** positioning consolidation, first-visit funnel, booking/payment integrity, staff operations, and trust/legal surfaces. Do not begin the mobile app, AI coaching, advanced community, or elaborate cohort platform before this phase is complete.

## Final state

**READY TO REMEDIATE — with business/positioning decisions required first.**
