# JustCall

Read and manage calls, texts, contacts, phone numbers, users and webhook subscriptions on the
**JustCall API v2.1** — a cloud phone system and SMS/calling platform.

- **Categories** — communication, crm
- **Auth methods** — api-key (API Key + Secret)
- **Actions** — 21
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.justcall.io` (the `service` check adds `status.justcall.io` to its
  own hook allowlist, never to the app's)
- **Website** — https://justcall.io/
- **API docs** — https://developer.justcall.io/reference/authentication
- **Status page** — https://status.justcall.io/

> **Everything below was verified against JustCall's own sources on 2026-09-05** — the per-endpoint
> OpenAPI 3.0 fragment embedded in each `developer.justcall.io/reference/*` page this app covers,
> the guide pages under `developer.justcall.io/docs/*`, and live probes against `api.justcall.io`
> and `status.justcall.io`. JustCall publishes **no single combined OpenAPI document** — every
> reference page ships its own `paths` + `components.schemas` fragment (append `.md` to any
> reference URL to fetch it), so each endpoint here was read from its own page rather than inferred
> from a sibling or from marketing copy.

## The three things most likely to cost someone a day

### 1. The credential looks like HTTP Basic auth. It is not.

The vendor's own security scheme description: *"The API key can be put in the Authorization header.
i.e `Authorization: api_key:api_secret`. If you use cURL, specify `-u "api_key:api_secret"`."*

That `-u` flag is what curl uses for HTTP **Basic** auth — but Basic auth **Base64-encodes** the
`user:pass` pair before sending it (`Authorization: Basic <base64(...)>`), and JustCall's header has
**no `Basic ` prefix and no encoding**: the literal `api_key:api_secret` string goes on the wire
unmodified. Declaring this as `type: "basic"` in an integration framework — or reaching for a
library's Basic-auth helper — sends the wrong header and JustCall rejects it. This app declares
`type: "custom"` and builds the header itself; see [`auth/api-key.ts`](auth/api-key.ts).

### 2. The response envelope is not one shape

Reading the vendor's own per-endpoint `components.schemas` blocks (not just the prose) turned up
three, arguably four, different response shapes across the endpoints this app covers:

| Shape | Endpoints |
| --- | --- |
| `{status, data: [...], count, current_page, per_page, next_page_link, prev_page_link}` | `GET /contacts`, `GET /phone-numbers`, `GET /texts` |
| `{status, data: {...}}` | `GET /contacts/{id}` |
| `{status, data: [{...}]}` — **an array containing the one object** | `POST /contacts`, `PUT /contacts` |
| `{status}` — no `data` at all | `DELETE /contacts`, `PUT /contacts/status`, `PUT /users/availability` |
| The item's own schema, no visible envelope | `GET /calls`, `GET /calls/{id}`, `PUT /calls/{id}`, `GET /texts/{id}`, `POST /texts/new`, `POST /texts/checkreply`, `GET /users`, `GET /users/{id}` |

The last row is the one this app could not confirm live — this app has no test account, so it
cannot tell whether that's a genuine difference from the contacts/phone-numbers family or an
artefact of how the reference site's OpenAPI-fragment generator handles some endpoints (the same
`UsersResponseDTO` schema, which is clearly a *single user's* fields, is named as the response for
both `GET /users` — a list — and `GET /users/{id}` — one record, which is itself a strong hint the
generator reused the item schema rather than describing the list). Rather than guess, the client
([`lib/client.ts`](lib/client.ts)) unwraps `{status, data}` when present and returns the body
unchanged otherwise, and every action documents which family its own endpoint's schema showed.

The one-element `data` array on create/update is real and easy to miss: `contact-create` and
`contact-update` unwrap it (`unwrapOne` in `lib/client.ts`) so a workflow author gets the one
contact object back, not a one-item array.

### 3. JustCall's error body does not distinguish a missing credential from a wrong one

Measured live against `GET /v2.1/users` on 2026-09-05, both fully unauthenticated **and** with a
syntactically plausible but fabricated key/secret pair:

```
HTTP/2 401
{"status":"failed","message":"Unauthorized"}
```

Identical in both cases. Several other apps in this pack can tell a caller "the credential never
reached the request" apart from "the credential was rejected" because their vendor's error body
names the difference; JustCall's does not, so `auth/api-key.ts`'s `test` hook says exactly that
rather than inventing a distinction the API doesn't make.

## Auth

One method: `api-key`, type `custom` (see finding 1 above for why not `basic`).

### The probe is `GET /v2.1/users?per_page=1`

JustCall's reference index has **no dedicated ping or whoami page at all** — there is no `/me`,
`/ping`, or `/status` endpoint documented anywhere in the ~90 pages this app's reference index
lists. `GET /users?per_page=1` was chosen as the cheapest **always-reachable, always-documented**
read: it needs no path parameter, no resource id, and no permission narrower than "this key can call
the API." `per_page=1` caps the page at one record.

**This app never returns the probe's response body.** `test` reports only `ok`/`message` — the
account's other users' names and emails are read to classify liveness and then discarded.

## Actions

21 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `call-list` | search | `GET /v2.1/calls` |
| `call-get` | read | `GET /v2.1/calls/{id}` |
| `call-update` | perform | `PUT /v2.1/calls/{id}` |
| `contact-list` | search | `GET /v2.1/contacts` |
| `contact-get` | read | `GET /v2.1/contacts/{id}` |
| `contact-create` | perform | `POST /v2.1/contacts` |
| `contact-update` | perform | `PUT /v2.1/contacts` |
| `contact-update-status` | perform | `PUT /v2.1/contacts/status` |
| `contact-delete` | perform | `DELETE /v2.1/contacts` |
| `phone-number-list` | search | `GET /v2.1/phone-numbers` |
| `phone-number-get` | read | `GET /v2.1/phone-numbers/{id}` |
| `text-list` | search | `GET /v2.1/texts` |
| `text-get` | read | `GET /v2.1/texts/{id}` |
| `text-send` | perform | `POST /v2.1/texts/new` |
| `text-check-reply` | read | `POST /v2.1/texts/checkreply` |
| `user-list` | search | `GET /v2.1/users` |
| `user-get` | read | `GET /v2.1/users/{id}` |
| `user-update-availability` | perform | `PUT /v2.1/users/availability` |
| `webhook-list` | search | `GET /v2.1/webhooks` |
| `webhook-create` | perform | `POST /v2.1/webhooks` |
| `webhook-delete-url` | perform | `DELETE /v2.1/webhooks/url/{url_id}` |

### Idempotency

JustCall documents **no dedupe/idempotency key of any kind** on `contact-create`, `text-send` or
`webhook-create` — a retry of any of these creates a second real object: a duplicate contact, a
second SMS actually sent to the recipient, or a second webhook subscription. All three are
`idempotent: false`.

`call-update`, `contact-update`, `contact-update-status`, `user-update-availability` and
`webhook-delete-url` are `idempotent: true` — each is documented as a full replace, a list
add/remove (already a no-op the second time), or a delete whose end state doesn't change with
repetition.

### Notes on individual actions

- **`call-update` and `contact-update` address their target differently.** `call-update`'s id is a
  **path** parameter (`/calls/{id}`); `contact-update`'s id is a **body** field against the bare
  `/contacts` collection — sending `contact_number` without `id` addresses the contact by number
  instead, per the vendor's own note.
- **`contact_number` is typed as a JS number in some places and a string in others**, straight from
  the vendor's own schema — `call-list`'s `contact_number` filter and `justcall_number`/`ivr_digit`
  are documented `type: number` (so a leading `+` must be omitted), while `text-send`'s
  `contact_number`/`justcall_number` are documented `type: string` and **must** be E.164
  (`+`-prefixed). This app follows each endpoint's own documented type rather than normalising them
  to look the same.
- **`phone-number-list`'s `order` enum is uppercase** (`ASC`/`DESC`) — every other list action in
  this app (`call-list`, `contact-list`, `text-list`, `user-list`) documents lowercase `asc`/`desc`.
  Sent verbatim per endpoint rather than normalised, since normalising would silently break the one
  endpoint that wants uppercase.
- **`text-send`'s `media_url` is one comma-joined string**, not a JSON array — up to 10 public URLs,
  5 MB cumulative, from a fixed MIME allowlist the vendor documents in full.
- **List pagination defaults and maximums vary per endpoint** and are not one house style:
  `calls`/`texts` default 20/max 100, `contacts` default 50/max 500, `phone-numbers` default 30/max
  100, `users` default 50/max 100. Each list action's `per_page` param states its own endpoint's
  documented default and max rather than a single assumed value.
- **`call-list` history is retained for the last 3 months** via this endpoint per the vendor's own
  note; a one-time full export requires contacting JustCall directly.
- **Ordinary reads carry no live-credential leak** — unlike some vendors in this pack (Apify's proxy
  password, for instance), nothing in JustCall's documented response schemas for the endpoints this
  app covers returns a working secret. No action here needs to strip a field for that reason.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — status.justcall.io, and it names the API as its own component

Checked three ways on 2026-09-05: a nonsense sibling path 404s while `/api/v2/summary.json`
answers 200 with 9,860 bytes of the Statuspage v2 schema, `justcall.statuspage.io/api/v2/summary.json`
answers with the **identical `page.id`** (confirming the same page under its Statuspage-native
host), and the page's own components are JustCall's own — 25 of them, including a component
genuinely named **`Developer APIs`**, plus `Authorization` and `Webhooks`. This is one of the few
status pages in this pack that names the REST API as its own component rather than folding it into
a generic "API" or omitting it.

The page mixes JustCall's own services with third-party dependencies grouped under `Third-Party`
(Filestack, OneSignal) and `Integrations` (CRM/help-desk sync partners). Those are reported, but the
verdict comes from `status.indicator` (JustCall's own roll-up), never the worst component, so a bad
day at one integration partner doesn't report the whole platform down.

Severity is left at the `degraded` default: JustCall is SaaS-only, so every Connection this app can
hold runs on exactly the infrastructure this page describes.

### `quota` — real, documented rate-limit headers, read defensively

`docs/rate-limits.md` documents six response headers across two independent windows: hourly
(`X-Rate-Limit-{Limit,Remaining,Reset}`) and per-minute burst
(`X-Rate-Limit-Burst-{Limit,Remaining,Reset}`), with ceilings that vary by plan (1,800/hr + 30/min on
Team, up to 5,400/hr + 90/min on Business/SalesPro).

**What could not be confirmed live:** this app has no test account, so these headers were only
probed unauthenticated and with a fabricated credential (2026-09-05) — both answered `401` with
**neither header pair present**. Since a real `200` response was never observed, the check treats a
response carrying neither pair as `unknown` rather than as "zero quota" — reporting `down` from an
absent header would be one bad guess away from paging someone over a header this app never actually
saw work. The check reuses the auth probe's own `GET /users?per_page=1` call rather than spending a
second request.

An exhausted **hourly** window is `down` (the account is locked out for up to an hour); an exhausted
**burst** window is only `degraded` (it recovers within a minute on its own — a queue, not an
outage). Either window at or below 10% remaining is `degraded` with the window named.

## Deliberately not covered

JustCall's reference index lists roughly 90 endpoints. This app covers 21 — calls, contacts, phone
numbers, texts, users and webhooks — chosen as the core of a calling/SMS-driven workflow. Left out,
and why:

- **Sales Dialer** (calls, campaigns, contacts, analytics — ~15 endpoints) — a separate outbound
  dialing product with its own contact/campaign model, distinct from JustCall's own Contacts and
  from the calls this app already covers.
- **RCS and WhatsApp messaging** (senders, templates, send, list — ~14 endpoints) — separate
  messaging channels with their own template/approval model, additive scope beyond core SMS.
- **AI Voice Agents** (`list_voice_agents`, `initiate_outbound_call`) — a distinct product surface
  for AI-driven outbound calling, not the human-agent calling this app covers.
- **Call/Sales Dialer AI data and meeting AI data** (`call_ai_*`, `meeting_ai_*`) — read-only
  analysis surfaces layered on top of calls this app can already fetch by id.
- **Appointments and available slots** — calendar scheduling, a separate feature area from
  calling/texting.
- **Special dates, tags, threads, SMS groups, user groups** — configuration and organisation
  surfaces around the core call/text/contact/user objects this app covers; genuinely useful, and
  left out only for scope.
- **Account/agent/number analytics** (`call_account_analytics`, `call_agent_analytics`,
  `call_number_analytics`) — aggregate reporting endpoints, additive scope beyond record-level
  reads.
- **Bulk contact blacklist/DND/DNM** (`bulk_add_contacts_to_blacklist`, `list_blacklist_contacts`) —
  the single-contact form (`contact-update-status`) is covered; the bulk form is left for a
  follow-up.
- **Incoming-number detection** (`phone_number_detect`) — the vendor's own note says this requires
  emailing `dev@justcall.io` to enable per account and may carry additional charges; not something
  every Connection can reach by default.
- **`GET /reference/contacts`** — the reference index links a page literally titled "Coming Soon."

Nothing was left out because it could not be confirmed: every endpoint above is named in the
vendor's own reference index and was read there.

## Icon

`assets/icon.svg` is JustCall's own mark. JustCall's `favicon.ico` is a raster bitmap (32×32,
MS icon format) with no vector counterpart published at `/favicon.svg`, so the glyph was isolated
from JustCall's combined logo lockup instead:
`https://cdn.justcall.io/assets-marketing/images/svg/justcall-logo-black.svg` (fetched 2026-09-05,
131×45 viewBox, 10 `<path>` elements — a compact interlocking-circles glyph followed by six
wordmark letterform paths). The **first four `<path>` elements** (the glyph; colour `#101828`) were
kept byte-for-byte; the six wordmark letterform paths were dropped. `_tools/icon-normalize.ts` then
re-framed the isolated glyph onto the pack's shared `0 0 100 100` canvas, nesting the original
artwork verbatim inside a re-scaled inner `<svg>` rather than touching the path data. A test asserts
the vendor colour, one pinned path's geometry, and the exact count of four `<path>` elements, so a
redraw or a future re-inclusion of wordmark paths fails the suite.

The mark's near-black `#101828` ink fails legibility on the pack's dark tile (`_tools/icon-legibility.ts`:
ΔE 7.82, contrast 1.13 against `#1f232c`). `assets/icon.dark.svg` is the same geometry reversed to
white (`#ffffff`) — the "reversed mark" treatment the tool generates automatically for a
single-colour logo, declared via `appearance.darkMode.icon` in `package.json`.

## Layout

```
justcall/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # JustCallClient, envelope unwrapping, error formatting, rate-limit headers
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-key.ts               # custom key:secret pair: sign, test
├── actions/                      # one file per action (21)
├── health/
│   ├── service.ts                # status.justcall.io
│   └── quota.ts                  # rate-limit headroom, signed
├── assets/
│   ├── icon.svg                   # vendor mark, isolated + normalized
│   └── icon.dark.svg              # reversed-to-white variant for the dark tile
└── tests/                        # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
