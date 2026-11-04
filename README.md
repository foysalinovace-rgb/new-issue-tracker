# Issue Tracker

## Run locally

```sh
npm install
npm run setup:admin
npm run dev
```

Open http://localhost:3000. The local `.env.local` configuration enables the existing Supabase database and Google Sheets issue-sync integration. This file is ignored by Git. Use `.env.example` when configuring another environment.

On a fresh clone, `setup:admin` prompts for the fixed admin password without displaying it. It creates the private `server/adminCredentials.ts` from its committed template. Existing credentials are kept unchanged. Automation may provide `ADMIN_PASSWORD` in the process environment. Never commit the generated credential file, `.env.local`, session data or prompt history; these are excluded from Git.

## Login

Login uses one fixed admin account, verified by the local Node server. No Supabase Auth account, profile table, SQL migration, signup or user-management screen is required. The email and one-way scrypt password hash are held only in `server/adminCredentials.ts`; the password is not bundled into browser JavaScript.

A random HttpOnly, SameSite=Strict cookie identifies each device/browser session. The server stores only token hashes in `data/auth-sessions.json`. Refresh, browser close/reopen and Node server restarts preserve login. Logout revokes only the current browser's session. Cookies renew on session checks, with the browser-supported 400-day persistent lifetime; clearing site data, private browsing, or deleting the server session store resets that browser's login. Keep the data directory on persistent storage.

For hosted deployment use HTTPS. Production sets the Secure cookie flag; `APP_ORIGIN` can pin the trusted origin. Local development works at http://localhost:3000. See [session setup details](supabase/SETUP.md).

The user requested completing login only for this phase. Existing database/Sheets configuration remains separate; no live Supabase schema, accounts or permissions were changed. This login does not mint a Supabase JWT or bypass protected database policies. Server-only database integration is deferred until its key/configuration is provided.

## Connections

- `VITE_ENABLE_DATABASE=true` selects Supabase. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the project.
- `VITE_ENABLE_GOOGLE_SHEETS_SYNC=true` enables issue submission to Google Sheets through the local server. Set `GOOGLE_SHEET_WEBAPP_URL` to the Apps Script deployment URL.
- Issue submission saves to the database first. Sheets failures are shown separately, so a saved database entry is not mistaken for a failed submission.
- SIM Finder retains its configured Google Sheets read connection. Retention retains its existing browser storage behavior.
- Existing browser-only records are retained. Enabling connections does not automatically upload historical local records.

`node scripts/check-connections.mjs` performs read-only connection checks. The Apps Script endpoint is POST-only; its missing `doGet` message on a read check does not validate an append. No test records are sent to live services.

## Interface

All modules use Overview's open layout and teal styling. Every app load starts in dark mode, independent of device appearance or a previously saved light theme. The header still lets users switch to light mode during the current session; its sidebar is pale indigo. Admin and theme controls remain in the header; workspace search and local-mode badges are removed. Dashboard and Analytics have always-visible inline filters. Other module filters start collapsed and retain their values when toggled; Add/Export actions remain accessible.

Overview and Weekly Report share the same metric icon component. The issue-edit drawer uses responsive two-column timing/feedback sections, switching to one column on phones.

Public feedback URLs always use a standalone light interface, including loading, missing-ticket, previously submitted, and success states. Five emoji rating cards retain the existing rating/satisfaction values and Bangla/English support. Returning to a module restores its theme.

All Excel downloads share a styled writer: navy report titles, teal headers, alternating rows, status colours, fitted columns, wrapped details, frozen headers, filters, numeric/date formats, and print footers. Existing sheets and report data are retained. Import templates keep their headers in row one; issue imports also recognise the data header in styled reports. ExcelJS loads only when an export is requested.

Export sizing measures the formatted text using the export font. Headers, names, identifiers and full timestamps stay on one line; long details wrap in wider columns with calculated row heights. Long narrative columns expand before hitting Excel's row-height limit. Data cells have borders on all four sides and consistent top alignment. Summary titles span their columns, and wide reports are not compressed to a single printed page across all columns.

Narrative text with more hard line breaks than Excel can physically display in one row is reflowed into paragraphs in the export. All text content is retained; only the exported line-break formatting changes. Database records are not modified.

The login page has no top logo/name or decorative icon. Its footer reads “Inovace Technologies Ltd.”

Module navigation lives in the sidebar. Module headers, report shortcuts, success banners, and Sales/Retention toolbars have no links to other modules. Save, edit, export, and modal actions remain available. The sidebar scrolls without displaying a scrollbar.

Issue Entry follows this order: Client & Classification, Ownership & Status, Timing & SLA Metrics, Resolution Confirmation & Customer Feedback, then Issue Description & Findings. Module headers display their title and description without category labels. Customer satisfaction is named CSAT Report in navigation and its page header. Overview's recent-issues panel uses the full row; its former shortcut panel is removed.

CSAT Report's interface and Excel labels use English only. Customer-entered data retains its original text.

## Verification

- `npm run lint`: TypeScript checks.
- `npm run build`: production bundle.
- `npm run test:filters`: read-only layout and theme checks.
- `npm run test:appearance`: verifies dark startup on a light device, matching metric icons, inline Analytics filters and issue-edit alignment using isolated browser fixtures. It does not write to live connections.
- `npm run test:feedback-exports`: verifies the public light interface, emoji selection, fixture-only submissions, exported workbook values/styles, template layout and an actual browser download. All database requests are intercepted.
- `npm run test:excel-layout`: creates and reopens a browser-generated workbook, verifies saved sizes/formats and checks measured cell containment for long names, headers, dates, Unicode, paragraphs, notes and summaries. Also verifies the login branding at desktop/mobile sizes. This is not a native Excel renderer.
- `npm run test:auth:ui`: verifies the real local login, refresh, persistent browser profiles, per-device logout, missing user-creation UI/API, and blocked server files. Business data requests use fixtures.
- `npm run test:auth:server`: checks password verification, persistent sessions across server restart, token rotation, origin checks, cookie flags, forged-session rejection and rate limits without any Supabase requests.

The earlier `test:ui` and `test:modules` scripts are retained as legacy offline CRUD checks. They are not the verification entry points for the current server-authenticated app. They refuse to write when live connections are enabled.

Screenshots and reports are saved under `artifacts/`.

The fixed-account server/UI checks require `TEST_ADMIN_PASSWORD` in the test process environment. The real password is deliberately not included in test source files.
