# EmailOctopus

EmailOctopus lists, contacts, custom fields, tags, campaign reports and API-triggered automations,
on the **EmailOctopus v2 API**.

- **Categories** — marketing, email
- **Auth methods** — api-key
- **Actions** — 25
- **Egress allowlist** — `api.emailoctopus.com`
- **Website** — https://emailoctopus.com
- **API docs** — https://emailoctopus.com/api-documentation/v2
- **OpenAPI spec** — the same URL, served as JSON: `GET https://emailoctopus.com/api-documentation/v2`
  returns an **OpenAPI 3.1 document** (133,099 bytes, `info.title: "EmailOctopus v2 API"`,
  `info.version: "2.0.0"`), not an HTML docs shell

Every path, query parameter, request body and response field in this app was read out of that
document on **2026-08-11**, and the live behaviours quoted below were measured against
`api.emailoctopus.com` on the same day. Nothing here is recalled.

## The four things that cost time

### 1. The version is in the HOST, not the path

`servers[0].url` is `https://api.emailoctopus.com` and every path is bare — `/lists`, `/campaigns`,
`/automations/{id}/queue`. There is **no `/v2` segment**. Writing `https://api.emailoctopus.com/v2/lists`
out of habit gets a JSON 404 (`{"detail":"Resource not found."}`), not a redirect.

### 2. v1 still answers, on a different host, with its documentation deleted

| | v1 (legacy) | v2 (this app) |
|---|---|---|
| Host | `emailoctopus.com` (the **website**) | `api.emailoctopus.com` |
| Path | `/api/1.6/lists` | `/lists` |
| Credential | `api_key` **query parameter** | `Authorization: Bearer` **header** |
| Bad-key status | **403** `{"error":{"code":"API_KEY_INVALID"}}` | **401** RFC 7807 |
| Documentation | `/api-documentation/v1` → **404** | `/api-documentation/v2` → OpenAPI JSON |

All four rows measured 2026-08-11. So the v1 surface **outlives its own documentation**: it answers
in a legacy error format that is not RFC 7807, from a different host, with the secret in the query
string. EmailOctopus has published no sunset date that we could find, and the v2 OpenAPI document
contains **zero** `"deprecated": true` entries — v2 is alive and nothing in it is marked for
removal. Nothing in this app touches v1.

**Keys have two generations too.** A key minted before v2 shipped is labelled *legacy* in the
dashboard and is rejected by v2; the vendor's instruction is to generate a new one, which then works
on both versions.

### 3. `tags` is an array on POST and an object on PUT

Same field name, same resource, two different JSON types depending on the verb — straight out of
EmailOctopus's own schema, not an inference:

| Endpoint | Action | `tags` shape |
|---|---|---|
| `POST /lists/{id}/contacts` | `create-contact` | `["vip", "beta"]` — **array of strings** |
| `PUT /lists/{id}/contacts` | `upsert-contact` | `{"vip": true, "old": false}` — **object** |
| `PUT /lists/{id}/contacts/{contactId}` | `update-contact` | `{"vip": true}` — **object** |
| `PUT /lists/{id}/contacts/batch` | `update-contacts-batch` | `{"vip": true}` — **object** |

Sending the wrong one is a 422. The object form is the only one that can express *removal*
(`false` detaches a tag, an unmentioned tag is left alone), which is why the write-through endpoints
use it and the create endpoint does not. Each action's `tags` hint states its own shape, and
`tests/actions/upsert-contact.test.ts` asserts the divergence directly so a future edit cannot
quietly harmonise them.

### 4. The rate-limit headers do not agree with each other

EmailOctopus documents a **token bucket**: 100 tokens, refilled at 10 per second, with remaining
headroom in `X-RateLimit**ing**-Remaining` — not `X-RateLimit-Remaining`, which is what every other
vendor in this pack calls it. And the retry hint on a 429 is `X-RateLimit-Retry-After`: a *different*
prefix, in the same paragraph of the same document. The `quota` check reads the documented spelling
first and the conventional one as a fallback.

Neither header is declared anywhere in the machine-readable part of the OpenAPI document — they
appear only in the prose introduction — and neither was present on the live 401 responses measured
2026-08-11. So the check reports `unknown` when the header is absent rather than inventing a count
from the documented bucket size.

