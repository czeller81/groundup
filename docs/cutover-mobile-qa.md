# Ground Up manual mobile QA script

This checklist is required before publishing because the workspace has no browser engine available for interactive viewport runs. It is designed for one person to complete in about 10–15 minutes using a real phone or responsive browser preview.

## Test setup

- Use a clean session and start at `/` for English or `/es` for Spanish.
- Record any horizontal page scroll, clipped text, hidden action, focus problem, or unexpected English.
- Exercise each width: **320px**, **375px**, **390px**, and **430px**.

## 320px — English member

1. Open `/portal/login`; open the signup tab and confirm both columns fit without horizontal scrolling.
2. Log in as a test member; open the menu, Schedule, My Classes, Forms, and Account/language controls.
3. Open a class action and the cancellation dialog.
4. Pass when every button is visible and tappable, the menu opens/closes, dialogs fit, and `document.body` has no page-level horizontal overflow.

## 375px — Spanish member

1. Open `/es`; follow the Spanish login route to the dashboard.
2. Switch through Horario, Tu entrenamiento, Tus formularios, a class action, and logout.
3. Confirm normal member-facing headings, buttons, statuses, empty states, and confirmations are Spanish.
4. Pass when the language control is reachable, translated text is not clipped, and no page-level overflow appears.

## 390px — coach

1. Log in as a coach and open the mobile navigation.
2. Open assigned members, attendance, belt controls, session notes, and schedule.
3. Save an attendance value and a note.
4. Pass when all actions remain reachable, text fields fit, and no control is hidden beneath another.

## 430px — admin

1. Log in as an admin and open dashboard, members, forms, and class management.
2. Open one alert/dialog, inspect tabs, and inspect any dense table.
3. Pass when the page itself does not scroll horizontally; contained table scrolling is acceptable.

## Final loop

- Repeat login, menu, focus, and logout once at the narrowest width.
- Check keyboard focus visibility where a keyboard is available.
- Record exact route, viewport, and observed issue for every failure.

## Rendered viewport pass — 2026-09-03

The deterministic Chromium runner in `scripts/mobile-rendered-qa.mjs` covered all seven
portal surfaces (member dashboard, schedule, classes, forms, coach, class management,
and admin) in English and Spanish at **320px, 375px, 390px, and 430px**: **56 cases**.
Screenshots and the machine-readable report are stored in
`audit-evidence/mobile-rendered/`.

Result: **PASS**

- Page-level horizontal overflow: 0 cases
- Out-of-bounds visible controls: 0 cases
- Undersized visible controls: 0 cases
- Mobile navigation open/close checks: 56/56 passed
- Admin member-profile tabs opened and fit at all four widths/locales: 8/8 passed
- The admin member-management grid and filter controls remain within the viewport.
- Spanish portal headings, actions, form metadata, system statuses, and notifications
  use localized copy. User-entered names, calendar titles, and campaign values remain
  unchanged as expected.

Accepted local scrolling:

- The campaign report table scrolls horizontally within its report container.
- The admin inbox tab row scrolls horizontally within its tab container.
- Radix UI's 1px native `<select>` elements are hidden implementation controls; the
  rendered select trigger is the visible/tappable control and is included in the size
  audit.