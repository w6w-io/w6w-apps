# Braze

Track user data, trigger campaigns and Canvases, send messages, and manage
email subscriptions in Braze — the customer engagement / marketing automation
platform.

- **Categories** — marketing, communication
- **Auth methods** — api-key
- **Actions** — 22
- **Egress allowlist** — `rest.iad-01.braze.com`, `rest.iad-02.braze.com`,
  `rest.iad-03.braze.com`, `rest.iad-04.braze.com`, `rest.iad-05.braze.com`,
  `rest.iad-06.braze.com`, `rest.iad-08.braze.com`, `rest.fra-01.braze.eu`,
  `rest.fra-02.braze.eu`
- **Website** — https://www.braze.com
- **API docs** — https://www.braze.com/docs/api/basics · schema:
  `braze-community/braze-specification`'s `openapi/spec.json` (575,410 bytes,
  `info.title` "Braze Endpoints"), fetched 2026-09-05. That repository is
  community-maintained but built from Braze's own official Postman
  collection, and every path/field/error shape in this app was checked
  against it directly.

## Setup

### REST API Key

1. Braze dashboard → **Settings** → **APIs and Identifiers** → REST API Keys.
2. Paste it into the connection's **REST API Key** field. It is sent as
   `Authorization: Bearer <key>`.
3. Choose the **Instance** — see below, this is not cosmetic.

### There is no single Braze API host

Braze runs every customer's workspace on one of several fixed regional
clusters, and a REST key issued on one is rejected — as an ordinary `401` —
by every other. The fetched spec's own `servers[]` array names exactly nine
of them:

| Instance | Host |
|---|---|
| US-01 | `rest.iad-01.braze.com` |
| US-02 | `rest.iad-02.braze.com` |
| US-03 | `rest.iad-03.braze.com` |
| US-04 | `rest.iad-04.braze.com` |
| US-05 | `rest.iad-05.braze.com` |
| US-06 | `rest.iad-06.braze.com` |
| US-08 | `rest.iad-08.braze.com` |
| EU-01 | `rest.fra-01.braze.eu` |
| EU-02 | `rest.fra-02.braze.eu` |

**The EU pair sits on a different apex domain** — `braze.eu`, not
`braze.com` — which is easy to miss if you assume every host shares one
suffix.

Braze publishes no endpoint that answers "which instance is this key for", so
the instance is a Connection field, read straight off the customer's own
dashboard URL (`dashboard-XX.braze.com`), rather than something this app
could guess or discover. `test` probes the chosen instance at connect time,
which turns a mismatch into a connect failure instead of a first-run mystery.
This mirrors `apps/jumpcloud`'s `region` field for the same reason — another
vendor that runs several fixed regional deployments instead of one host.

Braze's own status page (`status.braze.com`) actually names *more* clusters
than the fetched spec gives REST hostnames for — AU-01, ID-01, JP-01, KR-01,
plus a US-07 and a US-10 — but without a documented hostname for any of them,
supporting them here would mean guessing a naming pattern rather than reading
a primary source. An account on one of those instances can't be connected
through this app until Braze's own OpenAPI document names a host for it.

## Actions

| Resource | Actions |
|---|---|
| User | `user-track`, `user-identify`, `user-alias-new`, `user-delete`, `user-export-ids` |
| Campaign | `campaign-list`, `campaign-details-get`, `campaign-trigger-send` |
| Canvas | `canvas-list`, `canvas-details-get`, `canvas-trigger-send` |
| Message | `message-send` |
| Email | `email-status-set`, `email-hard-bounces-list`, `email-unsubscribes-list` |
| Content Block | `content-block-list`, `content-block-get`, `content-block-create` |
| Catalog | `catalog-list`, `catalog-item-list` |
| Segment | `segment-list` |
| SMS | `sms-invalid-phone-number-list` |

## Two write paths for messaging, on purpose

`campaign-trigger-send` / `canvas-trigger-send` fire a **saved** Campaign or
Canvas built in the Braze dashboard — the audience, content, and (for a
Canvas) the whole multi-step journey already exist there, and the call just
starts it. `message-send` is the opposite: an **ad-hoc** message with no
saved counterpart, built entirely from the call's own `messages` payload.
Neither replaces the other, so both are exposed rather than picking one.

## Everything Braze's own error envelope carries

Every documented `400`/`401`/`403`/`404`/`429`/`500` response across the
fetched spec shares one schema (`components.schemas.Error`):
`{ message?: string, errors?: string[] }`. `lib/client.ts` reads it on every
failed call rather than trusting the HTTP status alone, and the Auth `test`
hook uses it to report a bad key (`401`) distinctly from a key that is valid
but lacks the permission the probe needs (`403`) — the fix for those two is
different, so the message says which one happened.

## The auth probe: `GET /content_blocks/list?limit=1`

Braze's REST keys carry named, per-endpoint-group permissions rather than a
single introspectable identity — there is no whoami or key-info endpoint in
the fetched spec. Content Blocks was picked over the more obvious
`/campaigns/list` because it is the one list endpoint in this app's
read/export surface that actually documents a `limit` parameter, so the
probe costs a fixed, small amount of data no matter how large the workspace's
catalog is, and its response carries nothing sensitive. A key that
legitimately lacks `content_blocks.list` still authenticates fine for every
other endpoint it *is* scoped for — `test` reports that case (`403`)
separately from a bad key (`401`).

