# GROUND UP 2026 FULL WEBSITE + PLATFORM AUDIT

**Audit date:** September 1, 2026  
**Scope:** Current repository, current development workflow, and the actually published site at `https://www.groundupbjj.com`.  
**Method:** Read-only audit. No pricing, schedules, services, booking logic, member data, secrets, payments, production emails, external appointments, or deployment settings were changed.

## Evidence standard

- **Verified:** observed in source, a safe request, the running workflow, a screenshot, or a passing command.
- **Inferred:** strongly indicated by source or behavior but not independently exercised end to end.
- **Unknown:** requires a provider dashboard, production account, real inbox, or a controlled test appointment.

## Important source-versus-production finding

The workspace and the published site are not the same release:

- The workspace contains the Google Calendar-backed class system and currently renders development test occurrences such as `ADULT JIU-JITSU - BOOKING READINESS TEST SERIES`.
- The published site renders the older static/legacy experience. Its `/api/classes` endpoint returns **404**, while the workspace registers that endpoint.
- Therefore, the Google Calendar class-booking implementation is **not live in production**, and the development test occurrences must not be treated as production availability.
- The site is published and publicly visible, but that does not mean the current booking architecture is production-cut over.

---

# A. Executive Verdict

## Overall state: NOT READY

Ground Up has a polished, distinctive visual system, real public routes, a member portal, lead persistence, staff notifications, signed webhook helpers, and a new Google Calendar booking architecture in the workspace. The current public experience still presents an undecided product and the published deployment is behind the workspace.

The primary readiness blockers are:

1. **Production drift:** the published site does not contain the current `/api/classes` implementation.
2. **Security and integrity:** legacy booking/payment/webhook paths and broad coach access still require hardening.
3. **Positioning:** the intended identity is a women-only training center, but public copy repeatedly says “women, kids, and beginners,” “anyone is welcome,” “adults,” and uses generic children’s-program language.
4. **Acquisition friction:** several prominent trial CTAs send cold visitors to `/portal/login`, requiring account creation or login before a first-visit request.
5. **Booking uncertainty:** the new Google Calendar flow is not validated with representative production events, cancellations, recurrence overrides, concurrency, waitlists, and real email delivery.
6. **Operational inconsistency:** source contains old timezone, coach, age, pricing, feature-flag, Calendly, and personal-booking configuration alongside the newer class system.

No redesign or implementation phase should begin until the P0 security/integrity and production-release questions are closed.

## High-level score

| Area | Score | Assessment |
|---|---:|---|
| Women-only clarity | 4/10 | Strong hints, but explicit language is inconsistent and some copy says anyone is welcome. |
| Buyer clarity | 6/10 | Adult women, girls, beginners, private clients, and Adaptive Capacity all compete for attention. |
| Brand differentiation | 7/10 | Strong visual identity and resilience/capability theme; product identity is not yet singular. |
| Beginner reassurance | 8/10 | No experience, safe, small-group, and first-class explanations are present. |
| Girls / mother-daughter clarity | 3/10 | Girls are not clearly named as the intended youth audience; mother-daughter path is absent. |
| Spanish readiness | 1/10 | The experience is English-only; no translated route, booking, form, email, or confirmation path was found. |
| Conversion path | 4/10 | Many CTAs exist, but destinations and login requirements conflict. |
| Booking readiness | 3/10 | Workspace architecture is promising; production is old and full validation is incomplete. |
| Trust | 5/10 | Coach, photos, safety FAQ, contact details, and beginner reassurance help; address, proof, reviews, and policies are thin. |
| Mobile | 6/10 | Responsive source patterns and a mobile menu exist; a real-device pass is still required. |
| SEO | 6/10 | Titles, descriptions, sitemap, robots, canonicals, OG, and noscript content exist; local schema and consistency need work. |
| Analytics | 5/10 | Consent-aware first-party events, UTMs, and Meta Pixel exist; GA4/CAPI and complete funnel attribution do not. |
| Accessibility | 6/10 | Labels, keyboard-oriented components, and reduced-motion support exist; contrast, focus, dialog, and dynamic-state QA remain. |
| Security | 4/10 | Good baseline headers, hashing, rate limits, role checks, and signatures; authorization, CSRF, replay side effects, and legacy paths remain. |
| Backend architecture | 6/10 | Clear Express/Drizzle separation and additive class schema; duplicate booking systems and configuration drift remain. |
| Maintainability | 5/10 | TypeScript and focused modules are good; large client bundle, stale config, and parallel legacy systems increase risk. |

