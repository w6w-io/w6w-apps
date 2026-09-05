# Donorbox

List campaigns, donations, recurring plans, donors, events, tickets and event ticket purchases on
**Donorbox**, the online donation and fundraising platform built for nonprofits, over the
**Donorbox API v1**.

- **Categories** — commerce, crm
- **Auth methods** — basic
- **Actions** — 7 (all `search`/list — the API is read-only)
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:basic`
- **Egress allowlist** — `donorbox.org` (the `service` check adds `status.donorbox.org` to its own
  hook allowlist, never to the app's)
- **Website** — https://donorbox.org/
- **API docs** — https://github.com/donorbox/donorbox-api
- **Status page** — https://status.donorbox.org/

> **Everything below was verified against Donorbox's own sources on 2026-09-05** — the vendor's own
> reference (`https://raw.githubusercontent.com/donorbox/donorbox-api/master/README.md`, ~17KB,
> hosted on their own GitHub org `donorbox/donorbox-api`) plus live probes against `donorbox.org`.
> That repository holds no OpenAPI or Postman file — checked via the GitHub Contents API, which
> lists only the README and three preview PNG/JPG images. Nothing here came from a third-party
> integration directory.

## Prerequisite: API access costs $17/month

Donorbox's API is not included with a base account. Per the vendor's own README: "access to the
Donorbox API costs $17/month" — billed separately from the platform subscription, enabled from
**Account > API & Zapier Integration > Enable API & Zapier Integration**, after which
**Set new API Key** mints the key (shown once). A working credential was not available to this
build, so the *shape* of a successful (200) response was not independently re-verified live —
only the vendor's own documented examples, and the 401/error path, which was.

## The four things most likely to cost someone a day

### 1. The API is read-only, end to end

All seven documented endpoints — campaigns, donations, plans, donors, events, tickets, purchases —
are `GET`. No create, update or delete verb appears anywhere in the reference. Every action in this
app is a `search` (list) action; there is no write surface to add.

### 2. Auth is HTTP Basic, with the account's login email as the username

Not an API-key header. Per the README's "Make API calls to Donorbox" section: *"Use your
organization login email as your authorization username and the API Key as your password."*
`curl -X GET --user login@email.com:YOUR_API_KEY https://donorbox.org/api/v1/campaigns`.

### 3. A list response is a bare array — no envelope, no pagination metadata

Every endpoint's documented sample output is a bare JSON array — `[{...}, {...}]` — not wrapped in
`{"data": [...]}` or a `{items, meta}` page envelope. There is nothing in the response itself to
report back beyond the `page`/`per_page` a caller sent; unlike this pack's envelope-backed APIs,
there is no `total`/`last_page` to surface.

### 4. Real, live, undocumented rate-limit headers

The README never mentions a rate limit anywhere. Live, on 2026-09-05:

```
$ curl -D - -u fake@example.com:garbage https://donorbox.org/api/v1/campaigns
HTTP/2 401
content-type: application/json; charset=utf-8
x-ratelimit-limit: 60
x-ratelimit-remaining: 59
x-ratelimit-reset: 1788624960
{"error":"Authentication failed"}
```

Three consecutive requests, each with a **different** garbage credential, decremented
`x-ratelimit-remaining` by exactly one every time (60 → 59 → 58 → 57) — consistent with the budget
being tracked per source IP rather than per credential. This could not be confirmed further without
a working (paid) credential. [`health/quota.ts`](health/quota.ts) reports these headers.

### A smaller trap worth knowing: the error body is a flat string

`{"error":"Authentication failed"}` — `error` is a bare string, not `{error: {message}}`. See
[`lib/client.ts`](lib/client.ts)'s `formatDonorboxError`.

### Another smaller trap: the campaigns id filter's prose disagrees with its own example

The README's "Campaign Filters" section reads: *"Use `campaign_id` parameter to narrow down the
result by a specific campaign."* — immediately followed by the worked example
`{GET} /api/v1/campaigns?id=XX`. The prose names `campaign_id`; the example sends `id`. Since a
query parameter is wire format and the example is what a reader would actually copy-paste, this
app's `campaign-list` action sends `id`. There is no OpenAPI/Postman spec in the source repo to
cross-check which one is actually live.

