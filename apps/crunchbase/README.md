# Crunchbase

Look up companies, people and funding rounds from Crunchbase's licensed
private-market dataset.

- **Categories** — crm, analytics
- **Auth methods** — api-key
- **Actions** — 7
- **Egress allowlist** — `api.crunchbase.com`
- **Website** — https://www.crunchbase.com
- **API docs** — https://data.crunchbase.com/docs ·
  reference: https://data.crunchbase.com/reference

## Setup

### API Key

1. In Crunchbase, go to **Account Settings → Integrations → Crunchbase API**
   and click **Show Key**.
2. Access to the full API requires an Enterprise or Applications license; a
   **Crunchbase Basic** plan gets a key too, but one that only reaches three
   endpoints (see below).

Crunchbase's own prose docs (`docs/using-the-api`) describe **two** ways to
send the key: a `user_key` query-string parameter, or an `X-cb-user-key`
header. Only the header form appears in Crunchbase's actual OpenAPI document
(`ApiKeyAuthHeader`, the sole declared security scheme) — this app uses only
that form, both because it is what the machine-readable spec commits to and
because a header keeps the key out of URLs, access logs and referrer headers.

## Actions

| Key | Type | Description |
|---|---|---|
| `autocomplete` | read | Suggest entities matching a query string |
| `search-organizations` | search | Search organizations (companies, investors, schools) |
| `search-people` | search | Search people (founders, investors, executives) |
| `search-funding-rounds` | search | Search funding rounds |
| `get-organization` | read | Look up one organization by UUID or permalink |
| `get-person` | read | Look up one person by UUID or permalink |
| `get-funding-round` | read | Look up one funding round by UUID or permalink |

### The API is entirely read-only

There is no write endpoint anywhere in Crunchbase's OpenAPI document. Every
action here is `read`, `search`, or autocomplete (itself a `read`) — none of
them are `perform`, and none need `idempotent`.

### License tier gates *endpoints*, not just fields

Crunchbase's cheapest license ("Basic") is not a smaller version of the same
endpoint set — it is exactly **three** endpoints, named explicitly in
Crunchbase's own docs (`docs/crunchbase-basic-using-api`):

- `autocomplete`
- `search-organizations`
- `get-organization`

`search-people`, `get-person`, `search-funding-rounds` and `get-funding-round`
all live behind Advanced/Enterprise access. A Basic key is a perfectly valid
credential — `auth:api-key` will report it live — but calling one of the other
four actions with it returns a **403**, not a 401. This app's auth `test`
probe deliberately calls `autocomplete`, the one endpoint every tier includes,
so the health check doesn't report a working Basic key as broken.

### Search bodies are Crunchbase's own predicate DSL, not a flattened form

`search-organizations`, `search-people` and `search-funding-rounds` share one
request shape (`EntitySearch` in the schema): `field_ids` (required, what
columns to return), `query` (required, up to 25 predicate objects), an
optional `order`, an optional `limit` (default 100, max 1000), and
**keyset pagination** — `after_id`/`before_id` name the uuid of the last/first
row on the current page, not an offset.

`query` and `order` are exposed here as raw JSON rather than one form field
per predicate. Crunchbase's field/operator vocabulary is too large to model
any other way: organizations alone have **93** `field_ids` and there are
**20** operators (`eq`, `contains`, `includes_all`, `between`,
`domain_includes`, …) — the same reasoning the `algolia` app's `extraParams`
field uses for its own oversized query DSL.

A predicate looks like:

```json
{ "type": "predicate", "field_id": "name", "operator_id": "contains", "values": ["acme"] }
```

**Money-typed fields take an object, not a number.** Crunchbase's own
pagination example (`docs/paginating-through-the-search-api`) queries
`money_raised` with:

```json
{ "type": "predicate", "field_id": "money_raised", "operator_id": "gte",
  "values": [{ "value": 10000000, "currency": "usd" }] }
```

even though the schema's `Predicate.values` items are typed as
`anyOf[string, number, boolean]` — the schema under-describes its own API.
This affects `funding_total`, `equity_funding_total`, `money_raised`,
`target_money_raised`, `pre_money_valuation`, `post_money_valuation` and
`valuation`. Passing a bare number for one of these fields is a request
Crunchbase's own documented example never makes, and this app does not
second-guess it — the JSON goes through verbatim.

### Autocomplete's `collection_ids` accepts facets the schema doesn't enumerate