---

# B. Current Architecture

## Stack

| Layer | Current implementation |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, Tailwind/shadcn-Radix, Framer Motion, TanStack Query, React Hook Form/Zod. |
| Backend | Express 4 with TypeScript, one server serving APIs and the built client. |
| Database | PostgreSQL through Drizzle ORM/Neon; additive class-booking tables are in the workspace schema. |
| Sessions | `express-session`; PostgreSQL-backed in production when a database URL is available, in-memory fallback otherwise. |
| Authentication | Custom email/password plus bcrypt and cookie sessions. The implemented portal is not Replit Auth. |
| Email | Resend adapter and lifecycle email functions. Connector is installed/configured; actual delivery was not sent during this audit. |
| Payments | Stripe payment intents and webhook handler remain in the legacy path. No production charge was created. |
| Calendar | Calendly remains as a transition/private-session webhook. New class scheduling is intended to be server-side Google Calendar read/sync plus internal reservations. |
| Analytics | Consent-gated first-party events, UTM/session attribution, and Meta Pixel. No GA4/GTM/CAPI implementation was found. |
| Deployment | Published autoscale deployment at `https://www.groundupbjj.com`; workspace workflow is `npm run dev` on port 5000. |

## Intended data ownership

The new class architecture correctly separates:

- Google Calendar: schedule, recurrence, overrides, cancellations, occurrence source.
- Ground Up database: reservations, capacity, waitlists, eligibility, attendance, cancellations, history, and audit events.
- Calendly: transition/private sessions only.

This ownership model is not yet the production truth because the current deployment is behind the workspace and validation is incomplete.

## Configuration drift

`site.config.ts` still contains legacy values that conflict with current UI and architecture:

- `America/New_York` while the new class routes explicitly expose `America/Los_Angeles`.
- A legacy `headInstructor` value of Sofia Martinez while public pages identify Raymi Gonzalez.
- `groupClasses: false` while group class routes and UI exist.
- Legacy PT60 and UNLIMITED pricing values despite the current public free-intro funnel.
- `calendarIntegration: true` and `stripePayments: true` describe capabilities but not verified production configuration.

These values should be treated as stale until reconciled, not as business truth.

---

# C. Public Positioning Today

A new visitor currently sees Ground Up as a boutique BJJ/self-defense and fitness studio in Oxnard for “women, kids & beginners,” with:

- women’s BJJ fundamentals;
- an 8-week women’s self-defense program;
- kids jiu-jitsu;
- strength and conditioning;
- personal training;
- a separate Adaptive Capacity learning path.

The homepage is visually confident and clearly beginner-friendly. It communicates “No intimidation. Ever.”, personal coaching, small groups, confidence, self-defense, and resilience. The current dominant promise is closer to **inclusive beginner BJJ and fitness with a women’s focus** than the required **women-only training center, with girls/female youth and mother-daughter participation clearly defined**.

The production screenshot confirms this broad framing: the hero says “FOR WOMEN, KIDS & BEGINNERS,” not “women-only,” and the navigation has no explicit women-only label.

---

# D. Intended Positioning Gap

The stated business truth is:

> Ground Up is a women-only training center in Oxnard, California.

The current public experience must eventually make all of the following unambiguous:

- women-only adult training;
- girls/female youth rather than a generic mixed-gender kids academy;
- mother + daughter as the family relationship, if offered;
- BJJ, practical self-defense, strength, movement, capability, learning, and connection;
- beginner-friendly and non-intimidating;
- no requirement to already be athletic;
- no fight-gym atmosphere;
- one clear next step for a first visit.

The largest gap is not a missing slogan. It is a rule that is absent from the navigation, repeated service descriptions, schedule labels, booking eligibility, metadata, and youth path.

---

# E. Women-Only Messaging Audit

## Clear or helpful

- Homepage hero: “for women, kids & beginners.”
- Women’s Self-Defense page: “Women-only class.”
- Pricing page: “women-only environment — safe, supportive, judgment-free.”
- Login page: “Women’s Training Center.”
- Women’s program descriptions repeatedly name women and women-only environments.
- Imagery is predominantly women training together.

## Ambiguous or contradictory

