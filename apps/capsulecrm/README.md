# Capsule CRM

Parties (people and organisations), opportunities (the sales pipeline), tasks, and account metadata
(users, pipelines, milestones) on **Capsule CRM** (capsulecrm.com), over the **Capsule API v2**.

- **Categories** — crm
- **Auth methods** — personal-access-token
- **Actions** — 19
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:personal-access-token`
- **Egress allowlist** — `api.capsulecrm.com`
- **Website** — https://capsulecrm.com/
- **API docs** — https://developer.capsulecrm.com/v2
- **Status page** — https://status.capsulecrm.com

> **Everything below was verified against Capsule's own server-rendered API reference on
> 2026-09-06** — `developer.capsulecrm.com/v2`'s `overview/*` and `operations/*`/`models/*` pages
> (a genuine per-operation reference, not a marketing shell: it renders full request/response
> examples, query-parameter tables and field-level model docs for every resource) — plus a live
> probe of `status.capsulecrm.com`. Nothing here came from a third-party integration directory.

## The three things most likely to cost someone a day

### 1. Creating an Opportunity needs BOTH a party and a milestone id — and the "list all milestones" endpoint quietly only covers one pipeline

`POST /opportunities` requires `party` and `milestone`, both nested `{ id }` references, with no way
to create an opportunity against "whatever the default pipeline is". Worse: Capsule's own docs mark
the older `GET /milestones` endpoint (no pipeline in the path) as covering only "the oldest active
pipeline... retained for backwards compatibility" — on any account with more than one pipeline it
silently omits every other pipeline's milestones, with no error to signal it. This app never calls
that endpoint: [`milestone-list`](actions/milestone-list.ts) always uses
`GET /pipelines/{pipelineId}/milestones`, so [`pipeline-list`](actions/pipeline-list.ts) is the
correct first call in a workflow that needs to create or move an opportunity.

### 2. Opportunity `owner`/`team` behave differently from Party's

A Party left with no `owner` and no `team` on create silently defaults to the token's own user — but
an Opportunity's model docs state plainly "`owner`... This and/or `team` is required", and
`updateOpportunity` repeats it. Skip both on an opportunity and Capsule answers `422 Validation
Failed`, not a default assignment. [`opportunity-create`](actions/opportunity-create.ts) and
[`opportunity-update`](actions/opportunity-update.ts) leave `ownerId`/`teamId` both optional (either
alone satisfies Capsule) but call this out in the field's own hint text rather than only in this
README.

### 3. `GET /tasks` returns only OPEN tasks by default — completed and pending tasks are invisible

Capsule's own docs state it directly: "By default the body will contain only the open tasks." A
workflow listing tasks to check "is anything overdue across the whole account" will silently miss
every task already marked pending (i.e. attached to a now-closed opportunity) unless `status` is set.
[`task-list`](actions/task-list.ts) exposes `status` as a plain multiselect and documents the default
in its own description, rather than defaulting to `["open","completed","pending"]` behind the
caller's back — Capsule's own default is left as the honest default here too.

## Two smaller vendor quirks, documented at the call site

- **A delete can come back `202 Accepted` instead of `204 No Content`.** Capsule's own docs: it "might
  schedule the deletion for later" and hand back a `Location` header pointing at a `/api/v2/jobs/{id}`
  resource instead of completing synchronously. [`party-delete`](actions/party-delete.ts) surfaces
  this as an `accepted: boolean` output field; [`opportunity-delete`](actions/opportunity-delete.ts)
  and [`task-delete`](actions/task-delete.ts) do not poll the job either — see Out of scope.
- **Two different error envelopes.** Every 4xx Capsule documents (400/401/403/404/422) shares
  `{"message": "...", "errors"?: [{message, resource, field}]}` — except a `429`, which uses the
  flatter `{"error": "rate limit reached"}` instead. [`lib/client.ts`](lib/client.ts)'s `errorMessage`
  normalises across both rather than assuming one shape everywhere.

## Auth

Capsule's own "Getting a Bearer Token" section
(`developer.capsulecrm.com/v2/overview/authentication`) offers two paths: the full OAuth2
authorization-code flow (for sharing an application with other Capsule users, needing a registered
`client_id`/`client_secret`), or generating a **Personal Access Token** directly from *My Preferences
→ API Authentication Tokens* — described by the vendor itself as the path for "a one-off integration
for internal use, or... a quick start". This app implements only the latter
([`auth/personal-access-token.ts`](auth/personal-access-token.ts)); every request carries it as
`Authorization: Bearer {token}` regardless of which path minted it, so OAuth2 support could be added
later without touching `sign`.

The rate limit (4,000 requests/hour, see `health/quota.ts`) is scoped to the Capsule **user** the
token belongs to, not to this app or this Connection — a second integration authenticated as the same
user shares the same budget.

## Health

- **`service`** — Atlassian Statuspage at `status.capsulecrm.com/api/v2/summary.json`, verified live
  as genuinely Capsule-operated (`page.name: "Capsule"`, not the unclaimed-decoy pattern this pack has
  found elsewhere). The page has exactly two components: `"Capsule"` (the product as a whole — Capsule
  does not publish a separately-named API component, so this is what the check reports) and
  `"Drop Box"` (the inbound email-forwarding feature, unrelated to anything this app calls and
  deliberately ignored).
- **`quota`** — `X-RateLimit-Limit`/`-Remaining`/`-Reset` headers, present on every successful
  response (verified against `overview/handling-api-responses`), read off the same `GET /users/current`
  call the auth `test` hook already makes. `informational` severity: running low is worth showing,
  never worth failing a verdict over.
- **`auth:personal-access-token`** (derived) — `GET /users/current`. Never echoes the token back
  (unlike a vendor `/apikey`/`/me`-as-key-dump endpoint), so it's safe to use as the liveness probe.

## Out of scope

Real v2 surfaces, deliberately left out to keep this app to the objects a CRM workflow touches most:

- **Projects (Cases)** and their own task/party associations.
- **Tags** and **Custom Field definitions** (the `List Tags`/`List Field Definitions` lookups a
  workflow would need before attaching a custom field by id).
- **The full array-collection editing semantics** on Party (`addresses`, `phoneNumbers`, `websites`,
  `emailAddresses`) and Opportunity/Party (`tags`, `fields`) — Capsule's documented protocol (add an
  entry with no `id`, patch one by including its `id`, delete one with `"_delete": true`) needs a
  repeating-object param per collection to model generically.
  [`party-create`](actions/party-create.ts)/[`party-update`](actions/party-update.ts) instead expose
  one convenience email/phone field, replacing rather than merging into the existing collection.
- **Tracks** (multi-task templates applied to an opportunity) and the **`/deleted`** sync endpoints
  (`listDeletedParties`/`listDeletedOpportunities`/`listDeletedCases`) for building a local cache.
- **Polling a deferred delete's job status** (`GET /api/v2/jobs/{id}`) — see quirk #1 above.

## Icon

`assets/icon.svg` wraps `https://capsulecrm.com/icons/icon-512x512.png` (a genuine 512×512 PNG app
icon linked from the vendor's own homepage `<link rel="apple-touch-icon">` tags), downloaded verbatim
on 2026-09-06 and wrapped in an `<svg><image>` container — no artwork was redrawn or traced. Capsule
publishes no standalone SVG mark: its favicon is a small raster PNG, and the site's actual logo is
rendered from a Gatsby JS bundle with no static SVG source in the page HTML. This follows the pack's
existing precedent for that exact case: wrapping the vendor's own raster asset rather than hand-tracing
a vector that doesn't exist (see `apollo`, `blandai`, `chatwork`, `dialpad`, `gorgias`, `kustomer`). It
is not run through `_tools/icon-normalize.ts`, matching those apps: that tool re-frames genuine vector
artwork onto the pack's shared 100×100 canvas, and a wrapped raster already fills its own square.

## Layout

```
capsulecrm/
├── package.json                  # manifest — the `w6w` identity block
├── index.ts                      # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # CapsuleClient, error envelope normalisation, Link-header paging
│   ├── params.ts                 # shared page/perPage params
│   ├── party.ts                  # shared Party create/update fields + body builder
│   ├── opportunity.ts            # shared Opportunity create/update fields + body builder
│   └── task.ts                   # shared Task create/update fields + body builder
├── auth/personal-access-token.ts # Bearer token: sign, test, afterConnect
├── actions/                      # one file per operation (19)
├── health/
│   ├── service.ts                # Statuspage rollup
│   └── quota.ts                  # X-RateLimit-* headroom, signed, informational
├── assets/icon.svg                # vendor's own raster app icon, wrapped as SVG
└── tests/                         # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task check       # typecheck
deno task lint
deno task fmt          # never bare `deno fmt` — see repo root CLAUDE.md
deno task validate     # manifest against spec rules
deno task test         # unit tests
```