The OpenAPI `collection_ids` enum lists 19 bare collection names
(`organizations`, `people`, `locations`, …), but Crunchbase's own usage guide
(`docs/using-autocomplete-api`) narrows further with a dotted facet suffix —
`organization.companies`, `organization.investors`, `organization.schools`,
`person.investors`, `principal.investors`, `location.cities`,
`location.regions`, `location.countries`, `location.groups` — which the
schema's enum does not itself declare. `autocomplete`'s `collectionIds` param
is left a free-form comma-separated string rather than a fixed `select` for
exactly this reason: restricting it to the documented enum would silently
break the form Crunchbase's own examples use.

### A card returns at most 100 items

`get-organization`, `get-person` and `get-funding-round` all accept
`cardIds` — named relationships (`founders`, `investors`,
`participated_funding_rounds`, …) inlined into the lookup response. Crunchbase
caps each card at **100 items** (`docs/using-entity-lookup-apis`); paginating
further requires the dedicated per-card endpoint
(`/entities/{collection}/{entity_id}/cards/{card_id}`), which this app leaves
out — a narrower need than the lookup itself.

### `entity_id` is a UUID *or* a permalink

Every lookup action's `entityId` accepts either form — Crunchbase's own
example uses the permalink (`GET /entities/organizations/tesla-motors`), and
`autocomplete` is Crunchbase's own recommended way to find one when you only
have a fuzzy name.

### Deliberately out of scope

- **Every other collection the API documents** — events, event appearances,
  IPOs, ownerships, categories, category groups, locations, jobs, addresses,
  degrees, diversity spotlights, principals, acquisitions, investments, press
  references, funds, and deleted entities. All real and documented; companies,
  people and funding rounds cover the core enrichment/research use case
  without duplicating two dozen near-identical search/lookup pairs.
- **Per-card pagination** (`/entities/{collection}/{entity_id}/cards/{card_id}`).
- **The Metadata endpoints** (`/md/applications/crunchbase/openapi.{yaml,json}`,
  `/md/applications/crunchbase/fields`) — schema introspection for a client
  author, not workflow data.
- **Deleted Entities** (`/data/deleted_entities`) — a sync/dedup concern for a
  data pipeline.

## Health check

Three questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota*
left.

### Is the vendor up?

**Declared absence.** Checked two ways, both dead ends (verified live
2026-09-05):

```
status.crunchbase.com                      -> DNS resolution failure
crunchbase.statuspage.io/api/v2/summary.json -> 302 to https://www.statuspage.io
```

`status.crunchbase.com` simply does not resolve. `crunchbase.statuspage.io`
exists but is the unclaimed-Statuspage-decoy signature this pack's other apps
have also found: it redirects to Atlassian's own marketing homepage instead of
answering as a claimed incident page. There is no vendor-operated,
machine-readable status surface to probe.

### Is this credential live?

`GET /data/autocompletes?query=crunchbase&limit=1` — the one endpoint every
Crunchbase license tier includes, so a Basic-only key still passes. Crunchbase
answers errors as a JSON array — `[{"status":401,"code":"LA401","message":
"Unauthorized user_key"}]` — served with `Content-Type: text/plain` (verified
live 2026-09-05), so the body is parsed defensively rather than trusting the
header. 401 (bad key) and 403 (valid key, insufficient package) get distinct
messages, since they're different problems with different fixes. The
credential itself is never echoed into either.

### Do we have quota left?

**Declared absence.** Crunchbase documents a fixed **200 calls per minute**
rate limit in prose (`docs/using-the-api`), and separately mentions an
undocumented per-key "quota" — but publishes no response header of any kind
(verified live on a 401 response, 2026-09-05) and no endpoint that reports
consumption against either. A probe could only echo the fixed 200/minute
number itself, never actual headroom — a limit, not a balance.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | declared `unavailable` — no machine-readable status surface exists |
| `quota` | quota | — | — | informational | declared `unavailable` — rate limit is documented, not readable back |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` method's `test` hook |

## Icon

`assets/icon.png` — Crunchbase's own `apple-touch-icon.png`, served directly
from `https://www.crunchbase.com/apple-touch-icon.png`, downloaded
2026-09-05. 4,752 bytes, `image/png`, 180×180.

---

Researched and endpoint-verified 2026-09-05 against Crunchbase's own OpenAPI
document (embedded in the server-rendered payload of
https://data.crunchbase.com/reference, "Advanced Financials Package" schema
v1.1.0 — a ReadMe-hosted reference whose pages carry Crunchbase's real,
versioned OAS files), Crunchbase's prose guides under
https://data.crunchbase.com/docs, and live probes of `api.crunchbase.com` and
the vendor's (absent) status surfaces. License packaging and the endpoint set
it gates move; re-check if an action that previously worked starts 403ing for
everyone at once.