| Location | Current wording/behavior | Why it matters |
|---|---|---|
| Homepage hero and metadata | “women, kids, and beginners”; “anyone is welcome” in FAQ | A visitor can reasonably infer men may enroll. |
| Homepage mission | “human resilience and capability platform” | Differentiates the philosophy but dilutes the first-visit training offer. |
| Homepage program grid | “Kids Jiu-Jitsu,” “Personal Training,” “Strength & Conditioning” | These do not state women-only or female-youth eligibility. |
| Pricing metadata and page | “women’s, kids & adult classes”; strength “open to all” | “Open to all” directly conflicts with women-only positioning. |
| Schedule metadata | “women’s, kids & adult classes” | “Adult” without gender qualification implies mixed adult enrollment. |
| `PAGE_CONTENT` noscript copy | Lists “women, kids, and adults” | Search/crawler-visible fallback is less specific than the intended strategy. |
| Contact page | “Book your free trial class” without women-only qualification | Conversion action is not self-filtering. |
| Login | “Women’s Training Center” | Helpful, but encountered after some cold visitors are already sent to login. |
| Footer | “Ground Up Women’s BJJ” | Stronger than the header, but inconsistent with the broad public language. |
| Nav | “Training,” “Programs,” “Schedule” | No explicit women-only or girls/female-youth route. |
| Social metadata | Women’s BJJ appears among generic BJJ/kids terms | Search and ad landing context can still look mixed. |

## Where a visitor could believe men or boys can enroll

The reasonable ambiguity comes from “anyone is welcome,” “adults,” “open to all,” generic “kids,” and absence of a women-only label above the fold and in the main navigation. The site does not explicitly offer boys’ classes, but it also does not consistently exclude them. That is enough to create avoidable questions and mismatched leads.

---

# F. Girls / Mother-Daughter Audit

## Current state

- The workspace has a `/kids` page and a class type concept for youth.
- Public copy uses ages 4–14 in several places; the legacy `PAGE_CONTENT` says ages 6–14; the pricing page says ages 4 and up and “4–7 and 8+.”
- The current copy says “kids,” “children,” “parents,” and “anti-bullying,” but does not consistently say girls or female youth.
- No clear mother + daughter program, landing page, schedule label, or combined booking flow was found.
- No explicit parental-consent or guardian workflow is visible in the first-visit class booking form.
- The privacy policy acknowledges child/minor information and says a parent/guardian should submit it, but operational consent is not demonstrated in booking.

## Gap

The intended audience is girls/female youth, including mothers and daughters—not a mixed-gender kids academy. The current public language would attract parents of boys and make the business explain eligibility manually.

Do not infer or invent an age range beyond the conflicting source values. The first required decision is the authoritative girls/youth age policy, followed by schedule, guardian, and booking rules.

---

# G. English / Spanish Readiness

## Current state: English-only

Repository search found no Spanish pages, locale switcher, translated strings, `es-MX`/`es-US` handling, bilingual form labels, Spanish confirmation states, or Spanish email templates.

A woman clicking Spanish advertising would land in:

- English navigation and page copy;
- English-only `/book` or `/portal/login`;
- English-only validation and error messages;
- English-only confirmation and email content;
- no language continuity parameter or localized route.

This is a major acquisition mismatch for Spanish-language campaigns. The future architecture should define locale-aware routes or a controlled bilingual content layer before Spanish campaigns scale.

---

# H. Conversion Journey

## Current paths

1. Ad, search, social, or referral.
2. Homepage or a program page.
3. Visitor reads broad women/kids/beginner positioning.
4. Visitor clicks one of several variants of “Start Free Trial,” “Book Free Intro,” “Book Your Free Session,” “Book Free Intro,” or “Contact.”
5. Destination varies:
   - `/book` is a public first-visit class reservation in the workspace.
   - several program and pricing CTAs go to `/portal/login`.
   - contact sends a lead message rather than booking.
6. Confirmation behavior varies between lead acknowledgment, account/dashboard navigation, and the new class reservation confirmation.

## Friction

- Cold visitors can be sent to member login/signup before a trial.
- `/pricing` uses “pricing” as a page title but the visible content does not present actual prices, so the user may expect a pricing answer and instead receives an intro funnel.
- The homepage’s “Explore Programs” button links to `/pricing`, while the schedule, contact, and book paths have separate terminology and mechanics.
- “Book your first class,” “free intro,” “free trial,” and “first session free” are not clearly one offer.
- Schedule and booking cannot be trusted as one production system until the new deployment is published and validated.
- Contact, lead, legacy personal training, Calendly, and Google Calendar paths coexist.
- There is no visible visitor-facing reschedule path in the new first-visit flow.
- The first-visit form collects phone as required in the workspace, which may reduce completion for cold traffic.