## What's in the fetched spec but not in this app

Nothing here was excluded for being **deprecated** — checked structurally
(`grep -c '"deprecated": true'` across the whole 575,410-byte document
returns `0`; no operation in any of the 82 paths carries that flag). Every
omission below is a scope decision, made explicit rather than left as a
silent gap:

- **Email templates** (`/templates/email/*`) and **Content Block
  read-single/update beyond `content-block-get`/`content-block-create`** —
  a template-authoring surface distinct from the Content-Block one this app
  does cover.
- **SCIM dashboard-user management** (`/scim/v2/Users*`) — provisioning
  *Braze's own dashboard operators*, not the marketing/engagement surface
  this app is about.
- **Preference Centers** (`/preference_center/v1/*`) — a separate
  subscription-management product surface.
- **Catalog write paths beyond `catalog-list`/`catalog-item-list`** — create/
  update/delete catalog and catalog-item operations exist in the spec but
  were left out of this first pass; catalogs are read-heavy in most workflow
  use, and the write surface (`POST`/`PATCH`/`DELETE` on
  `/catalogs`/`/catalogs/{name}/items*`) can be added when a concrete need
  shows up.
- **Message scheduling** (`/messages/schedule/*`,
  `/campaigns/trigger/schedule/*`, `/canvas/trigger/schedule/*`) and **Live
  Activity updates** (`/messages/live_activity/update`) — scheduling and
  push-native surfaces layered on top of the send paths this app already
  covers.
- **Every analytics export** — `campaigns/data_series`, `canvas/data_series`,
  `canvas/data_summary`, `events/*`, `feed/*`, `kpi/*`, `purchases/*`,
  `segments/data_series`, `sends/data_series`, `sessions/data_series` — a
  large, separate reporting surface (KPIs, revenue, session counts) that
  deserves its own pass rather than a token action or two bolted onto this
  one.
- **User external-ID / alias maintenance beyond
  `user-alias-new`** (`/users/external_ids/remove`,
  `/users/external_ids/rename`, `/users/merge`) and **Global Control Group
  export** (`/users/export/global_control_group`) — narrower profile-hygiene
  operations left for a follow-up.
- **`/subscription/*` and `/v2/subscription/status/set`** — a newer, more
  general subscription-group model than the single-channel
  `email-status-set` this app implements; left out to avoid shipping two
  half-covered subscription surfaces at once.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is this connection's **cluster's** REST APIs component up? |
| `quota` | quota | Declared unavailable — see below |

`status.braze.com` is a genuine Statuspage instance (`page.name` is "Braze,
Inc.", not a decoy), verified live on 2026-09-05. It groups components by
cluster — `US 01 Cluster` … `EU 02 Cluster` and several more the fetched spec
never gives a REST hostname for — and every cluster repeats the same handful
of child component names (`REST APIs`, `Dashboard`, `Data Processing`,
`Outbound Messaging`, `Currents`, `Cloud Data-Ingestion (CDI)`, `SDK Data
Collection`). A component is therefore only identifiable as (cluster group,
component name), so `service` is `scope: "connection"` with
`credential: "context"` — the same posture `apps/jumpcloud`'s region-suffixed
check uses — and resolves through `group_id` rather than name alone. Only
`REST APIs` is watched, since that is the only surface this app's actions
touch; a US-02 outage does not mark a US-01 connection down, and Dashboard/
Data Processing/etc. are real Braze services this app never calls.

`quota` is a **declared absence**. Braze documents fixed per-endpoint rate
ceilings in prose — 3,000 requests/3 seconds on `/users/track`, a 250,000
requests/hour default elsewhere, both quoted directly from the fetched
spec's own operation descriptions — but no operation's response declares a
header carrying remaining quota or reset time, and this app had no valid
credential to probe live with to check for an undocumented one. Rather than
guess a header name Braze might not send, this is stated as an absence at
`informational` severity, so a host doesn't park the app at `unknown`
forever waiting on a check that will never run.

## File layout

```
braze/
├── package.json                   # identity — the w6w block
├── index.ts                       # entry: exports { actions, auth, healthChecks }
├── actions/                       # one file per action (22)
├── auth/api-key.ts                # bearer REST API key + instance selection
├── health/
│   ├── service.ts                 # per-cluster status via status.braze.com
│   └── quota.ts                   # declared unavailable
├── lib/client.ts                  # instance table, BrazeClient, error envelope reader
├── assets/icon.png                # vendor mark, pixel-exact from favicon.ico
└── tests/                         # mirrors actions/auth/health/lib, plus index.test.ts
```

`assets/icon.png` is decoded, byte-for-byte, from Braze's own `favicon.ico`
(`https://www.braze.com/favicon.ico`, 200, 15,406 bytes, a 3-resolution ICO
confirmed linked from the site's own `<link rel="icon">`) — the 48×48 32bpp
frame, the largest available, re-encoded losslessly as PNG. No simple-icons
entry exists for Braze and the live site serves only a full wordmark PNG, no
standalone icon-only SVG, so the favicon is the real vendor mark rather than
an invented one.
