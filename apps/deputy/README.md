# Deputy

Manage Deputy employees, timesheets, leave, areas and locations — the daily
loop of a workforce scheduling install.

- **Categories** — hr, calendar, productivity
- **Auth methods** — permanent-token (a per-install Bearer token)
- **Actions** — 18
- **Egress allowlist** — `*` (per-install subdomain — see below)
- **Website** — https://www.deputy.com
- **API docs** — https://developer.deputy.com (the catalog's older
  `www.deputy.com/api-doc/API-Introduction` link 301-redirects here) —
  append `.md` to any page for its clean markdown, `/llms.txt` for the full
  page index; read 2026-09-22.

## Setup

### Permanent Token

1. In your Deputy install, open
   `https://{install}.{geo}.deputy.com/exec/devapp/oauth_clients`.
2. Click **New OAuth Client**. Even though this mints a permanent token, a
   client must still exist — name and description are only shown to your own
   install's admins.
3. Click **Get an Access Token**. Deputy displays the token **once** — copy it
   immediately, it cannot be viewed again.
4. Paste your install's URL (e.g. `https://simonssambos.au.deputy.com`) and
   the token into the connection.
5. To revoke access later, delete the OAuth Client from the same
   `/exec/devapp/oauth_clients` page — there is no revoke endpoint over the
   API itself.

### Why a Permanent Token, and not Deputy's OAuth2 flow

Deputy documents two ways in. The OAuth2 authorization-code flow
(`once.deputy.com/my/oauth/login` → `once.deputy.com/my/oauth/access_token`)
needs a browser consent screen and issues 24-hour access tokens with rotating
refresh tokens — built for a published app serving "hundreds if not
thousands" of Deputy customers. A Permanent Token is what Deputy's own docs
recommend instead for *"a custom application for one or two Deputy installs
or for an internal system connection"* — exactly what an unattended workflow
is, and the same posture this pack already uses for single-install apps like
Mautic and Gitea. It has no expiry and is revoked from the install's own
admin page, so treat it like a password.

### Why the allowlist is `*`

Every Deputy customer runs on their own subdomain —
`https://{install}.{geo}.deputy.com` (`{geo}` is `au`, `eu`, `uk` or `us`) —
and there is no single fixed API host the way there is for most SaaS vendors.
So the install URL is a connection field and the egress allowlist has to be
open, deliberately, the same trade-off this pack makes for `mautic`,
`gitea`, `tableau` and `bubble`.

## Actions