## Strong points

- “No account or credit card required” is an excellent friction reducer in the new workspace flow.
- Beginner FAQs answer experience, clothing, safety, and first-visit questions.
- Public schedule cards expose availability and waitlist state in the new workspace.

---

# I. Booking System

## Current truth

### Published production

- The published `/schedule` screenshot shows the legacy static schedule with weekday filters and sample-looking class content.
- The published `/book` screenshot shows a three-step-style program selection flow that says Ground Up will reach out to confirm a spot.
- `GET https://www.groundupbjj.com/api/classes` returns **404**.
- Therefore production is not using the new Google Calendar reservation API.

### Workspace

- `GET /api/classes` reads internal occurrences and reports Google Calendar as the intended source.
- `POST /api/classes/reservations` supports anonymous first-visit reservations and returns a management token.
- Authenticated members use `/api/portal/classes`, `/api/portal/class-reservations`, and `/api/portal/my-classes`.
- Cancellations exist for anonymous token holders and authenticated members.
- Admins can select a Google calendar, sync, review occurrences, edit manual overrides, see rosters, and mark attendance.
- Capacity, duplicate/overlap checks, waitlists, cancellation promotion, and reservation audit events are implemented in storage.
- Resend lifecycle email functions are called asynchronously.

## Remaining booking gaps

- No representative production Google events were present during the first approved 90-day sync; later development test occurrences must not be used as production proof.
- Recurrence, overrides, provider cancellation propagation, concurrent reservations, waitlist promotion, and populated end-to-end email flows are not validated against production-like fixtures.
- No reschedule endpoint or visitor reschedule UI is visible.
- Reminder scheduling/queueing is not visible.
- Async email failures are logged but not queued for retry.
- The older internal `/api/bookings` and Calendly systems remain available and can create parallel records.
- Production cutover, release verification, and removal/retirement of test data are not complete.

---

# J. Member Portal

## Present

- Login and self-registration.
- Dashboard.
- Intake/forms with save, submit, and retake paths.
- Class schedule and native member class booking in the workspace.
- My Classes with reservation history and cancellation.
- Membership view and legacy booking paths.
- Admin member management.
- Coach portal.

## Missing or weak

- No password reset flow.
- No visible email verification flow.
- No MFA.
- No clear account recovery route.
- No demonstrated payment history, subscription management, refund flow, or failed-billing handling.
- New public first visits do not require an account, which is correct; however several public CTAs still send visitors to the portal.
- Portal account creation does not appear to enforce the women-only/female-youth eligibility rule.

## Role enforcement

Admin-only class administration and member management routes are role guarded. The member class reservation path uses the authenticated session user. Legacy coach routes use role checks but are too broad for sensitive object-level access; see K.

---

# K. Admin + Security

## Good baseline controls

- `x-powered-by` is disabled in current source, though the published response still exposed `x-powered-by: Express`, another release-drift signal.
- Current source applies HSTS in production, `nosniff`, strict-origin referrer policy, permissions policy, `X-Frame-Options`, and a production CSP.
- Production session cookies are intended to be secure, HTTP-only, SameSite=Lax, and backed by PostgreSQL when configured.
- Passwords are handled through storage/bcrypt rather than returned in `/api/portal/me`.
- Public, auth, booking, and staff mutation rate limits exist.
- Request body limits exist.
- Stripe signature verification and Calendly timestamped HMAC verification exist.
- Probe paths are stopped before the SPA and return safe 404s.

## Findings

### P0 — broad coach object access

Routes such as member profile access, session notes, belt updates, attendance updates, and coach-facing member retrieval rely on role checks without consistently proving that the coach is authorized for the requested member. A compromised or over-privileged coach session could access or mutate another member’s data. This is an IDOR/object-scope issue.

### P0 — webhook side effects can be lost after early claim

Stripe and Calendly claim an event before all side effects complete. If the database write or downstream action fails after the claim, a provider retry can be treated as a duplicate and the valid event may never be applied. Existing signature verification is good; claim/side-effect ordering and retry state are not production-safe.

### P0 — legacy financial and booking paths need one authority

