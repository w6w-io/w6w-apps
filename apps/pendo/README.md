# Pendo

Send Pendo track events, read back visitor/account/page/feature/guide data,
set metadata fields, run Aggregation queries, and file GDPR/CCPA bulk
deletions.

- **Categories** — analytics
- **Auth methods** — integration-key
- **Actions** — 11
- **Egress allowlist** — `app.pendo.io`, `app.eu.pendo.io`, `us1.app.pendo.io`,
  `app.jpn.pendo.io`, `app.au.pendo.io`, `data.pendo.io`, `data.eu.pendo.io`,
  `us1.data.pendo.io`, `data.jpn.pendo.io`, `data.au.pendo.io`,
  `status.pendo.io`
- **Website** — https://www.pendo.io
- **API docs** — https://engageapi.pendo.io (Postman-generated; the collection
  itself, fetched from `https://engageapi.pendo.io/api/collections/16265887/Tzm6jvKG`,
  is the machine-readable source everything below was verified against)

## Finding the real reference

`developers.pendo.io` redirects to a marketing page (`www.pendo.io/developers/`,
a Builder.io site) with no API reference in it. The actual reference lives at
`engageapi.pendo.io` — a Postman-generated docs page whose collection is
fetchable directly as JSON (`GET /api/collections/{id}/{token}`), which is
where every endpoint, auth header, request body and sample response in this
app came from. It is explicit that this Postman collection "is the source of
truth for this documentation."

## Two credentials, one header name, five regions

Almost every endpoint under `/api/v1/*` takes an **Integration Key** as the
`x-pendo-integration-key` header. The one exception — `POST /data/track`,
the event-ingest endpoint — takes the *same header name* but a **different
secret**: the Track Event Shared Secret, found on a different settings page
(Subscription Settings → the app → App Details → "Track Event Shared
Secret", not Settings → Integrations). Pendo's own docs call this out
explicitly: "Your Pendo_trackEventSecret_Key is different from your
x-pendo-integration-key or your Pendo Subscription API Key". The `sign` hook
picks the right one by host, so `track-event` fails on its own if only the
integration key is configured — no other action is affected.

A Pendo subscription lives in exactly one of five regions, each with its own
pair of hosts:

| Region | API host (`/api/v1/*`) | Data host (`/data/*`) |
| --- | --- | --- |
| US  | `app.pendo.io`     | `data.pendo.io` |
| EU  | `app.eu.pendo.io`  | `data.eu.pendo.io` |
| US1 | `us1.app.pendo.io` | `us1.data.pendo.io` |
| JPN | `app.jpn.pendo.io` | `data.jpn.pendo.io` |
| AU  | `app.au.pendo.io`  | `data.au.pendo.io` |

A key from one region's subscription is simply invalid against another
region's host — there is no cross-region routing, and the failure looks
identical to a wrong key.

## A bad key gets a 403 with an EMPTY body

Verified live 2026-09-01 against `GET /api/v1/token/verify` with both a
missing and a garbage key: both answer `403` with **no response body at
all**. Only a genuinely valid key gets the documented
`{"valid":true,"writeAccess":true}` JSON. The auth `test` hook reads those
two booleans on success rather than trusting a 200 blindly, and falls back to
the status on failure because that is the only signal Pendo gives there.

## A track event's timestamp decides when — or whether — it is processed

Pendo's docs: an event whose `timestamp` is in the past "will not be
processed with the regular hourly processing and will only appear in the UI
after Pendo's daily and weekly event reprocessing," and one more than seven
days old "may not be processed" at all. The request still returns `200`
either way. `track-event` warns (loudly, past seven days) instead of sending
a payload most workflows would otherwise assume landed within the hour.

## Aggregation is a query language, not an export tool

`run-aggregation` runs `POST /api/v1/aggregation`, the pipeline language
almost every built-in Pendo report is built from. Pendo's own docs are
explicit that it is "NOT intended to be a bulk export feature" and cap a
single call at a 5-minute runtime or 4 GB of output — breaking a wide query
into smaller time ranges is Pendo's own recommendation.

## Actions

| Key | Type | What |
| --- | --- | --- |
| `track-event` | perform | Send a track event (needs the Track Event Shared Secret) |
| `list-pages` | read | List Page definitions |
| `list-features` | read | List Feature definitions |
| `get-visitor` | read | Get a visitor by id |
| `get-account` | read | Get an account by id |
| `set-metadata-value` | perform | Set one metadata field on a visitor or account |
| `get-metadata-value` | read | Read one metadata field on a visitor or account |
| `list-guides` | read | List Guide definitions |
| `report-results` | read | A saved report's rows as JSON (not Paths/Funnels/Retention/Data Explorer) |
| `run-aggregation` | search | Run a Pendo Aggregation pipeline |
| `bulk-delete` | perform | File a GDPR/CCPA erasure request for visitors or accounts (irreversible) |

## What was deliberately left out

- **Base64-encoded visitor/account ids** (`x-pendo-base64-encoded-params`) —
  the collection documents this as an optional header for callers whose ids
  aren't URL-safe. Every action here takes a plain id and URL-encodes it
  instead, which covers the same ground without a second code path.
- **Segment, Report list, Guide reset/localization, Data Sync, Sentiment,
  Conversations, Bulk Deletion status polling, and the rest of the ~90-request
  Postman collection** — real, documented endpoints, left out to keep this
  app to the operations a workflow most plausibly reaches for: sending
  events, reading back core objects, editing metadata, querying, and
  erasure. Nothing here was guessed; everything not listed above simply
  wasn't built yet.

## Health checks

- **`service`** (`kind: "service"`, `informational`) — reads
  `status.pendo.io`'s Atlassian Statuspage feed, narrowed to the three
  components this app's actions depend on (`API`, `Analytics - Data
  Collection`, `Analytics - Data Processing`) across all five regions. It is
  app-scoped and cannot know which region(s) a given Connection uses, so it
  names every affected region rather than guessing one, and caps a single
  region's outage at `degraded` rather than reporting the whole app `down`.
- **`quota`** (`kind: "quota"`, `informational`, declared absence) — Pendo's
  ~1.1MB Postman collection was searched for "rate limit", "X-RateLimit" and
  "Retry-After" with zero hits across every documented request and response,
  and no authenticated credential was available to inspect live headers
  directly.
- **`auth:integration-key`** (derived) — `GET /api/v1/token/verify`, a
  dedicated, no-scope ping that a read-only key can reach.