| Key | Type | Description |
|---|---|---|
| `me` | read | Who this connection's token belongs to (`GET /me`) |
| `employee-list` | read | Every employee this token may see (capped at 500) |
| `employee-get` | read | One employee by id |
| `employee-search` | search | Filter/sort/join/page employees via `POST /QUERY` |
| `employee-create` | perform | Create an employee |
| `employee-update` | perform | Update only the employee fields provided |
| `employee-fields` | read | The Employee field metadata this install exposes |
| `timesheet-list` | read | Every timesheet this token may see (capped at 500) |
| `timesheet-get` | read | One timesheet by id, including its approval/pay state |
| `timesheet-search` | search | Filter/sort/join/page timesheets, e.g. by date range |
| `timesheet-start` | perform | Clock an employee on, for a given area |
| `timesheet-end` | perform | Clock an employee off, recording the meal break |
| `timesheet-create-or-update` | perform | Write a timesheet from Unix timestamps |
| `leave-list` | read | Every leave request this token may see (read-only) |
| `operational-unit-list` | read | Every Area (Deputy's OperationalUnit) |
| `operational-unit-get` | read | One Area by id |
| `location-list` | read | Every Location (Deputy's `Company` resource) |
| `location-get` | read | One Location by id |

## Four things that go wrong quietly

- **`Company` means Location.** Deputy's UI says "Location"; every API
  surface — including the hand-written "Get Locations" page, which is
  literally `GET /v1/resource/Company` — calls it `Company`. The same split
  runs through `OperationalUnit` = "Area".
- **500 records is a response cap, not a page size.** Deputy states it as a
  platform fact: *"The maximum amount of records included in a single
  response is 500."* A list action that returns exactly 500 has silently
  truncated — use the matching `*-search` action, which pages with `start`
  and `max` through `POST /QUERY`.
- **A `403` proves an install answered, not that a path exists.** Verified
  live: an unauthenticated `GET /api/v1/me` and an unauthenticated
  `GET /api/v1/nope-not-real` both answer the identical
  `{"error":{"code":403,"message":"No authorization given"}}` — Deputy
  authenticates before it routes.
- **A wrong install URL is a redirect, not a 404.** A hostname that is not an
  install answers `302` to `once.deputy.com/my/` and lands on a 200 HTML login
  page — `auth/permanent-token.ts`'s `test` and `health/instance.ts` both
  check the final host, not just the status code, so a typo'd URL is reported
  as exactly that rather than as a live credential.

## Health checks

- **`service`** (`kind: service`) — `status.deputy.com`, a real Atlassian
  Statuspage. Scoped to Deputy's own regional API components ("Deputy - All
  regions" and its "Deputy - USA"/"Deputy - AU"/"Deputy - UK" children) by
  id, deliberately excluding the page's third-party group (Pusher, Twilio,
  Xero, Zuora, HelloSign) and Deputy's own website/billing/sandbox/payroll
  components — none of which describes whether `GET /api/v1/resource/*` will
  answer.
- **`instance`** (`kind: dependency`, scope `connection`) — probes this
  connection's own install, unsigned, against `GET /api/v1/me`. The
  documented `{"error":{"code":403,...}}` envelope is read as a heartbeat: an
  install that answers it is reachable, whether or not the caller is
  authenticated. A revoked or expired token can never make this check report
  down — that is the derived `auth:permanent-token` check's job.
- **`auth:permanent-token`** (derived) — the connection's own token, checked
  against the same `/me` probe, this time signed. Classified from the
  response body, not the status code alone: a bare 401 with an empty body is
  a rejected token; a 403 body is Deputy's "no Authorization header reached
  me" answer, a different problem (a stripped header) from a bad token.

## Known gaps

- **V2 API not covered.** This app stays on the V1 Resource API
  (`/api/v1/...`), which Deputy's own generated reference calls *"legacy …
  in maintenance mode"* while recommending V2 for new integrations. V2 is a
  different, partly async, partly PKCE-authenticated surface that a
  permanent token is not the right credential for — out of scope here.
- **No documented `max`/`start` on every resource's plain `GET
  /resource/{Object}` list form.** Only `POST /resource/{Object}/QUERY`
  documents pagination (`start`, `max`, capped at 500) — use the matching
  `*-search` action for any table that might exceed 500 rows.
- **Leave is read-only.** The generated V1 reference exposes no create/update
  page for the `Leave` resource itself (only hand-written guides describe
  adding leave, against fields that could not be verified against Deputy's
  own generated schema), so no leave-write action is included.
- **`GET /api/v1/me`'s 200 response body is undocumented.** Deputy's own
  dedicated reference page for it now redirects to the getting-started guide.
  The `me` action returns the body verbatim under `response` rather than
  projecting fields this app would be guessing at.
- **The Resource API's own Create/Update Timesheet endpoints are not used.**
  `POST /resource/Timesheet` exists in the generated reference, but its
  request schema is the full 60-property read-side row with no description on
  `StartTime`/`EndTime`/`Mealbreak` — nothing states whether those integers
  are Unix seconds, minutes, or something else. `timesheet-create-or-update`
  uses the hand-written `POST /supervise/timesheet/update` call instead,
  whose `intStartTimestamp`/`intEndTimestamp` fields are explicitly documented
  as Unix timestamps.
- Webhooks, DeXML, Deputy Embed, sales metrics, payroll exports, and the
  other ~40 V1 resources this app does not touch are all out of scope.