## Auth

**API key**, and only an API key: `components.securitySchemes` in the v2 document holds exactly one
scheme, `api_key`, declared `{ type: "http", scheme: "bearer", in: "header", name: "Authorization" }`.
There is no OAuth flow, no HMAC signature and no per-request signing, so `sign` is a one-line bearer
stamp. Keys are **not scoped** — there is no narrower-credential case a probe could misreport.

Get one at **emailoctopus.com → Developer → API keys**.

### Reading the verdict from the body, never the status code

Two entirely different failures both return **HTTP 401**, and only the body separates them
(measured 2026-08-11):

```
no Authorization header  → {"title":"An error occurred.",
                            "detail":"Full authentication is required to access this resource.",
                            "status":401,"type":"/errors/401"}

bad / revoked key        → {"title":"An error occurred.","detail":"Invalid key.","status":401,
                            "type":"https://emailoctopus.com/api-documentation/v2#unauthorized"}
```

Note that the first `type` is a **relative** path (`/errors/401`) that the spec's own `type` enum
does not list — which is exactly why nothing in this app matches on `type` exactly. `test` reports
the server's `detail` verbatim, distinguishes a 5xx ("EmailOctopus is erroring") from a credential
verdict, and treats a non-JSON body as a request that never reached the API. A 200 that is not the
documented `{ data: [...] }` shape is a **failure**, not a pass.

### What is deliberately not implemented

- **No `afterConnect` connection label.** The v2 API publishes no account, user or whoami endpoint —
  `/lists` and `/campaigns` are the only two collections reachable without already knowing an id.
  There is no account name or email to label a connection with, and naming a connection after its
  first list would be a guess that goes stale on the next rename.

## Actions

25 actions — one per operation in the v2 OpenAPI document, across its six tags.

| Resource | Action | Endpoint |
|---|---|---|
| List | `list-lists` | `GET /lists` |
| List | `get-list` | `GET /lists/{list_id}` |
| List | `create-list` | `POST /lists` |
| List | `update-list` | `PUT /lists/{list_id}` |
| List | `delete-list` | `DELETE /lists/{list_id}` |
| Contact | `list-contacts` | `GET /lists/{list_id}/contacts` |
| Contact | `get-contact` | `GET /lists/{list_id}/contacts/{contact_id}` |
| Contact | `create-contact` | `POST /lists/{list_id}/contacts` |
| Contact | `upsert-contact` | `PUT /lists/{list_id}/contacts` |
| Contact | `update-contact` | `PUT /lists/{list_id}/contacts/{contact_id}` |
| Contact | `delete-contact` | `DELETE /lists/{list_id}/contacts/{contact_id}` |
| Contact | `update-contacts-batch` | `PUT /lists/{list_id}/contacts/batch` |
| Field | `create-field` | `POST /lists/{list_id}/fields` |
| Field | `update-field` | `PUT /lists/{list_id}/fields/{tag}` |
| Field | `delete-field` | `DELETE /lists/{list_id}/fields/{tag}` |
| Tag | `list-tags` | `GET /lists/{list_id}/tags` |
| Tag | `create-tag` | `POST /lists/{list_id}/tags` |
| Tag | `update-tag` | `PUT /lists/{list_id}/tags/{tag}` |
| Tag | `delete-tag` | `DELETE /lists/{list_id}/tags/{tag}` |
| Campaign | `list-campaigns` | `GET /campaigns` |
| Campaign | `get-campaign` | `GET /campaigns/{campaign_id}` |
| Campaign | `list-campaign-reports` | `GET /campaigns/{campaign_id}/reports` |
| Campaign | `get-campaign-links-report` | `GET /campaigns/{campaign_id}/reports/links` |
| Campaign | `get-campaign-summary-report` | `GET /campaigns/{campaign_id}/reports/summary` |
| Automation | `start-automation` | `POST /automations/{automation_id}/queue` |

### Notes worth having before you use them

- **A contact can be addressed by the MD5 of its lowercased email.** `contact_id` accepts the UUID
  *or* that hash — the spec's own example is a hash. That is the documented email lookup, because
  the contacts collection has no `?email_address=` filter. This app does not compute the hash for
  you (no crypto in the action sandbox, and it would be guessing at the normalisation); pass
  whichever identifier you hold.
