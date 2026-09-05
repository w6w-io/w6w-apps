# Teamleader Focus

Manage contacts, companies, deals and users in **Teamleader Focus**, the Belgian CRM /
invoicing / project-management SaaS, over its HTTP RPC API.

- **Categories** — crm
- **Auth methods** — oauth2
- **Actions** — 15
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:oauth2`
- **Egress allowlist** — `api.focus.teamleader.eu` (the OAuth authorize/token hosts are allowed
  implicitly by the runtime; the `service` check adds `status.teamleader.eu` to its own hook
  allowlist, never to the app's)
- **Website** — https://www.teamleader.eu/
- **API docs** — https://developer.focus.teamleader.eu/docs/api
- **Status page** — https://status.teamleader.eu/

> **Everything below was verified against Teamleader's own developer docs on 2026-09-01** —
> `developer.focus.teamleader.eu/docs/*`. That site is a client-rendered Docusaurus SPA with no
> server-rendered HTML and no published OpenAPI/Swagger document, so its pages were read via a
> rendering proxy rather than a bare fetch; every endpoint, field and status code below was cross-
> checked page by page against that rendered content, plus a live probe of `status.teamleader.eu`.
> Nothing here came from a third-party integration directory.

## The three things most likely to go wrong

### 1. This is RPC, not REST — every call is `POST`, including reads

Teamleader states the choice explicitly in its own docs: "We chose this action based approach over
the more popular REST, because it enables us to have domain related actions on resources such as
`invoices.book`, `timetracking.start` and `timetracking.stop`." Every endpoint is
`POST https://api.focus.teamleader.eu/<resource>.<action>` with a JSON body — `contacts.list` to
search, `contacts.info` to fetch one, `contacts.add` to create, `contacts.update` to change one,
`contacts.delete` to remove it. There is no `GET` anywhere in this API. See
[`lib/client.ts`](lib/client.ts).

Responses are `{"data": …}` on success — a single object, or an array with `meta.page` /
`meta.matches` alongside it — and `{"errors": [{"title": "…"}]}` on failure. A create answers `201`
with `{"data": {"type", "id"}}`; an update or action-style endpoint answers `204` with no body.

### 2. Update endpoints replace array collections wholesale, never merge

Per Teamleader's own general principles: "Collections are replaced entirely during updates, so all
the wanted values should be provided when updating entities. Other existing values which are not
provided will be removed." That applies to `emails`, `telephones`, `addresses` and `tags` on
[`contacts-update`](actions/contacts-update.ts) and [`companies-update`](actions/companies-update.ts)
— send the full set you want, not just the field that changed, or the rest silently disappears.

`custom_fields` is the one documented exception: pass `customFieldsUpdateStrategy: "partial"` to
update only the custom fields named in that call and leave the others untouched.

### 3. OAuth lives on a different host than the API, and takes no `scope` parameter

The authorize and token endpoints are on `focus.teamleader.eu` (the app itself), one host away from
the API host (`api.focus.teamleader.eu`) every Action calls:

- Authorize: `https://focus.teamleader.eu/oauth2/authorize`
- Token: `https://focus.teamleader.eu/oauth2/access_token`

Unlike most OAuth2 vendors, the authorize request has no `scope` parameter at all — Teamleader's
own parameter list is just `client_id`, `response_type`, `state`, `redirect_uri`. Scopes are instead
fixed once, per integration, when the integration is registered on the
[Teamleader Marketplace](https://marketplace.focus.teamleader.eu/build) ("it is required to select
all scopes your integration wants access to"). See [`auth/oauth2.ts`](auth/oauth2.ts) for the full
write-up, including why `oauth2.scopes` is deliberately left undeclared rather than populated with a
guess.

OAuth 2.0 is the *only* auth Teamleader documents for third-party integrations — there is no
API-key alternative, and a `client_id`/`client_secret` pair only exists after Marketplace
registration.

## Actions

| Resource | Actions |
|---|---|
| Contacts | `contacts-list`, `contacts-info`, `contacts-add`, `contacts-update`, `contacts-delete` |
| Companies | `companies-list`, `companies-info`, `companies-add`, `companies-update` |
| Deals | `deals-list`, `deals-info`, `deals-create`, `deals-update` |
| Users | `users-list`, `users-me` |

Deal phase changes (`deals.move`), win/lose (`deals.win`/`deals.lose`), invoicing, projects, tasks
and calendar are documented by the vendor but out of scope for this first pass — left out rather
than guessed at, per this app's own instructions.

## Health checks

- **`service`** (`kind: "service"`) reads `status.teamleader.eu`'s Statuspage feed, following only
  the **"API endpoints"** component — the specific child of the "API and integration services" group
  that answers for `api.focus.teamleader.eu`, not the dozens of web-app-only components (Dashboard,
  Calendar, Global Search, …) this app never touches. Two hosts (`status.teamleader.eu` and
  `teamleader.statuspage.io`) serve the identical page; the tempting decoy,
  `teamleaderfocus.statuspage.io`, is a genuinely unclaimed Statuspage subdomain answering with
  Atlassian's own marketing HTML, not Teamleader's.
- **`quota`** (`kind: "quota"`) reads the `x-ratelimit-limit` / `x-ratelimit-remaining` /
  `x-ratelimit-reset` headers Teamleader documents on every response — its only published metering
  surface, a sliding one-minute window rather than a monthly plan allowance. It reuses the same
  `users.me` call the OAuth `test` hook already makes rather than spending a second request purely to
  read three headers.
- **`auth:oauth2`** (derived) — `POST /users.me`, "Get the current authenticated user". It requires a
  live token and its response is entirely account metadata (id, name, email, language, time zone,
  team memberships) — no credential material, so it doubles as the `users-me` Action's own endpoint.

## What was deliberately left out

- **No API-key auth.** Teamleader documents none for third-party integrations.
- **No `deals.move` / `deals.win` / `deals.lose`, invoicing, projects, tasks, calendar.** Real,
  documented endpoints, just outside this pass's scope — a future pass can add them the same way,
  one file per action.
- **No `oauth2.scopes`.** Teamleader's `/oauth2/authorize` takes no `scope` query parameter; see
  above.