Legacy `/api/bookings`, payment-intent creation, Calendly booking, and the new class reservations coexist. The legacy APIs accept request fields such as trainer/session/time values and perform read-then-write availability checks. These paths need explicit retirement, isolation, or invariant hardening before production traffic is directed to them.

### P1 — CSRF protection is implicit, not explicit

State-changing cookie-session routes do not show a CSRF token/origin validation layer. SameSite=Lax provides partial browser protection, but it is not a complete application-level CSRF strategy for all deployment and client contexts.

### P1 — authentication lifecycle is incomplete

No password reset, email verification, MFA, lockout/step-up process, or suspicious-login handling was found. Rate limiting helps but does not replace account recovery and abuse controls.

### P1 — validation and audit depth varies

New class routes use strict Zod schemas. Older member updates, belt/attendance writes, notes, legacy booking, and some admin actions have weaker field validation and no consistently visible audit trail.

### P1 — production response still exposes Express

The safe current source disables `x-powered-by`, but the live response includes `x-powered-by: Express`. This is low-severity by itself and high-signal for deployment drift.

---

# L. Forms + Lead Capture

## Forms found

| Form | Persistence/behavior | Assessment |
|---|---|---|
| Contact | Validates with Zod, stores contact submission, creates staff notification, attempts staff email. | Functional in source; no visitor email confirmation or explicit consent checkbox. |
| Trial lead | Stores trial lead, creates staff notification, attempts staff email. | Functional source path; public UI destinations are inconsistent. |
| Adaptive Capacity interest | Uses trial-lead storage with an adaptive program value. | Separate concept is correctly distinguished, but shares lead infrastructure. |
| First-visit class reservation | Stores reservation, returns anonymous management token, attempts lifecycle email. | Promising; production endpoint is not deployed and minor/guardian path is incomplete. |
| Portal signup/login | Custom account creation and login. | Works at API/source level; no recovery/verification. |
| Portal intake/forms | Save/submit/retake. | Authenticated workflow exists; privacy and retention controls need operational verification. |
| Legacy booking/payment | Authenticated booking and payment intent. | Duplicate path with integrity and lifecycle concerns. |

## Form-level gaps

- No visible honeypot, CAPTCHA, bot scoring, or other dedicated spam control; rate limiting is the principal control.
- No explicit consent checkbox on the contact form.
- Contact and trial-lead routes default consent/source values server-side, which should be reconciled with the desired privacy basis.
- No clear confirmation email to the visitor for contact or lead submissions.
- Error handling is generic and useful, but server-side notification failures can be swallowed after the lead is stored.
- Minor booking needs guardian identity and consent rules if girls/female youth are a public offering.

---

# M. Marketing Analytics

## Present

- Consent banner with allow/decline choices.
- First-party `/api/analytics/events`.
- UTM capture for source, medium, campaign, term, and content.
- Session ID and landing path.
- Meta Pixel initialization after consent.
- Event storage and an admin campaign report.
- Attribution is not fabricated when unavailable.

## Missing or unknown

- No GA4 or Google Tag Manager implementation found.
- No Meta Conversions API found.
- No demonstrated server-side deduplication between browser and server events.
- No reliable campaign → lead → trial → attended trial → member conversion chain.
- No visible trial completion or membership conversion event.
- Current campaign report is aggregate and consent-dependent; the proposed campaign comparison task remains separate and should not be duplicated here.
- No provider-dashboard verification of Meta Pixel event receipt was performed.

The consent copy is transparent and the decline path preserves site use. The banner itself is visually prominent and can cover form/schedule content on smaller screens; mobile verification is still needed.

---

# N. SEO / Local SEO

## Present

- Route-specific titles and descriptions through server-side production metadata replacement and client-side Helmet.
- Canonical URLs.
- Open Graph title, description, URL, site name, and image.
- Twitter card metadata.
- `robots.txt` disallows portal/admin and points to sitemap.
- Dynamic sitemap includes public marketing routes.
- H1 and route-specific noscript content exist.
- Oxnard and phone/email are present in public copy.

## Gaps

- `client/src/index.html` and `SEO` use different default OG image extensions/paths (`og-image.svg` in the static document versus `/og-image.jpg` in the component); asset existence and social preview should be verified.
- No LocalBusiness/HealthAndBeautyBusiness structured data was found in the inspected source; the static document has general JSON-LD but not a clearly complete local business graph.
- Address is only “Oxnard, CA”; there is no street address or map signal in the visible contact page.
- Hours say “Mon–Sat: 8am–5pm,” while class events and schedule semantics are separate.
- Search copy includes generic “adults,” “kids,” and “open to all,” weakening intended women-only search positioning.
- The server noscript copy has stale age values and legacy CTA destinations.
- Sitemap and production routes were verified as 200, but page content is from the old published build.
- No Lighthouse/Core Web Vitals measurement was available in this audit.

