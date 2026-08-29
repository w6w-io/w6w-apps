# Apollo

Search and enrich people and companies, and manage the CRM-style records (contacts, accounts, deals)
and outreach machinery (sequences, tasks, lists) built on top of them, on the **Apollo REST API v1**.

- **Categories** — crm, marketing
- **Auth methods** — api-key
- **Actions** — 44
- **Health checks** — 3 (`service` — informational, `quota`, `request-rate`) + the derived `auth:api-key`
- **Egress allowlist** — `api.apollo.io` (the `service` check adds `status.apollo.io` to its own hook
  allowlist, never to the app's)
- **Website** — https://www.apollo.io/
- **API docs** — https://docs.apollo.io/reference/apollo-api
- **Status page** — https://status.apollo.io/

> **Everything below was verified against Apollo's own sources on 2026-08-29** — its OpenAPI 3.1
> document (embedded inline in every `docs.apollo.io/reference/*` page as `document.api.schema`, 74
> paths, `info.version` `1.0`; it is not published as a standalone file), the surrounding
> `docs.apollo.io` guide pages, and live probes against `api.apollo.io` and `status.apollo.io`. Nothing
> here came from a third-party integration directory.

## The things most likely to go wrong

### 1. Search endpoints take their filters as query parameters, even though they are `POST`

`POST /mixed_people/api_search`, `POST /mixed_companies/search` and several others declare **zero**
`requestBody` in the OpenAPI document — every filter, including array filters, is an `in: query`
parameter, sent in Rails/PHP-style bracket notation: `?person_titles[]=CEO&person_titles[]=CTO`. A
client that reasonably assumes a `POST` takes a JSON body sends a request where every filter is
silently ignored. [`lib/client.ts`](lib/client.ts)'s `appendQuery` builds the bracket form for any
array value passed as `query`, and a range filter is simply spelled with the bracket already in the
key (`"revenue_range[min]"`).

Some bulk endpoints mix the two on **one request**: `POST /people/bulk_match` takes its `details`
array as a genuine JSON body, alongside plain (non-bracketed) boolean flags in the query string.

### 2. Three error shapes for the same failure, keyed by status code

| Status | Content type | Shape |
| --- | --- | --- |
| 401 | `text/plain` | the message itself — **no JSON at all** |
| 422 | `application/json` | `{"error": "<message>"}` |
| 429 | `application/json` | `{"message": "<message>"}` |
| other | usually JSON | `{"error": "<message>"}` (best-effort) |

Confirmed live on 2026-08-29: `GET /api/v1/users/api_profile` with no key answers `422
{"error":"Api key required"}`; with a syntactically-plausible but wrong key it answers **401 with a
plain-text body**, no JSON wrapper at all — `"Invalid API key. See
https://docs.apollo.io/reference/authentication for how to authenticate."`. `formatApolloError` in
[`lib/client.ts`](lib/client.ts) tries JSON first and falls back to the raw text.

### 3. The documented auth-check endpoint doesn't check auth

Apollo's own [Authentication guide](https://docs.apollo.io/reference/authentication) shows a curl
example calling `GET /auth/health` with an API key. Measured live: it answers `200
{"healthy":true,"is_logged_in":false}` for **both no credential at all and a syntactically-plausible
fake one** — a status-code (or even body) read of it cannot distinguish a live Connection from a dead
one, and the path isn't even in the 74-path OpenAPI reference. `auth/api-key.ts` uses `GET
/users/api_profile` instead — see its module doc for the three-part case for that endpoint.

### 4. `people-search` and `organization-search` are two different products wearing similar names

| | `people-search` (`/mixed_people/api_search`) | `organization-search` (`/mixed_companies/search`) |
| --- | --- | --- |
| Credits | **0** | **1 per page** (up to 100 results/page) |
| Names | Obfuscated (`"Hu***n"`) | Full |
| Email/phone | Never returned | N/A (companies) |
| Display ceiling | **50,000 records** (100/page × 500 pages) | none documented |

`people-search` finds prospects to *count and shortlist*; enriching one (`people-enrich`,
credit-consuming) is a separate, deliberate step. Confusing the two either leaks nothing useful or
spends credits by surprise.

### 5. `GET /labels` (the "Lists" feature) returns a bare JSON array

Every other list endpoint in this API answers `{"<resource>": [...], "pagination": {...}}`. `GET
/labels` — the endpoint behind the product's "Lists" UI — answers a **bare array**, no envelope, no
pagination. `actions/list-list.ts` handles this as its own documented shape rather than guessing.

### 6. `account-create` and `contact-create` handle duplicates differently

Apollo's own docs for `POST /accounts`: "Apollo doesn't apply deduplication processes when you create
a new account via the API. If your entry has the same name, domain, or other details as an existing
account, Apollo creates a new account instead of updating the existing account." `contact-create`, by
contrast, has an opt-in `run_dedupe` flag that matches against existing contacts by email — off by
default. Assuming the two behave the same way is an easy way to end up with duplicate accounts.

### 7. Sequences vs. emailer campaigns vs. labels: three names, overlapping objects

The product calls the outreach feature "Sequences"; the API's own tag groups them as `Sequences` but
the bulk-membership routes live under `/emailer_campaigns/*`, not `/sequences/*` — `sequence-search`,
`sequence-add-contacts` and `sequence-remove-contacts` all hit `emailer_campaigns` paths. Separately,
`GET /labels` — "Lists" in the UI — can return `modality: "emailer_campaigns"` rows (sequence folders),
even though `list-create` can only make `contacts`/`accounts` lists.

### 8. `sequence-add-contacts` needs the sequence ID twice, and it isn't optional

`POST /emailer_campaigns/{sequence_id}/add_contact_ids` names the sequence in the URL path AND
requires a separate `emailer_campaign_id` query parameter carrying the **same value** — omit it and
the call is rejected as missing a required parameter. `actions/sequence-add-contacts.ts` fills it in
from the path param automatically so a caller only ever names the sequence once.

## Auth

One method: `api-key`, type `apiKey`, header `x-api-key`.

Apollo also documents an OAuth 2.0 authorization-code flow, but it's explicitly for **partners**
building an integration on behalf of a mutual Apollo user (the flow a listed Marketplace app would
use) — not for a workspace connecting its own account, so this app doesn't offer it.

### The probe is `GET /users/api_profile`

| Candidate | Requires a credential? | Leaks anything? |
| --- | --- | --- |
| **`/users/api_profile`** | ✅ `422`/`401` when missing/wrong | ✅ only `{id, team_id, first_name, last_name, title, email}` |
| `/auth/health` | ❌ answers `200` for a missing OR fake key (measured) | — disqualified regardless |

`/users/api_profile` needs no special scope — Apollo's own docs single it out as granted
automatically on every OAuth token, and by extension it is not one of the small set of endpoints
(`GET /users/search` among them) the docs say require a **Master** API key. `include_credit_usage` is
never set from the probe or from `afterConnect` — that flag folds the team's credit balances into the
same response, and this app keeps that behind the dedicated `user-profile-get`/`credit-usage-stats-get`
actions instead, so a credential-liveness check never has a reason to touch billing data.

`afterConnect` calls the same endpoint and keeps exactly two fields for the Connection label —
`email` and a joined `first_name`/`last_name` — dropping `team_id` and everything else.

## Actions

44 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `people-enrich` | read | `POST /people/match` |
| `people-bulk-enrich` | read | `POST /people/bulk_match` |
| `organization-enrich` | read | `GET /organizations/enrich` |
| `organization-bulk-enrich` | read | `POST /organizations/bulk_enrich` |
| `people-search` | search | `POST /mixed_people/api_search` |
| `organization-search` | search | `POST /mixed_companies/search` |
| `organization-job-postings-list` | search | `GET /organizations/{id}/job_postings` |
| `account-create` | perform | `POST /accounts` |
| `account-update` | perform | `PATCH /accounts/{account_id}` |
| `account-get` | read | `GET /accounts/{id}` |
| `account-search` | search | `POST /accounts/search` |
| `account-stage-list` | read | `GET /account_stages` |
| `organization-get` | read | `GET /organizations/{id}` |
| `contact-create` | perform | `POST /contacts` |
| `contact-update` | perform | `PATCH /contacts/{contact_id}` |
| `contact-get` | read | `GET /contacts/{contact_id}` |
| `contact-search` | search | `POST /contacts/search` |
| `contact-stage-update` | perform | `POST /contacts/update_stages` |
| `contact-stage-list` | read | `GET /contact_stages` |
| `deal-create` | perform | `POST /opportunities` |
| `deal-update` | perform | `PATCH /opportunities/{opportunity_id}` |
| `deal-get` | read | `GET /opportunities/{opportunity_id}` |
| `deal-list` | search | `GET /opportunities/search` |
| `deal-stage-list` | read | `GET /opportunity_stages` |
| `sequence-create` | perform | `POST /sequences` |
| `sequence-update` | perform | `PUT /sequences/{id}` |
| `sequence-search` | search | `POST /emailer_campaigns/search` |
| `sequence-add-contacts` | perform | `POST /emailer_campaigns/{sequence_id}/add_contact_ids` |
| `sequence-remove-contacts` | perform | `POST /emailer_campaigns/remove_or_stop_contact_ids` |
| `sequence-activity-list` | read | `POST /emailer_campaigns/activity_feed` |
| `task-create` | perform | `POST /tasks` |
| `task-update` | perform | `PATCH /tasks/{id}` |
| `task-get` | read | `GET /tasks/{id}` |
| `task-search` | search | `POST /tasks/search` |
| `task-complete` | perform | `POST /tasks/{id}/complete` |
| `task-skip` | perform | `POST /tasks/{id}/skip` |
| `list-create` | perform | `POST /labels` |
| `list-update` | perform | `PATCH /labels/{id}` |
| `list-list` | search | `GET /labels` |
| `list-add-records` | perform | `POST /labels/add_entity_ids_to_label_names` |
| `list-remove-records` | perform | `POST /labels/remove_entity_ids_from_label_names` |
| `user-profile-get` | read | `GET /users/api_profile` |
| `usage-stats-get` | read | `POST /usage_stats/api_usage_stats` |
| `credit-usage-stats-get` | read | `POST /usage_stats/credit_usage_stats` |

### Idempotency

Apollo's create endpoints carry no idempotency-key mechanism of any kind, so `account-create`,
`contact-create` (unless `run_dedupe` is set — off by default), `deal-create`, `task-create`,
`sequence-create` and `sequence-add-contacts` are all `idempotent: false`; `list-create` joins them
because a second call with a name that's already taken errors rather than returning the existing
list. The `PATCH`/`PUT`-style updates that set absolute field values, plus the terminal-transition
actions (`task-complete`, `task-skip`, `sequence-remove-contacts`, `list-add-records`,
`list-remove-records`) converge to the same end state on retry and are `idempotent: true`.

### Notes on individual actions

- **`people-search` vs `people-enrich`.** See finding 4. Chain a search result's `id` into
  `people-enrich` to reveal real contact details.
- **`people-enrich`/`people-bulk-enrich` reveal fields asynchronously.** `reveal_phone_number` and
  both `run_waterfall_*` flags require `webhook_url`: Apollo answers the rest of the match
  synchronously and delivers the requested field to that webhook later (can take several minutes).
- **`account-create` has no dedup; `contact-create` has an opt-in one.** See finding 6.
- **`sequence-add-contacts` fills `emailer_campaign_id` automatically.** See finding 8.
- **`sequence-update` (`PUT`) returns the sequence's fields at the top level**, not wrapped under a
  resource key like every other update in this API — the action returns the response as-is.
- **`list-list` (`GET /labels`) is a bare array.** See finding 5.
- **`task-create` requires all five of `user_id`, `contact_id`, `type`, `status` and `due_at`** — the
  one action in this app where every field named is mandatory by the vendor's own schema.
- **Search endpoints with a long filter tail expose the common fields by name and a catch-all `json`
  param (`extraFilters` on `people-search`/`organization-search`, `settings` on
  `sequence-create`/`sequence-update`) for the rest** — Apollo documents 15–25 optional filters on
  some of these endpoints, and exploding every one into a named field would make each action mostly
  boilerplate. A value copied from Apollo's own reference works unmodified.

## Health checks

Three declared checks plus the derived `auth:api-key`.

### `service` — real, but scoped, and marked `informational` because of it

`status.apollo.io` is a genuine **Better Stack** page (`company_name: "Apollo"`, `custom_domain:
status.apollo.io`) — confirmed by its own `/index.json`, not by the Statuspage-shaped paths, which all
301. A decoy exists too: `apollo.statuspage.io/api/v2/summary.json` answers `200` with a component
literally named `"API (example)"` — Statuspage's own unclaimed placeholder content, still live under
that subdomain.

**None of the seven real monitors is named for the REST API** (`app.apollo.io`, `www.apollo.io`,
`Background Jobs Latency`, `Email Sending Latency`, `Email Request Fulfillment Latency`, `Mobile
Number Fulfillment Latency`, `Payment Gateway`). Three of them are still load-bearing for this app —
they're exactly the async delivery pipeline `people-enrich`/`people-bulk-enrich`'s webhook-delivered
reveal/waterfall fields depend on — so the check reads those three plus the two site monitors
(`Payment Gateway` excluded, billing not data) rather than skipping the page outright. Severity is
`informational` rather than the `kind: "service"` default of `degraded`, because a red monitor here is
suggestive of a shared-infrastructure problem, not proof that `api.apollo.io` itself is failing.

### `quota` — team credit balances, read generically

`POST /usage_stats/credit_usage_stats` (0 credits to call) returns every credit type the team's plan
meters — `lead_credit`, `direct_dial_credit`, `export_credit`, `ai_credit` and others in Apollo's own
example — each with `limit`/`consumed`/`left_over` for the current billing cycle. The check iterates
the response's own keys rather than a fixed list, so a vendor-added credit type reports without a code
change. A monthly-style ceiling at 100% is `down` (an exhausted `lead_credit` means every future email
reveal returns 0 credit-consuming fields with no error, not an outage message); 90%+ is `degraded`.

### `request-rate` — real per-endpoint headers, necessarily scoped to one endpoint

Confirmed on `docs.apollo.io/reference/rate-limits`: Apollo enforces per-minute/hour/day windows **per
team, per endpoint** (not per API key), and every authenticated response carries
`x-rate-limit-minute`/`-hourly`/`-24-hour` plus matching `x-*-usage` and `x-*-requests-left` headers —
a real, live signal most vendors in this pack don't offer. This check reads them off the same `GET
/users/api_profile` call the auth probe and `afterConnect` already make, so headroom on **that one
endpoint** is what's reported — not a blanket API-wide figure, because Apollo doesn't publish one.
`usage-stats-get` (`POST /usage_stats/api_usage_stats`) is where to check a *different* endpoint's own
limits on demand — it returns the same three-window shape for every route the team has called,
keyed by a stringified `["path", "action"]` pair.

## Deliberately not covered

Apollo's reference lists 74 operations; this app covers 44, chosen to cover people/company search &
enrichment plus the five named core CRM/outreach objects (contacts, accounts, deals, sequences,
lists) end to end. Left out, and why:

- **Calls** (`/phone_calls/**`) and **Conversations** (`/conversations/**`) — call-logging and
  conversation-intelligence surfaces; genuinely useful, out of scope for this pass.
- **Emailer Messages** (`/emailer_messages/**`) — drafting and sending one-off emails outside a
  sequence, checking send status, reading content. A candidate for a follow-up.
- **Analytics** (`POST /reports/sync_report`) — saved report queries; niche and rate-limited to 5/hour.
- **Fields / Custom Fields** (`GET/PATCH/POST /fields`, `/typed_custom_fields`) — every create/update
  action here accepts `typed_custom_fields` as a free-form JSON object already; managing the field
  *definitions* themselves is a lower-frequency admin task left out for this pass.
  `GET /account_stages`/`/contact_stages`/`/opportunity_stages` (the per-object stage lists actions
  reference) ARE covered.
- **Email Accounts** (`GET /email_accounts`) — needed only to find IDs for
  `sequence-add-contacts`'s `send_email_from_email_account_id`; omitted for scope but worth adding.
- **News Articles Search** (`POST /news_articles/search`) — a real, documented endpoint, but a
  narrower signal than the core search/enrichment/CRM path this app centers on.
- **Sequence lifecycle actions** `abort-sequence`/`approve-sequence`/`archive-sequence` — real,
  documented, single-field POSTs; `sequence-update`'s own `active` flag covers the common
  pause/resume case, and the rest are left for a follow-up rather than padding the action count.
- **Webhook result polling** (`GET /webhook_result/{request_id}`) — a debugging aid for the
  asynchronous reveal/waterfall deliveries `people-enrich` can trigger; a candidate for a follow-up
  once a workflow actually needs to poll rather than receive the webhook.
- **`POST /accounts/bulk_create`/`bulk_update`, `POST /contacts/bulk_create`/`bulk_update`,
  `POST /tasks/bulk_create`, `POST /accounts/update_owners`, `POST /contacts/update_owners`** — batch
  variants of actions already covered singly. A workflow step typically processes one record per run,
  so the bulk forms were left out to keep the action count focused; the single-record
  create/update actions cover the same fields.
- **`GET /email_accounts`, `GET /notes`, `POST /notes`** — Miscellaneous-tag endpoints, real but
  lower-priority than the core objects for this pass.

Nothing was left out because it couldn't be confirmed: every endpoint above is documented in the
vendor's own OpenAPI document and was read there on 2026-08-29.

## Layout

```
apollo/
├── package.json              # manifest — the `w6w` identity block
├── index.ts                  # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts             # ApolloClient — bracket-array query building, the 3 error shapes
│   ├── params.ts             # shared Param fragments, option lists, the extraFilters/settings idiom
│   └── ids.ts                # path-escaping for a caller-supplied id
├── auth/api-key.ts           # x-api-key: sign, test, afterConnect
├── actions/                  # one file per action (44)
├── health/
│   ├── service.ts            # status.apollo.io, informational
│   ├── quota.ts               # team credit balances, signed
│   └── request-rate.ts       # x-rate-limit-* headers off the whoami call, signed
├── assets/icon.svg           # vendor mark, verbatim
└── tests/                    # 151 assertions across 50 files: entry module, every action, auth, health, lib
```

## Icon

`assets/icon.svg` is served verbatim from `https://www.apollo.io/icon.svg` (fetched 2026-08-29,
9,423 bytes, `image/svg+xml`) — the exact icon Apollo's own site links via `<link rel="icon"
href="/icon.svg?...">`. It is an SVG wrapper around the site's base64-embedded PNG mark rather than a
hand-drawn vector (Apollo's own choice for this asset, not a stand-in), left byte-for-byte as served.

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test
```

`deno task validate` (`deno run --no-check -A --config ./deno.json ../../_tools/audit.ts apollo`)
currently fails in this environment with `Import "@w6w/runtime" not a dependency` — `_tools/audit.ts`
imports `@w6w/runtime` by bare specifier, and this app's own `deno.json` (correctly) has no reason to
map it. This reproduces byte-for-byte on the sibling `apify` app with the exact same invocation, so
it is a property of how the shared tool is invoked in this environment, not of this app. Running the
audit the way that actually resolves both import maps —
`cd ../../_tools && deno run --no-check -A audit.ts apollo` — passes with **0 errors, 0 warnings**
(and the identical command reports the same 0/0 for `apify`).
