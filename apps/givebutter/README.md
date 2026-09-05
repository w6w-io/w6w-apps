# Givebutter

Manage campaigns, contacts (donor CRM), transactions, funds, households, recurring plans, tickets,
payouts, outbound messages and webhooks on **Givebutter**, the nonprofit fundraising platform, over
the **Givebutter API v1**.

- **Categories** — crm, commerce, communication
- **Auth methods** — api-key
- **Actions** — 43
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.givebutter.com` (the `service` check adds `givebutter.statuspage.io` to
  its own hook allowlist, never to the app's)
- **Website** — https://givebutter.com/
- **API docs** — https://docs.givebutter.com/api-reference/authentication
- **OpenAPI** — https://givebutter.com/docs/api.json
- **Status page** — https://givebutter.statuspage.io/

> **Everything below was verified against Givebutter's own sources on 2026-09-05** — its
> machine-readable OpenAPI 3.1 document
> ([`givebutter.com/docs/api.json`](https://givebutter.com/docs/api.json), 536,523 bytes,
> `info.title` "Givebutter API Documentation"), the `docs.givebutter.com` pages it links, and live
> probes against `api.givebutter.com`. That OpenAPI document is reached via the `openapi` link on
> `docs.givebutter.com`'s `llms.txt` index — the Mintlify-hosted decoy that usually lives at
> `docs.givebutter.com/api-reference/openapi.json` (Mintlify's own bundled sample spec) 404s on this
> site instead, so there was no decoy to filter out here, but the real spec still lives on a
> different host (`givebutter.com`, not `docs.givebutter.com`) than the reference pages that link it.
> Nothing here came from a third-party integration directory or from `docs.givebutter.com/widgets/*`
> (the JS-embed donation-button docs, a different surface entirely).

## The four things most likely to cost someone a day

### 1. The docs' own error shape isn't the one on the wire

Every response schema in the OpenAPI document (`AuthenticationException`, `AuthorizationException`,
`ModelNotFoundException`, `NotFoundHttpException`) and both the `/api-reference/authentication` and
`/api-reference/errors` docs pages show a flat body:

```json
{ "message": "Unauthenticated." }
```

A live unauthenticated (or garbage-token) request instead answers:

```
$ curl https://api.givebutter.com/v1/campaigns
{"error":{"message":"Unauthorized"}}
```

— nested under `error`, and with different prose ("Unauthorized", not "Unauthenticated."). This
isn't a one-off: `DELETE /v1/campaigns/{campaign}`'s own documented `409` response schema shows the
**nested** shape too — Givebutter's own docs disagree with themselves about which shape is real, and
only the nested one was ever observed live. [`lib/client.ts`](lib/client.ts)'s
`formatGivebutterError` reads `error.message` first and falls back to a flat `message`, so it copes
with either. The `errors` (per-field 422 validation) object the docs describe was not independently
confirmed live — that requires a real API key to trigger — so treat that specific shape as
documented-but-unverified.

### 2. A nonexistent resource id doesn't get a JSON 404 — it gets the marketing site

This is easy to misdiagnose as "ids must be numeric", and that is **not** what's happening — checked
carefully, unauthenticated, across every resource this app covers:

| Request                                    | Status | Content-Type       |
| ------------------------------------------- | ------ | ------------------- |
| `GET /v1/campaigns/does-not-exist`          | 404    | `text/html` (Webflow's branded 404 page) |
| `GET /v1/campaigns/999999999999` (numeric!) | 404    | `text/html` — identical page |
| `GET /v1/campaigns/12345`                   | 401    | `application/json`  |
| `GET /v1/campaigns/1`                       | 401    | `application/json`  |

A syntactically-plausible but non-existent numeric id gets the *same* branded HTML 404 a garbage
slug gets, while a small, real id reaches the JSON-answering API and correctly reports 401 for a
missing credential. Bisecting live confirmed the boundary for campaigns sits between id 100,000 and
200,000 — below it, id after id answers 401 (a row exists, unauthenticated); above it, every id
answers the marketing 404 (no such row, full stop). The same shape held for `/v1/contacts`,
`/v1/pledges` and `/v1/messages` — the other resources with real rows near the low end of the id
space. This is consistent with route-model binding resolving the row **before** the auth middleware
runs, checked against the whole system rather than the caller's own org, so a not-found id never
reaches the code path that would emit a JSON error at all.

**The practical upshot:** there is no way to tell "wrong id" from "right id, no permission" purely
from the wire, and getting an id's *format* right (numeric where Givebutter documents `integer`)
does not protect against a merely nonexistent id — that still returns unparseable HTML. See
[`lib/client.ts`](lib/client.ts) and [`lib/params.ts`](lib/params.ts) (`numericIdParam` vs `idParam`)
for the full writeup and per-resource id-shape table.

### 3. The Rate Limits doc page is wrong

`docs.givebutter.com/api-reference/rate-limits` states: *"The Givebutter API is rate limited to 500
requests per minute."* Every response measured live on 2026-09-05 — authenticated and not, 200 and
401 alike — carried `x-ratelimit-limit: 200`, decrementing by exactly one per request via
`x-ratelimit-remaining`, with **no** `x-ratelimit-reset` or `Retry-After` header on any successful or
401 response. [`health/quota.ts`](health/quota.ts) reports the header's own number, not the
documented one.

### 4. `/sso/v1/*` looks like two more API-key endpoints, and isn't

The OpenAPI document lists `GET /sso/v1/account` and `GET /sso/v1/campaigns/{campaign}` right
alongside every other endpoint, with the identical `security: [{http: []}]` (bearer) requirement.
Live, a bearer API key gets neither 200 nor 401 from either — it gets an HTTP **302 redirect to
`/login`**, regardless of whether the key is valid. These two belong to Givebutter's session-based SSO
widget flow, not the API-key surface one line above them in the same spec. This app declares no
actions against them, and a test in [`tests/index.test.ts`](tests/index.test.ts) asserts nothing in
`actions/`, `auth/` or `health/` ever references `/sso/v1`.

### A smaller trap worth knowing: `emails`/`phones` mean different shapes on create vs update

`StoreContactRequest.emails`/`.phones` are plain arrays of strings. `UpdateContactRequest.emails`/
`.phones` are arrays of `{value, type, is_primary}` objects — same field names, different documented
shapes, on the two write operations for the same resource. `contact-create` takes comma-separated
strings; `contact-update` takes JSON objects. See [`actions/contact-update.ts`](actions/contact-update.ts).

## Auth

One method: `api-key`, type `bearer` — `Authorization: Bearer <api key>`, per
`components.securitySchemes` in the OpenAPI document (the *only* scheme declared). Givebutter
publishes no OAuth surface for third-party integrations.

### The probe is `GET /v1/campaigns?per_page=1`

Givebutter documents no `/v1/me`, `/v1/account` or ping endpoint reachable with an API key. The two
candidates that read as "whoami" — `GET /sso/v1/account` and `GET /sso/v1/campaigns/{campaign}` —
are the unreachable SSO-flow endpoints described above (measured: 302 to `/login`, any token). So
this app probes the cheapest real resource read instead, bounded to one record — the same call
`health/quota.ts` reuses for rate-limit headroom, so liveness and quota cost exactly one request
between them.

Givebutter's error taxonomy is thin — a 401 and a 403 each carry one fixed message rather than a
machine-readable `type` code — so `auth/api-key.ts`'s `test` hook still reads the response body
rather than trusting the bare status, because the same status code covers unrelated failure modes
elsewhere in this API (see finding #2: a 404 that never reached the JSON-answering router at all has
no parseable body whatsoever).

## Actions

43 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `campaign-list` | search | `GET /v1/campaigns` |
| `campaign-get` | read | `GET /v1/campaigns/{campaign}` |
| `campaign-create` | perform | `POST /v1/campaigns` |
| `campaign-update` | perform | `PUT /v1/campaigns/{campaign}` |
| `campaign-delete` | perform | `DELETE /v1/campaigns/{campaign}` |
| `contact-list` | search | `GET /v1/contacts` |
| `contact-get` | read | `GET /v1/contacts/{contact}` |
| `contact-create` | perform | `POST /v1/contacts` |
| `contact-update` | perform | `PUT /v1/contacts/{contact}` |
| `contact-delete` | perform | `DELETE /v1/contacts/{contact}` |
| `contact-restore` | perform | `PATCH /v1/contacts/{contact}/restore` |
| `contact-tags-add` | perform | `POST /v1/contacts/{contact}/tags/add` |
| `contact-tags-remove` | perform | `POST /v1/contacts/{contact}/tags/remove` |
| `contact-tags-sync` | perform | `POST /v1/contacts/{contact}/tags/sync` |
| `fund-list` | search | `GET /v1/funds` |
| `fund-get` | read | `GET /v1/funds/{fund}` |
| `fund-create` | perform | `POST /v1/funds` |
| `fund-update` | perform | `PUT /v1/funds/{fund}` |
| `fund-delete` | perform | `DELETE /v1/funds/{fund}` |
| `transaction-list` | search | `GET /v1/transactions` |
| `transaction-get` | read | `GET /v1/transactions/{transaction}` |
| `transaction-create` | perform | `POST /v1/transactions` |
| `transaction-update` | perform | `PUT /v1/transactions/{transaction}` |
| `household-list` | search | `GET /v1/households` |
| `household-get` | read | `GET /v1/households/{household}` |
| `household-create` | perform | `POST /v1/households` |
| `household-update` | perform | `PUT /v1/households/{household}` |
| `household-delete` | perform | `DELETE /v1/households/{household}` |
| `payout-list` | search | `GET /v1/payouts` |
| `payout-get` | read | `GET /v1/payouts/{payout}` |
| `pledge-list` | search | `GET /v1/pledges` |
| `pledge-get` | read | `GET /v1/pledges/{pledge}` |
| `plan-list` | search | `GET /v1/plans` |
| `plan-get` | read | `GET /v1/plans/{plan}` |
| `ticket-list` | search | `GET /v1/tickets` |
| `ticket-get` | read | `GET /v1/tickets/{ticket}` |
| `message-list` | search | `GET /v1/messages` |
| `message-get` | read | `GET /v1/messages/{message}` |
| `webhook-list` | search | `GET /v1/webhooks` |
| `webhook-get` | read | `GET /v1/webhooks/{webhook}` |
| `webhook-create` | perform | `POST /v1/webhooks` |
| `webhook-update` | perform | `PUT /v1/webhooks/{webhook}` |
| `webhook-delete` | perform | `DELETE /v1/webhooks/{webhook}` |

**Payouts, pledges, recurring plans, tickets and messages are read-only in the API itself** — there
is no create/update/delete for any of them, so this app declares only `list`/`get`.

### Deliberately out of scope

To keep this app's surface centred on the resources most workflows touch, several nested/niche
corners of the same OpenAPI document are **not** covered, even though they were read and understood:
campaign discount codes, campaign members/teams, campaign-scoped ticket sales
(`/v1/campaigns/{campaign}/items/tickets`), contact activities, household-member management
(`/v1/households/{household}/contacts`), and webhook delivery activity logs. None of these were
excluded for lack of vendor documentation — they're a scope decision, not a gap in verification.

### Id shapes vary by resource — see `lib/params.ts`

Givebutter's OpenAPI document types some path parameters as `integer` (`campaign`, `contact`,
`household`, `pledge`, `message`) and others as an opaque `string` (`fund`'s "fid", `webhook`'s id,
`payout`'s "number", `plan`'s "uid", `ticket`'s "uid", `transaction`'s "tid"). `numericIdParam`
enforces the numeric shape client-side for the first group; `idParam` accepts whatever the vendor
returned for the second. Neither catches a merely nonexistent id — see finding #2 above.

### `campaign-create`/`campaign-update`'s `settings` is JSON, not 50 checkboxes

Givebutter documents **53** distinct campaign setting names (`hide_time_remaining`, `theme_color`,
`disable_recurring`, `default_fund`, `require_ticket_phone`, ...), each with its own value shape
(mostly booleans, but a hex string for `theme_color`, an id for `default_fund`). Exposing each as its
own param would put 50+ fields on one form for a feature most campaigns never touch, so both actions
take the whole `settings` array as a `json` param instead — an array of `{name, value}` objects.

### `contact-create` vs `contact-update`: same field names, different wire shapes

Covered above as finding #5. Concretely: `contact-create`'s `emails`/`phones` params are
comma-separated strings; `contact-update`'s are `json` params expecting
`{value, type, is_primary}` objects. Passing one action's shape to the other will fail Givebutter's
own validation.

### `transaction-create` makes no assumption about which campaign/contact fields are required

Only `method`, `transacted_at` and `amount` are documented required on `StoreTransactionRequest`.
Neither `campaign_code`/`campaign_title` nor `contact_id`/`contact_external_id` is flagged required,
and Givebutter's docs give no further prose on what an un-campaigned or un-contacted transaction
resolves to — so this action passes exactly what you give it rather than guessing a default.

### `webhook-create` vs `webhook-update`: different required fields

`POST /v1/webhooks` documents only `url` as required (though a webhook with no `events` subscribed
will never fire in practice). `PUT /v1/webhooks/{webhook}` documents **both** `url` and `events` as
required — `webhook-update` asks for both up front and throws before making a request if `events` is
empty, rather than letting a caller discover Givebutter's 422 the hard way.

## Health checks

- **`service`** (`kind: "service"`, unsigned) — the `API` component
  (`givebutter.statuspage.io/api/v2/summary.json`) on Givebutter's real, claimed Atlassian Statuspage
  page. `status.givebutter.com` looks like a second, more obvious status host — it resolves and even
  answers JSON at `/summary.json` — but that JSON is a fixed, static 82-byte stub
  (`{"page":{"name":"Givebutter","url":"...","status":"UP"}}`) with no components or timestamp,
  identical on every request; it is named in [`health/service.ts`](health/service.ts) as a rejected
  candidate rather than left silently unconsidered. This check watches the `API` component
  specifically (created 2020-12-01, distinct from `Dashboard`/`Campaigns`) so a marketing-site
  incident doesn't report the API as degraded.
- **`quota`** (`kind: "quota"`, signed, `informational`) — `x-ratelimit-limit`/
  `x-ratelimit-remaining` off the same bounded `GET /v1/campaigns?per_page=1` call the auth probe
  uses. See finding #3: this reports the measured 200/min ceiling, not the documented 500/min.
- **`auth:api-key`** — derived automatically from the Auth `test` hook.

## Development

```bash
deno task check      # typecheck
deno task lint        # deno lint
deno task fmt          # format (lineWidth 100, semicolons, double quotes)
deno task test          # unit tests (110 Deno.test cases across 48 files)
deno task validate       # @w6w/validator conformance audit
```
