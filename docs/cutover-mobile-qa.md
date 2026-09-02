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