---

# O. Mobile / Performance

## Mobile

Positive source evidence:

- Mobile nav has an accessible menu button with `aria-expanded`, `aria-controls`, and close behavior.
- Grids collapse at responsive breakpoints.
- Core form controls use full-width layouts where appropriate.
- Body and HTML explicitly prevent horizontal overflow.
- Reduced-motion media rules exist.

Risks requiring device QA:

- Long homepage sections and large hero imagery/video can push the primary CTA below the first viewport.
- The analytics consent banner is fixed across the bottom and can cover schedule cards, forms, or booking controls.
- The desktop navigation has many items; mobile menu ordering should be checked against the one desired acquisition action.
- The schedule card and booking form need real 320px/375px/390px tests.
- Pricing/program cards and long display headings may wrap awkwardly.

## Performance

The workspace build completed but reported:

- JavaScript bundle: approximately 837 kB minified before gzip, 239 kB gzip.
- Multiple image assets are 1.3–1.7 MB.
- Vite warned that chunks exceed 500 kB.
- Browserslist/caniuse data is approximately 23 months old.
- Homepage includes autoplay video and several large marketing images.

High-impact performance work should prioritize image sizing/compression, video strategy, route-level code splitting, and measurement before cosmetic optimization.

---

# P. Accessibility

## Positive evidence

- Form fields generally have visible labels and React Hook Form validation messages.
- Mobile menu exposes label, expanded state, and controls.
- Images in inspected marketing components have alt text.
- Semantic headings are used throughout page components.
- Existing shadcn/Radix components provide keyboard and focus behavior in many controls.
- Reduced-motion CSS is present.

## Risks/gaps

- Contrast of muted gray text, gradient text, dark cards, and small badges needs automated and manual verification.
- The analytics banner uses `role="dialog"` but has no obvious focus trap, focus return, or programmatic title association.
- Async loading/error/empty states need screen-reader announcements and focus management.
- Heading hierarchy is visually driven and should be checked page by page.
- Some icon-only or image-only links rely on context; the footer Instagram link points to generic `https://instagram.com`, not a verified Ground Up profile.
- Password inputs lack `autocomplete` attributes; the current browser logs reported a password autocomplete warning.
- Keyboard-only testing of the schedule filters, booking cards, dialogs, and portal tabs remains outstanding.

---

# Q. Content / Visual Design

## Strengths

- Dark navy foundation, cyan/purple/warm accents, Oswald display typography, and grain/stripe textures create a recognizable system.
- The visual tone is modern, capable, and not a generic pink women’s-fitness template.
- Real women’s training and facility imagery support authenticity.
- Clear cards, badges, and section rhythm make a long experience scannable.
- Coach and facility content exist rather than relying only on abstract claims.

## Weaknesses

- The homepage is long and ambitious; Adaptive Capacity can compete with the first-visit training offer.
- Display typography is intentionally loud but can become dense for long headings and metadata.
- Heavy dark backgrounds and low-contrast secondary copy can make important details easy to miss.
- Visual polish currently exceeds operational clarity: it looks more settled than the booking, audience, and production-release truth actually is.

---

# R. Trust / Beginner Experience

## Present

- Named coach Raymi Gonzalez and credentials.
- Real facility/team imagery.
- “No experience needed.”
- No-intimidation and small-group messaging.
- Safety-oriented BJJ FAQ.
- First-class expectations about clothing and gear.
- Phone, email, Oxnard location, and training hours.
- Privacy policy and contact route.

## Missing or weak

- No street address/map or clear arrival/parking instructions.
- No visible reviews, testimonials, outcomes, or community proof.
- No clear answer to “Will I train with men?” despite the intended women-only policy.
- No clear mother/daughter participation rules.
- No explicit “what happens from arrival to leaving” first-day sequence on the main conversion path.
- No terms, cancellation policy, waiver/safety policy, photo/video consent explanation, or emergency procedure visible.
- “Free trial,” “free intro,” and “first session free” are not unified.

