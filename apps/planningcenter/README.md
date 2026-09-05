# Planning Center

Search, read and create People directory records, list donations, scheduled event occurrences and
attendance check-ins — over [Planning Center's](https://www.planning.center/) own JSON-API-conformant
REST APIs.

- **API**: `https://api.planningcenteronline.com`, one path prefix per product (`/people/v2`,
  `/calendar/v2`, `/giving/v2`, `/check-ins/v2`, `/current/v2`)
- **Auth**: Personal Access Token — HTTP Basic, `client_id` as the username, `secret` as the password
- **Actions**: 6 · **Health checks**: `service` · `quota` · 1 derived (`auth:personal-access-token`)

Everything below was verified on **2026-09-05** against Planning Center's own machine-readable
OpenAPI documents — fetched live from `https://api.planningcenteronline.com/{product}/v2/open_api/{version}`
for People (`2026-06-04`), Calendar (`2026-06-22`), Giving (`2019-10-18`), Check-Ins (`2025-05-28`)
and Current (`2018-08-01`) — plus the hand-written guides at `api.planningcenteronline.com/docs/`
(Getting Started, Authentication, Rate Limiting, JSON-API, Errors) and live probes against
`api.planningcenteronline.com` and `status.planningcenter.com`. Nothing came from a marketing page or
a third-party integration directory.

## Is the API alive?

Yes. The docs' own "Staying Up-to-date" section states Planning Center avoids breaking changes and
announces the rare ones via an API News mailing list — there is no sunset notice, no deprecated major
version, and grepping every fetched OpenAPI document plus every guide page for
`deprecat|sunset|will be removed|end of life|discontin` returns no hits about the platform or about
any endpoint this app calls.

## Findings that would cost someone a day

### 1. `Event` has no date. `EventInstance` does.

The Calendar API's `Event` resource is a container — a name, an approval status, a Church Center
visibility flag — with **no start or end time at all** (verified against the live `event_attributes`
schema: it has no date-typed field). A recurring event is one `Event` with many `EventInstance`
children, and only `EventInstance` carries `starts_at`/`ends_at`. Reaching for `GET /events` expecting
a schedule back returns date-less containers and nothing to explain why. `list-event-instances`
therefore reads `/event_instances` directly, never `/events`.

### 2. The Personal Access Token order is the *opposite* of a sibling app in this pack

Planning Center's own security scheme (`securitySchemes.personal_access_token` in every product's
OpenAPI document) states: "Provide your Personal Access Token Client ID as the HTTP Basic username
and your Secret as the HTTP Basic password" — `Authorization: Basic base64(client_id:secret)`, the
CONVENTIONAL order. That is worth stating plainly because this pack also ships Azure DevOps, whose
PAT goes in the password half with an **empty** username — copying that shape here silently
authenticates as nobody.

### 3. A 401 for "no credential" and a 401 for "wrong credential" are byte-identical

Measured live against `GET /current/v2/me`: no `Authorization` header at all, and a
syntactically-valid-but-wrong `client_id:secret` pair, both come back `401` with an **empty body**
(`content-length: 0`, `content-type: text/html`). There is nothing in the body to classify a rejected
credential by — unlike some other apps in this pack, where the vendor's error body distinguishes "no
credential" from "wrong credential". Planning Center's own Errors guide already gives 401 one
unambiguous meaning ("You did not use the proper API token and/or secret"), so
`lib/client.ts#classifyAuthFailure` reads the STATUS for that reason alone, and `auth/`'s `test` hook
does the same rather than trying to parse a body that is never there.

### 4. `Person.primary_email_address` is documented but not requestable the way it looks

The `Person` schema lists `primary_email_address` with the note "Only available when requested with
the `?fields` param" — but that attribute is **not** one of the values Planning Center's own OpenAPI
document enumerates as legal for `fields[Person]` (checked against the live
`person_renderable_attributes_enum`). Rather than send a parameter this app cannot verify keeps
working, `get-person` reads the email the fully-documented way instead: `?include=emails`, which
returns real `Email` resources (with their own `primary` flag) in the response's `included` array.
`list-people` does not surface email at all, for the same reason.

