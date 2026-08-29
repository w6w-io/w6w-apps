# WhatConverts

Read and write call, form, chat, email, transaction, appointment, text-message and custom-event
leads from WhatConverts's conversion tracking and attribution platform, over the **WhatConverts API
v1**.

- **Categories** — marketing, analytics, crm
- **Auth methods** — basic (API Token + Secret)
- **Actions** — 25
- **Health checks** — 1 (`service`) + the derived `auth:basic`
- **Egress allowlist** — `app.whatconverts.com` (the `service` check adds `status.whatconverts.com`
  to its own hook allowlist, never to the app's)
- **Website** — https://www.whatconverts.com/
- **API docs** — https://www.whatconverts.com/api/overview/
- **Status page** — https://status.whatconverts.com/

WhatConverts tracks phone calls, web form submissions, chats, emails, transactions, appointments,
text messages and custom events, attributing every one back to the marketing source, medium,
campaign, content and keyword that produced it. WhatConverts's own umbrella term for all of these
is a **lead** — one resource with a `lead_type` discriminator field, not a resource per channel —
and this app follows that shape rather than inventing one action per lead type.

> **Everything below was verified against WhatConverts's own published reference
> (`whatconverts.com/api/{overview,accounts,profiles,users,roles,leads,recordings,tracking}/`) plus
> live probes against `app.whatconverts.com` and `status.whatconverts.com`, both on 2026-08-29.**
> WhatConverts publishes prose documentation, not an OpenAPI or Postman document — every path,
> parameter and response field in this app was read directly off those pages. Nothing here came
> from a third-party integration directory.

## The things most likely to trip you up

### 1. Two credential kinds, one Auth method

Every request carries HTTP Basic auth — an API token as the username, its paired secret as the
password (`Authorization: Basic base64(token:secret)`). WhatConverts issues two kinds of key that
both present exactly this way:

- a **Profile Key**, scoped to one profile — reaches `leads`, `recording` and `tracking/*`;
- a **Master Account Key** ("Agency Key", agency plan only) — additionally required for `accounts`,
  `accounts/{id}/profiles`, `roles` and `users`, and able to pass `account_id`/`profile_id` filters
  into the profile-scoped endpoints.

This app does not try to detect which kind a given credential is before calling an action — the
vendor's own per-page notice ("Agency Key is required to access this resource") and its 401 already
report that per call, and each agency-only action's description says so up front.

### 2. Missing vs. wrong credential share one status code

Confirmed live on 2026-08-29: a request with no `Authorization` header at all and a request with a
syntactically valid but wrong token/secret pair **both answer `401`**. They are told apart only by
the `error_message` body:

| Case | `error_message` |
|---|---|
| No credential at all | `"Authentication not provided."` |
| Wrong token/secret | `"Authentication failed."` |

`auth/basic.ts`'s `test` hook (and the derived `auth:basic` health check) classify on that message,
never on the shared status code — see `packages/apps/HEALTHCHECKS.md`'s house rule on this exact
failure mode.

### 3. A bad path 404s into the *web app*, not the API

A request to an undeclared `/api/v1/...` path — a typo, or a resource this client doesn't cover —
does not answer with WhatConverts's `{"error_message": ...}` shape at all. It 404s into the
WhatConverts **web application's** own HTML "Oops! That page couldn't be found." page (confirmed
live). `lib/client.ts`'s error formatter checks the response's content type before trying to parse
it as the API's JSON error envelope, so a routing mistake reports as raw text instead of a
misleading `undefined` error message.

### 4. No rate-limit headers of any kind

WhatConverts documents its ceiling in prose — 10,000 requests/day per key, 1 request/millisecond and
up to 20 concurrent requests — but a live probe on 2026-08-29 confirmed that **neither a successful
nor a 401 response carries any `X-RateLimit-*` or `Retry-After` header.** There is nothing for a
`quota` health check to read, so this app declares none rather than a check permanently reporting
`unknown`.

### 5. The write body format is inferred for three of the four writable resources

Only the **Users** page states its wire format explicitly: "The body of the request must contain a
JSON object with the following fields." Accounts, Profiles and Leads document their `POST`
parameters as a flat table with no stated content type. This app sends `application/json` for every
write, on the strength of the one resource that is explicit and because every response is JSON —
but this is inference for Accounts/Profiles/Leads specifically, not a confirmed fact, and each write
action's own doc comment repeats this caveat.

### 6. Edit and Create share an endpoint for Users

Both `user-create` and `user-update` call `POST /api/v1/users` — WhatConverts distinguishes edit
from create by the presence of `user_id` in the JSON body, not by the path or verb. Setting an
`accounts` entry's `role_id` to `false` is the vendor's own documented way to **revoke** that
account's access, not a value this app treats specially.

## Actions

### Leads

| Action | What it does |
|---|---|
| `leads-list` | Paginated list of leads, with filters for type, status, date range, value, spam/duplicate, source/medium/campaign/content/keyword, and more |
| `lead-get` | A single lead's full attribution, including (Elite plans, on request) AI lead analysis and customer journey |
| `lead-create` | Create a lead of any type — the vendor's ~50-field parameter surface, one param per documented field |
| `lead-update` | Edit a lead's qualification (`quotable`) and dollar-value fields, plus its URL and custom/additional fields |

### Recordings

| Action | What it does |
|---|---|
| `recording-get` | Download a phone call's MP3 recording as base64-encoded bytes. A `phone_call` lead's own `recording`/`play_recording` fields are already direct URLs — this action is for a workflow that needs the audio bytes themselves |

### Accounts, Profiles, Roles, Users — Master Account (agency) Key only

| Action | What it does |
|---|---|
| `accounts-list` / `account-get` | List / fetch agency sub-client accounts |
| `account-create` / `account-update` / `account-delete` | Create, rename, or permanently delete an account (and everything under it) |
| `profiles-list` / `profile-get` | List / fetch profiles under an account |
| `profile-create` / `profile-update` / `profile-delete` | Create, rename, or permanently delete a profile (and everything under it) |
| `roles-list` / `role-get` | List roles; fetch a single role's full `none`/`view`/`edit` permission grid |
| `users-list` / `user-get` | List / fetch users |
| `user-create` / `user-update` | Invite a user or edit its role and per-account access (nested notification/access JSON accepted as `json`-typed params) |

### Tracking

| Action | What it does |
|---|---|
| `tracking-numbers-list` / `tracking-number-delete` | List tracking phone numbers; permanently delete one |
| `tracking-forms-list` / `tracking-form-delete` | List tracked web forms; permanently delete one |

## Not implemented — say so rather than guess

WhatConverts publishes no OpenAPI/Postman document and no endpoints beyond the eight resource pages
listed above (Overview, Accounts, Profiles, Users, Roles, Leads, Recordings, Tracking). Everything
documented on those pages is implemented here. There is no separate "tags" resource, no webhooks
resource, and no documented way to bulk-delete or bulk-edit leads — if a future workflow needs one
of these, it is not something this app can build against undocumented behavior.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | `service` | Reads `status.whatconverts.com`'s Statuspage feed — a genuine, WhatConverts-branded page with components for Dashboard, **API**, Lead Processing, Call Routing, Website, System Outage and Notification Delivery |
| `auth:basic` (derived) | `credential` | Runs `GET /leads?leads_per_page=1` — the narrowest endpoint every credential kind (Profile Key or Master Account Key) can reach — and classifies a 401 by its `error_message`, not its status code |

No `quota` check — see finding 4 above.