The beginner reassurance score is high because the copy is warm and practical. Trust remains midrange because a physical training customer needs operational certainty, proof, and eligibility clarity before booking.

---

# S. Technical Debt / Legacy Systems

## Legacy or duplicate surfaces

- Static legacy schedule data and the new live Google Calendar schedule.
- Legacy `/api/bookings`, trainer availability, private/personal-training booking, and Stripe payment-intent flow.
- Calendly webhook and transition booking path.
- `/portal/booking` and `/portal/schedule` both route into class/member experiences.
- Legacy `/admin` page/API paths alongside `/portal/admin`.
- Old site configuration with contradictory timezone, coach, group-class, and pricing flags.
- `PAGE_CONTENT` server noscript strings that do not fully match client pages.
- Installed but not fully verified Stripe, Meta, Google Calendar, Calendly, and Resend paths.

## Recommendation

Do not delete these during the audit. First document ownership and traffic, then deprecate only after the new system is production-validated and historical data is preserved.

---

# T. Test Results

## Workspace commands

| Command | Result |
|---|---|
| `npm test` | **Passed:** 7 tests, 0 failed. |
| `npm run check` | **Passed:** TypeScript check. |
| `npm run build` | **Passed:** Vite client and esbuild server build. |

Passing tests cover signed Stripe payloads, Calendly HMAC/replay/tampering behavior, role route closure, payment ownership, rate limits, scanner probes, and security headers.

## Warnings

- Vite reports stale Browserslist/caniuse data.
- Vite reports chunks larger than 500 kB.
- The running workspace schedule screenshot showed an expected anonymous `/api/portal/me` 401 and no fatal frontend error.

## Safe route smoke tests

Against production on September 1, 2026:

| Request | Result |
|---|---|
| `/` | 200 |
| `/schedule` | 200 |
| `/book` | 200 |
| `/contact` | 200 |
| `/privacy` | 200 |
| `/portal/login` | 200 |
| `/api/trainers` | 200 |
| `/api/classes` | **404** |
| `/api/portal/me` | 401, expected anonymous behavior |
| `/admin.php` | 404 |
| `/1.php` | 404 |
| `/this_is_a_new_hello_world.php` | 404 |

## Visual runtime checks

- Production desktop screenshots were captured for `/`, `/schedule`, `/book`, `/contact`, and `/portal/login`.
- Workspace `/schedule` was captured separately and showed the new live class card UI plus development test occurrences.
- Production and workspace visual behavior are materially different, confirming deployment drift.

---

# U. P0 Issues

These are blockers before accepting meaningful production traffic or publishing the new booking system:

1. **Fix coach/member object-level authorization.** Prove coach-to-member scope for every read and write, including profile, forms, notes, belt, attendance, and bookings.
2. **Make Stripe and Calendly webhook processing retry-safe.** Verify signatures, persist processing state, perform idempotent side effects, and only mark complete after success.
3. **Choose one production booking authority.** Prevent legacy booking/payment/Calendly paths from conflicting with Google Calendar reservations, or explicitly keep them private-session-only with tested boundaries.
4. **Verify deployment parity before cutover.** Publish only a reviewed build, confirm `/api/classes` exists, confirm no test occurrences leak, and smoke test the public schedule/first visit/member/admin paths.
5. **Harden financial/status invariants in legacy paths.** Server-side price authority, ownership checks, atomic overlap/capacity enforcement, and payment-state transitions must be proven or the paths must be disabled.

---

# V. P1 Issues

1. Make women-only the explicit public rule, including girls/female youth and mother-daughter scope.
2. Remove login gating from cold-traffic first-visit CTAs; reserve the portal for existing members.
3. Complete representative Google Calendar validation: recurrence, overrides, cancellation, timezone, concurrency, capacity, waitlist promotion, and lifecycle email.
4. Add a guardian/minor booking and consent design if girls are bookable.
5. Add password reset, email verification, account recovery, and explicit CSRF/origin protection.
6. Add visitor confirmation/follow-up and reliable email retry/observability.
7. Reconcile timezone, coach, age, feature-flag, pricing, and route metadata drift.
8. Add a truthful operational trust layer: address/map, arrival, parking, first-day steps, eligibility, policies, and reviews/testimonials where available.
9. Publish the reviewed workspace build only after the cutover gate passes.

---

# W. P2 Issues