### 5. The real status page is a redirect away from the obvious guess

`status.planningcenteronline.com` — the domain anyone would type from the API host — 302s to
`status.planningcenter.com`, which is the real, currently-live Statuspage instance (`page.name:
"Planning Center"`, with a named `API` component plus one component per product). `health/service.ts`
follows that redirect once at verification time and calls the resolved host directly, checked
specifically for the `API` component id rather than the page's worst indicator (a Church Center outage
this app has no action touching would otherwise flip the whole App status).

### 6. Amounts are cents; date filters use a nested bracket, not `_gte` suffix

`Donation.amount_cents` is an integer in the organization's own currency (`amount_currency`) — never
divide by 100 without checking that field, since a zero-decimal currency exists. Separately, every
date-range filter across every product renders as **`where[attr][gte]`**, a nested bracket
(`donation_where_received_at_gte_parameter` literally names itself `"where[received_at][gte]"`), not
the flatter `where[attr_gte]` a first guess might reach for. `lib/client.ts`'s `where` option accepts
either shape and renders the nested form when given an operator object.

### 7. Check-Ins carries real PII the same call — deliberately not returned

`CheckIn.emergency_contact_name`, `emergency_contact_phone_number` and `medical_notes` are real,
documented attributes on the same resource `list-check-ins` reads, most often populated for
children's check-in. A workflow step's result is persisted in run history and routinely echoed into
logs and previews, so this action does not surface that trio by default — see `actions/list-check-ins.ts`.

## What this app does

- **People** — `list-people` (search by name/email/phone, filter by status), `get-person` (profile +
  primary email via `?include=emails`), `create-person` (first/last name, birthdate, gender).
- **Giving** — `list-donations` (date range, fund filter; amounts in cents).
- **Calendar** — `list-event-instances` (actual scheduled occurrences, with real start/end times).
- **Check-Ins** — `list-check-ins` (attendance records; emergency-contact and medical-notes fields
  withheld — see finding 7).

## What is deliberately missing

- **Email/phone as their own resources.** Adding, updating or removing an `Email`, `PhoneNumber` or
  `Address` is its own JSON-API resource with its own endpoints (or the create request's `included`
  array) — a second surface this app does not take on. `get-person` only *reads* the primary email.
- **OAuth2.** Planning Center supports OAuth2 for apps distributed across multiple churches, but
  registering that OAuth application is an out-of-band, by-hand approval Planning Center issues per
  organization — not a config value this package can carry. This app ships the Personal Access Token
  scheme only, which the vendor's own docs describe as the right choice for "an integration or tool
  for a single church".
- **Donation fund splits.** A single `Donation` can be designated across several funds via its own
  `Designation` resources; `list-donations` reports the donation total, not the per-fund breakdown.
- **Webhooks, Services, Groups, Publishing, Registrations.** Real, documented product APIs this app
  does not touch at all — a deliberate scope cut, not a gap found and left unstated.

## Health checks

- **`service`** — Planning Center's real Statuspage instance (`status.planningcenter.com`, reached via
  the `status.planningcenteronline.com` redirect — see finding 5), read for the `API` component only.
- **`quota`** — `X-PCO-API-Request-Rate-Limit` / `-Count` / `-Period`, read off the same
  `/current/v2/me` call the Auth `test` hook makes. Declared `informational`: the Rate Limiting guide
  states limits "can be adjusted dynamically at any time and without prior notice", so this is
  headroom to watch, not a verdict to fail an App on.
- **`auth:personal-access-token`** (derived) — `GET /current/v2/me`, chosen because the guide states it
  explicitly works "without requiring any scopes and without imposing any access or permission rules"
  beyond being a valid credential — the narrowest possible probe across every product this app touches.