- **`update-contacts-batch` returns failures inside a 200.** The body is
  `{ success: [...], errors: [...] }` with per-item outcomes, each error carrying its own `id`,
  `status` and RFC 7807 `type`. A caller that checks only the HTTP status silently drops them, so
  the action also returns an `errorCount`. There is no batch *create*: every item requires an `id`.
- **`list-campaign-reports` requires `status`.** There is no combined engagement feed; one call
  answers one question (`opened`, `not-clicked`, `bounced`, …) and returns the contacts in that
  bucket. Omitting it is a 400. The negatives (`not-opened`, `not-clicked`) are computed by
  EmailOctopus, so there is no need to fetch `sent` and subtract.
- **The links report is the one collection that is not paginated** — a bare `{ data: [...] }` with
  no `paging` envelope and no `limit` parameter.
- **The summary report nests its counters.** `bounced` is `{hard, soft}`, `opened` and `clicked` are
  `{total, unique}`; `sent`, `complained` and `unsubscribed` are plain integers.
- **Tags are scoped to a list**, not to the account — there is no `/tags` collection. Creating a tag
  only *defines* it; attaching it to a contact goes through the contact update endpoints.
- **Deleting a contact is not unsubscribing it.** `delete-contact` erases the record and its
  history; to stop mailing someone but keep the record, set `status` to `unsubscribed`.

### What the v2 API does not offer, so this app does not either

- **No campaign writes.** There is no create, update, send, schedule or test-send endpoint for a
  campaign anywhere in the v2 document. Campaigns are read-only here.
- **No automation list or get.** `POST /automations/{id}/queue` is the only automation operation, so
  the automation id has to come from the EmailOctopus dashboard URL. The automation must also use the
  **"Started via API"** trigger type, and a contact can only be queued once unless *"Allow contacts
  to repeat"* is enabled — which is why `start-automation` declares `idempotent: false`, since
  whether a retry is a no-op or a second run depends on a setting this app cannot read.
- **No way to edit a choice field's options.** `POST /lists/{id}/fields` takes a two-variant `oneOf`
  and `choices` belongs to the `choice_single | choice_multiple` branch, but the **request** schema
  for `PUT /lists/{id}/fields/{tag}` is only the `text | number | date` variant (the *response* is
  still the two-variant `oneOf`). So `update-field` exposes no `choices` parameter rather than
  guessing at one. `update-field` is also a genuine replace: `label`, `tag` and `type` are all
  required, so omitting `label` on a rename wipes it. The `tag` in the path is the current name; the
  `tag` in the body is what it becomes.
- **No triggers/webhooks.** The v2 document declares no webhook subscription endpoint, so this app
  ships no `TriggerDefinition`.

## Pagination

Every collection except the links report uses the same cursor envelope:

```json
{
  "data": [ ... ],
  "paging": {
    "next": {
      "url": "https://api.emailoctopus.com/lists/{id}/contacts?starting_after=WyIyMDI0…&limit=100",
      "starting_after": "WyIyMDI0…"
    }
  }
}
```

Each paginated action takes `limit` (server default **and** documented maximum: 100) and
`startingAfter`. To walk forward, pass the previous response's `paging.next.starting_after`
verbatim — **`paging.next` is absent on the last page**, and that absence, not an empty `data`
array, is how you know to stop. EmailOctopus documents the cursor's contents as subject to change,
so never take it apart.

## Health checks

Four separate questions, kept apart on purpose.

### Is the vendor up? — `service`

```
GET https://status.emailoctopus.com/api/v2/summary.json
```

The page is real, checked three ways on 2026-08-11:

**(a) Not a catch-all** — four sibling paths, three distinct answers:

| Path | Status | Bytes | md5 (first 12) |
|---|---|---|---|
| `/api/v2/summary.json` | 200 | 430 | `28f78236ddfa` |
| `/api/v2/status.json` | 200 | 214 | `41818d91d178` |
| `/api/v2/components.json` | 200 | 218 | `f516c966c647` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | — |

**(b) It describes this product** — `"page": {"name": "EmailOctopus", "url":
"https://status.emailoctopus.com/"}`, and the Atom feed titles itself "EmailOctopus status".