1. Establish a real Spanish/bilingual architecture before scaling Spanish ads.
2. Complete funnel analytics from campaign through lead, scheduled trial, attendance, and membership.
3. Verify LocalBusiness schema, OG assets, canonicals, and Google search presentation.
4. Add explicit consent and privacy context to public forms.
5. Add automated accessibility checks and real keyboard/mobile QA.
6. Add user-facing reschedule and reminder workflows.
7. Measure Core Web Vitals and optimize the largest images/video and client bundle.
8. Add admin audit/export/retention controls for sensitive member records.

---

# X. P3 Improvements

1. Simplify the visual hierarchy after the business rule is final.
2. Split the client bundle by route.
3. Replace generic social links with verified profiles.
4. Improve empty/loading/error states with progressive disclosure and screen-reader announcements.
5. Add richer community proof, coach content, and class photos after consent and content ownership are confirmed.
6. Retire duplicate routes and stale configuration after production migration is complete.

---

# Y. Recommended New Information Architecture

**Proposal only; not implemented in this audit.**

The current navigation should eventually be reorganized around one audience and one first action:

1. **Home**
2. **Women’s BJJ**
3. **Self-Defense**
4. **Strength & Movement**
5. **Girls / Mother + Daughter**
6. **Start Here / First Class**
7. **Schedule**
8. **About / Coach**
9. **FAQ**
10. **Contact**
11. **Member Login** as a secondary utility action

Adaptive Capacity should remain a clearly separate path, not a competing primary training program, unless the business explicitly decides it belongs in the same public navigation.

The proposed structure is derived from the audit: make the women-only rule and first visit discoverable before secondary philosophy, administration, or private-session details.

---

# Z. Recommended Messaging Architecture

**Proposal only; not implemented in this audit.**

Recommended message order for future public pages:

1. **Women-only, in the first viewport.**
2. **Discover what your body can do.**
3. **Beginner-friendly, no athletic background required.**
4. **BJJ, practical self-defense, strength, and movement.**
5. **Supportive small-group coaching, not a fight-gym atmosphere.**
6. **Girls/female youth and mother + daughter, with exact eligibility stated.**
7. **Connection and community with other women.**
8. **What the first visit is actually like.**
9. **One consistent first-visit CTA.**
10. **Supporting proof: coach, real facility, reviews, safety, policies, location.**

The campaign philosophy—moving from appearance toward capability—fits the existing resilience language well. Future copy should reduce generic “fitness,” “open to all,” and appearance-oriented framing and increase useful strength, learning, agency, confidence, movement, and connection.

---

# Proposed implementation phases

**Proposal only; no implementation was performed.**

| Phase | Scope | Complexity |
|---|---|---|
| 1 | P0 authorization, webhook retry safety, financial/booking invariants, CSRF strategy, and deployment parity gate. | Large |
| 2 | Women-only and girls/female-youth policy decisions; unify eligibility, age, guardian, and audience rules across data, UI, metadata, and email. | Medium |
| 3 | Consolidate public acquisition around one first-visit flow; production-validate Google Calendar, capacity, waitlists, cancellation, and follow-up. | Large |
| 4 | Build the Spanish/bilingual content and form architecture; preserve campaign continuity through booking and confirmation. | Large |
| 5 | Complete attribution, local SEO, schema, accessibility, performance, and mobile verification. | Medium |
| 6 | Deprecate duplicate legacy schedule, booking, admin, and configuration surfaces after usage/data review. | Medium |

No time estimates are provided because provider configuration, content ownership, and production test-account access are not known.

---

# Final operating checklist before any production cutover

- [ ] Women-only policy and female-youth/mother-daughter rules are authoritative.
- [ ] Coach object authorization is tested with positive and negative cases.
- [ ] Webhook retries cannot lose valid provider events.
- [ ] One booking system is authoritative for each service.
- [ ] Google Calendar has representative approved events in the correct Pacific timezone.
- [ ] Recurrence, overrides, cancellations, capacity, concurrency, waitlists, and emails pass.
- [ ] No development/test occurrences appear in production.
- [ ] Production `/api/classes` and all public/member/admin routes match the reviewed build.
- [ ] First-visit visitors do not need a member account unless intentionally required.
- [ ] Password reset, verification, CSRF/origin, and retention decisions are documented.
- [ ] Spanish campaign traffic has a deliberate language experience.
- [ ] Mobile, accessibility, performance, SEO, and real inbox checks pass.

GROUND UP AUDIT COMPLETE — SECURITY FIXES REQUIRED FIRST