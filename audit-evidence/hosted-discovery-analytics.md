# Hosted Discovery Pass Analytics Verification

**Date:** 2026-09-09  
**Published URL:** `https://www.groundupbjj.com`  
**Deployment:** public autoscale deployment with a successful current build

## Verification performed

- Opened the published English route `/discovery-pass` with synthetic UTM values:
  - `utm_source=task109-en`
  - `utm_medium=qa`
  - `utm_campaign=discovery-funnel-en`
- Opened the published Spanish route `/es/discovery-pass` with synthetic UTM values:
  - `utm_source=task109-es`
  - `utm_medium=qa`
  - `utm_campaign=discovery-funnel-es`
- Granted analytics consent in each browser session.
- Clicked the localized Discovery Pass CTA in each session.
- Confirmed both routes reached their localized signup destinations and retained the UTM query values.
- Confirmed the consent and attribution values stored in each test browser contained only the synthetic campaign values and landing path; no member information was used.
- Checked both the custom-domain and generated Replit deployment HTML for the hosted tracker.
- Queried Replit-hosted analytics before and after the checks for:
  - `discovery_page_view`
  - `discovery_cta_click`
  - `discovery_account_created`
  - `discovery_forms_started`
  - `discovery_required_forms_completed`
  - `discovery_pass_activated`
  - `discovery_class_booked`

## Result

The public routes, consent UI, localized CTA links, UTM propagation, and published bundle are present. The published HTML does not contain the Replit-injected Umami tracker, `window.umami` is absent in both sessions, and Replit-hosted analytics reported zero matching custom events and zero Discovery Pass pageviews in the 24-hour verification window.

Therefore the hosted property did **not** receive the seven requested events. The post-signup, forms, activation, and booking portions were not created as production test records because the hosted collector was absent; running those steps would add synthetic member data without testing the requested hosted property.

## Required next action

No application-code analytics destination or property ID should be added. Enable Replit-hosted analytics in Publishing settings and republish the current build. After republishing, repeat the two consented journeys and the full synthetic signup/form/activation/booking path, then query the seven event names plus `utm_source`, `utm_medium`, `utm_campaign`, landing path, and locale. The current result is a configuration/republish prerequisite, not proof that the event calls are accepted by the hosted property.