**(c) It is incident.io, not Atlassian** — `server: Vercel`, `x-matched-path:
/[slug]/api/v2/[endpoint]`, `<generator>incident.io</generator>` in the feed, and ULID ids
(`01KAV9NP…`) rather than Statuspage's base-32. It implements the Statuspage v2 *shape*, with two
differences that matter:

1. **`summary.json` has no `incidents` and no `scheduled_maintenances` key at all.** The live body is
   exactly `{ page, status, components }` — reading `body.incidents.length` would throw, so every
   access in the check is optional.
2. **The history feed is empty.** `/history.atom` is a well-formed 518-byte Atom document with zero
   `<entry>` elements; the page was created 2025-11-24 and has recorded no incidents since. There is
   nothing for a `feed:` declaration to read, which is why this is a JSON fetch and not a
   feed-backed check.

**What this page does *not* say.** It publishes **one** component, named `Platform`. There is no
separate `API`, `Sending` or `Dashboard` row, so it is a whole-product rollup and cannot distinguish
"the API is down" from "the dashboard is down". That is the reason for the next check.

### Is the API reachable? — `api`

```
GET https://api.emailoctopus.com/lists        (no credential)
```

Because the status page has no API component, this probes the host actions actually call. It sends
**no credential**, so the correct healthy answer is an authentication error — a *schema-correct*
RFC 7807 401 proves DNS resolves, TLS completes and the application behind the edge is processing
requests. The pass condition is deliberately not the status code but the body shape: a 200, an HTML
body, or a 5xx all fail it. (This host does not serve generic 200s — an unknown path returns a JSON
404, measured the same day.) Whether any given key is good is the derived `auth:api-key` check's
job; conflating the two is how "your token expired" gets reported as an outage.

### Is this credential live? — `auth:api-key` (derived)

```
GET /lists?limit=1
```

The Auth `test` hook, projected into the health surface for free. Chosen because there is no whoami
in v2, it genuinely requires the credential (401 unauthenticated, measured), it echoes nothing
secret, and EmailOctopus keys are unscoped so it cannot report a working key as broken. It is also
the endpoint the vendor's own "check your key works" curl example uses.

### Do we have quota left? — `quota`

```
GET /lists?limit=1        (signed)
```

Reads `X-RateLimiting-Remaining` — see §4 above for the spelling trap — and reports it against the
documented bucket size of 100, deriving `resetAt` from the documented 10-per-second refill because
EmailOctopus sends no reset timestamp. A 429 is reported `down` using `X-RateLimit-Retry-After`. When
no counter comes back the check reports **`unknown`** rather than inventing a number from the
published constant, which would be wrong the moment anything else shares the credential.

### Declared checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `api` | dependency | app | none | degraded | 60s | `health/api.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` `test` hook |

`status.emailoctopus.com` is reachable **only inside the `service` hook's worker** — it is not on
`w6w.network.allow`, so no action can reach it. The spec permits that widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host. The `api` and `quota` checks declare no extra hosts at
all: `api.emailoctopus.com` is already the app's own egress host.

## Development

```bash
deno task validate   # manifest + sandbox conformance (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt
deno task test       # 122 unit tests, mocked HookContext, no network
```

## Links

- **Vendor site** — https://emailoctopus.com
- **API v2 documentation / OpenAPI JSON** — https://emailoctopus.com/api-documentation/v2
- **API keys** — https://emailoctopus.com/developer/api-keys
- **Status page** — https://status.emailoctopus.com
- **Icon** — https://emailoctopus.com/favicon.svg, downloaded verbatim to `assets/icon.svg`
  (4,407 bytes, `image/svg+xml`, md5 `26d5a7d3d0cfcc3abf34b54710c66574`). It carries `light-icon` /
  `dark-icon` groups switched by a `prefers-color-scheme` `<style>` block; that is the vendor's own
  file, unmodified — `deno task fmt` never touches `assets/`.

---

Researched and endpoint-verified against EmailOctopus's live v2 OpenAPI document and the live API on
2026-08-11. Status surfaces move: if `service` starts failing for everyone at once, re-check whether
incident.io still serves the Statuspage v2 shape before touching anything else.