## Auth

One method: `basic`, type `basic` — `Authorization: Basic base64(email:apiKey)`. Donorbox publishes
no OAuth surface; this is the entire authentication story.

### The probe is `GET /api/v1/campaigns?per_page=1`

The cheapest documented read, bounded to one record. It requires a live credential and returns
nothing beyond the connecting organization's own campaign metadata — never anything that could be
mistaken for the credential. `test` classifies from the response body (`{"error": "..."}` on a
live-measured 401), not the bare status code, and its failure message never echoes the credential
back — asserted directly in [`tests/auth/basic.test.ts`](tests/auth/basic.test.ts).

## Actions

7 actions. `resource` groups them in the editor.

| Key | Type | Endpoint | Documented filters |
| --- | --- | --- | --- |
| `campaign-list` | search | `GET /api/v1/campaigns` | `id`, `name` |
| `donation-list` | search | `GET /api/v1/donations` | `email`, `first_name`, `last_name`, `donor_id`, `campaign_id`, `campaign_name`, `id`, `date_from`, `date_to`, `amount[<currency>][min\|max]` |
| `plan-list` | search | `GET /api/v1/plans` | `email`, `campaign_id`, `campaign_name`, `donor_id`, `first_name`, `last_name`, `donor_name`, `date_from`, `date_to` |
| `donor-list` | search | `GET /api/v1/donors` | `id`, `first_name`, `last_name`, `donor_name`, `email` |
| `event-list` | search | `GET /api/v1/events` | none documented (only ordering/pagination) |
| `ticket-list` | search | `GET /api/v1/tickets` | `payment_status` (only `refunded` documented) |
| `purchase-list` | search | `GET /api/v1/purchases` | `payment_status` (`succeeded`\|`pending`\|`failed`\|`refunded`, defaults to `succeeded`) |

Every action also takes `page`, `per_page` (default 50, max 100 — Donorbox falls back to its default
above that) and `order` (`asc`\|`desc`, default `desc`) — documented as applying to "all Donorbox API
endpoints".

### The donation amount filter is currency-scoped in the query key itself

`amount[usd][min]`/`amount[usd][max]`, not a flat `amount_min`/`amount_max` parameter name. This
app's `amountCurrency` param (default `usd`) picks which bracket to build; `amountMin`/`amountMax`
may be used together or alone, per the README.

### Deliberately out of scope

Webhooks are documented (Donorbox supports them "for all the API endpoints documented in this
guide") but configured through a separate custom-webhooks flow
([Donorbox's own help article](https://donorbox.zendesk.com/hc/en-us/articles/4733681068820-Custom-Webhooks)),
not this REST API — no endpoint for creating/listing/deleting a webhook appears in the reference, so
there is nothing here to wrap. Zapier integration is mentioned as a separate, additionally-billed
surface and is out of scope entirely.

## Health checks

- **`service`** (`kind: "service"`, unsigned) — the grouped **`Donorbox API`** component
  (id `xp0vmxdh1qbn`) on `status.donorbox.org`'s real, claimed Atlassian Statuspage page. Its
  children — `Campaigns API`, `Donations API`, `Donors API`, `Events API`, `Plans API`, `Tickets
  API` — map one-to-one onto the six resources this app reads (`purchases` isn't separately named;
  it lives under the ticketing surface). The group's own `status` field rolls those children up
  automatically, so this check reads that one component rather than the page-level indicator, which
  also covers unrelated surfaces (`Stripe`, `PayPal`, the `Donorbox App` dashboard) this API-only
  integration never touches.
- **`quota`** (`kind: "quota"`, signed, `informational`) — `x-ratelimit-limit`/`x-ratelimit-remaining`/
  `x-ratelimit-reset` off the same bounded `GET /api/v1/campaigns?per_page=1` call the auth probe
  uses. See finding #4 above: these headers are undocumented but real and live on every response.
- **`auth:basic`** — derived automatically from the Auth `test` hook.

## Development

```bash
deno task check      # typecheck
deno task lint        # deno lint
deno task fmt          # format (lineWidth 100, semicolons, double quotes)
deno task test          # unit tests
deno task validate       # @w6w/validator conformance audit
```
