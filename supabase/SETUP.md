# Authentication setup

Authentication is now handled entirely by the Node server. No Supabase login SQL is needed, and there is no user creation feature. The earlier Supabase Auth bootstrap SQL has been removed from this project; live database tables/accounts were not deleted or altered.

Run `npm run dev` and open http://localhost:3000/login. Use the configured fixed admin credential. The server keeps the email and scrypt password hash in `server/adminCredentials.ts`; browser code receives neither the password nor its hash.

## Persistent login

Each browser gets a separate random 256-bit HttpOnly, SameSite=Strict cookie. Only SHA-256 token digests are written to `data/auth-sessions.json`. This file must stay on persistent storage and is ignored by Git and blocked over HTTP. Session records do not have an application timeout. Browser cookies have a 400-day lifetime renewed on session verification. Browser/site-data deletion, private browsing and server-store deletion naturally reset the affected session.

Logout revokes the current device's token and clears its cookie. Other devices remain signed in. Refreshing or reopening the browser does not log out. Session checks also survive a Node process restart using the same data directory.

Use HTTPS in production; production cookies are Secure by default. Optionally set `APP_ORIGIN=https://your-host`. Origin validation and SameSite cookies restrict cross-site mutation requests. The server rate-limits password attempts, including concurrent requests. These follow the [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

No design makes credentials impossible to obtain if the server or device is compromised. The protection here is server-only password hashing, protected source paths, opaque HttpOnly session cookies and validated requests, rather than client-side credential hiding.

## Database status

The user chose to finish only login at this point. Database and Sheets environment settings are retained. No Supabase Auth sessions are created or restored by the app. Existing RLS remains in force; this local login does not bypass those rules. A protected server-side database connection can be added later using a server-only Supabase secret key; [Supabase says secret keys must not be exposed in the browser](https://supabase.com/docs/guides/api/api-keys). No key is required to use this login.

## Verification

- `npm run test:auth:server`: isolated local sessions; password, persistence, restart, logout, origin/rate-limit checks.
- `npm run test:auth:ui`: real fixed login, refresh and browser close/reopen, independent devices, logout, no account-creation UI/API, no Supabase Auth requests. Business data uses intercepted fixtures.

No login test writes to the live business database.

Set `TEST_ADMIN_PASSWORD` in the test process environment when running the fixed-account checks; test files do not contain the configured password.
