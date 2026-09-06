# Feedly

Read team AI Feeds, folders and boards, search across a team's sources, annotate articles, and
manage enterprise webhooks — on **Feedly for Threat Intelligence**, the Enterprise product that is,
as of this writing, the *entire* Feedly API.

- **Categories** — productivity, security
- **Auth methods** — bearer-token
- **Actions** — 14
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:bearer-token`
- **Egress allowlist** — `api.feedly.com` (the `service` check adds `status.feedly.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://feedly.com/
- **API docs** — https://developers.feedly.com/reference/introduction
- **Status page** — https://status.feedly.com/

> **Everything below was verified against Feedly's own sources on 2026-09-06** — the reference site's
> `llms.txt` index, every current OpenAPI 3.0/3.1 definition it links, the prose reference and guide
> pages, and live, unauthenticated probes against `api.feedly.com` and `status.feedly.com`. Nothing
> here came from a third-party integration directory or from memory of an older, pre-pivot Feedly
> consumer API.

## The three things most likely to cost someone a day

### 1. There is no "simple" Feedly API left — it's all Enterprise Threat Intelligence, but the token itself is still trivial

Every single page in `developers.feedly.com`'s reference index sits under one product: **Feedly for
Threat Intelligence**. The Authorization page says so without qualification: *"Self service API
tokens are only available to Enterprise clients... contact sales@feedly.com to gain access."* There
is no separate, still-documented "classic" consumer API tier alongside it, and no OAuth2
authorization-code flow anywhere in the current reference.

That sounds like a hard technical gate, but it isn't one *mechanically*: an admin mints a long-lived
opaque token from `https://feedly.com/i/team/api`, and from then on every request is nothing more
than

```
Authorization: Bearer fe_XXXXXXXXXXXXXXXXXXXXX
```

against a fixed host (`api.feedly.com`). No PKCE, no refresh tokens, no per-scope consent screen —
exactly the shape `type: "bearer"` + one `secret` field already covers. **The gate is commercial**
(does this tenant hold a Feedly Enterprise / Threat Intelligence contract), **not technical** (there
is nothing here `ctx.fetch` can't reach once a token exists). That distinction is why this app exists
at all rather than being left out entirely — it is genuinely buildable and testable with a mocked
`HookContext` exactly like any other bearer-token app; it is just only *usable* by a subset of
prospective tenants.

Two legacy prose pages still show older hosts (the Authorization page's own curl example uses
`cloud.feedly.com`; the "Building your first TI integration" tutorial and "Using the Search API"
guide use bare `feedly.com`), while every current, machine-readable OpenAPI definition in the
reference declares `https://api.feedly.com/v3/...`. A live probe on 2026-09-06 found `cloud.feedly.com`
still answers identically to `api.feedly.com` (same 401 body), so it isn't *wrong* — but
`api.feedly.com` is what every current spec actually declares, so it's the only host in
`network.allow`.

### 2. Two different endpoints, two different rules about who's allowed to call them — and the docs don't say

`GET /v3/enterprise/users` and `GET /v3/enterprise/collections` both document a `403 "Insufficient
permissions"` for a non-admin token — this API has admin-gated endpoints *within* an already
Enterprise-gated product. Missing this is exactly the trap `HEALTHCHECKS.md` warns about pack-wide:
HubSpot's health check once probed `/crm/v3/objects/contacts` and reported a perfectly good
non-contacts-scoped token as broken.

So this app's credential probe (`auth/bearer-token.ts`) deliberately does **not** call either of
those. It calls `GET /v3/profile` instead — an endpoint that appears *nowhere* in the current
reference's endpoint list (it only shows up as the Authorization page's own worked curl example), but
which a live probe confirms is real, needs no admin privilege, and answers with a structured,
stable error body either way:

| Request | Response |
| --- | --- |
| No `Authorization` header | `401 {"errorCode":401,"errorMessage":"must provide authorization token"}` |
| A syntactically-plausible but fake token | `401 {"errorCode":401,"errorMessage":"invalid token"}` |
| A live token | `200` |

Both `enterprise-users-list` and `folders-list` remain in this app as ordinary actions (their success
path is fully documented with a real OpenAPI schema) — they just aren't the health probe, and
`enterprise-users-list`'s description says outright that it needs a team-admin token.

### 3. Undocumented response shapes and a stray colon that looks like a bug

- **`GET /v3/entries/{entryId}`** answers a **single-element array**, not a bare object — the
  reference's own OpenAPI schema says `"type": "array"`. `article-get` unwraps `items[0]` so a
  caller doesn't have to re-discover that.
- **`POST /v3/search/contents`**'s documented request body is `{"RAW_BODY": "..."}` in the OpenAPI
  block — a readme.io auto-generation artifact meaning "the whole POST body is this JSON verbatim,"
  confirmed against the "Using the Search API" guide's own worked example, which posts
  `{"layers": [...], "source": {...}}` with no wrapper at all.
- **The "Delete a Webhook" page's own OpenAPI document spells the path
  `/triggers/:{triggerid}`** — a literal `:` immediately before the `{param}` brace, which is not
  valid OpenAPI path-templating and reads like a leaked Express route
  (`router.delete('/triggers/:triggerid', ...)`). Every sibling delete in the same API family
  (`delete-article-from-board`: `/{streamId}/{entryId}`) uses the ordinary form with no stray colon,
  so this app's `webhookPath()` (`lib/client.ts`) builds `/enterprise/triggers/{triggerId}` instead.
  A live probe with both spellings answered an identical `401 must be logged in` — the auth check
  runs before routing gets far enough to 404 a bad path, so this doesn't disambiguate the two; it's a
  documented judgment call, not a verified fact. If `webhook-delete` ever starts failing with a
  `404`-shaped error against a real tenant, this is the first thing to re-check.
- **`X-RateLimit-*` header casing is inconsistent across Feedly's own docs** — the Request Limits
  page writes `X-Ratelimit-Count`/`X-Ratelimit-Reset`; the Status Codes page writes
  `X-RateLimit-Limit` alongside the same two, capitalized differently. `health/quota.ts` reads all
  three case-insensitively (the Fetch API's `Headers` object already normalizes this), which is the
  only way to reconcile the two pages.
- **Streams and the batch-lookup endpoint don't always require a credential.** A live, *fully
  unauthenticated* probe against a public `feed/https://...` stream id and against
  `POST /v3/entries/.mget` with unrecognized ids both answered `200`. Every action here still targets
  a team's `enterprise/...` streams and real Feedly-minted entry ids — which the same probes show DO
  enforce the token — so this doesn't change anything about `requiresAuth`, but it's worth knowing if
  a probe against this API "just works" without a header and looks like a bug in the sandbox.

## What this app deliberately leaves out

The current reference documents a much larger surface than what's built here — the CVE Insight Card,
Threat Actor / Malware / Vulnerability / Cyberattacks / TTP "Agents", entity lookup/autocomplete, Ask
AI (plain and structured-output), trend analysis, Emerging Trends, and Company Insights endpoints.
All of that is genuinely part of the same Enterprise product and reachable with the same bearer
token — nothing there is *more* gated than what's built here. It's left out because it is a distinct,
much larger security-analyst surface (dozens of endpoints, several with bespoke enriched JSON shapes
documented in their own multi-thousand-word reference pages) that goes well past "Feedly the
content-reading platform" and belongs in a follow-up app (or a deliberate expansion of this one) if a
tenant's workflows need threat-intel analytics specifically, rather than folded in here half-verified.

Also left out: `POST /v3/entries/{entryId}` (mark as read; not in the current reference's endpoint
list), and modelling `articles-search`'s query body as first-class `layers`/`source` params — the
guide documents that grammar by example only, and Feedly AI's query language (entity ids,
`publicationBucket` tiers, salience levels) is large enough that a partial re-modelling would either
hide capabilities or silently drift from the vendor's own grammar; the action instead takes the raw
JSON a user copies straight out of Feedly's own "API" button on a saved search.

## Actions

**Articles**

| Action | What it does |
| --- | --- |
| `articles-collect` | Page through a stream's (AI Feed / folder / board) articles — `GET /v3/streams/contents` |
| `articles-search` | Feedly AI keyword/entity search — `POST /v3/search/contents` |
| `article-get` | One article's full enriched metadata by id — `GET /v3/entries/{entryId}` |
| `articles-get-multiple` | Batch metadata lookup, up to 1,000 ids — `POST /v3/entries/.mget` |
| `article-annotate` | Add a comment and optional highlight — `POST /v3/annotations` |

**Boards**

| Action | What it does |
| --- | --- |
| `boards-list` | List the team's boards — `GET /v3/enterprise/tags` |
| `board-article-add` | Add an article to a board — `PUT /v3/tags/{streamId}` |
| `board-article-remove` | Remove an article from a board — `DELETE /v3/tags/{streamId}/{entryId}` |

**Folders, AI Feeds, Users**

| Action | What it does |
| --- | --- |
| `folders-list` | List the team's folders and their feeds — `GET /v3/enterprise/collections` |
| `ai-feeds-list` | List the team's AI Feeds (API name: "alerts") — `GET /v3/alerts` |
| `enterprise-users-list` | List the enterprise account's users (**admin token required**) — `GET /v3/enterprise/users` |

**Webhooks**

| Action | What it does |
| --- | --- |
| `webhooks-list` | List configured webhooks — `GET /v3/enterprise/triggers` |
| `webhook-upsert` | Create or update a webhook — `POST /v3/enterprise/triggers` |
| `webhook-delete` | Delete a webhook by id — `DELETE /v3/enterprise/triggers/{triggerId}` |

## Auth

**`bearer-token`** — one `secret` field, `apiToken`. Generated by a team admin at
`feedly.com/i/team/api → New API Token`, shown once. `sign` stamps
`Authorization: Bearer <token>`; `test` probes `GET /v3/profile` (see "the trap" above for why not
`/v3/enterprise/users`).

## Health checks

| Key | Kind | What it reads |
| --- | --- | --- |
| `service` | `service` | `status.feedly.com/index.json` (Better Stack) — one monitored resource, `feedly.com`, whose own `explanation` states it covers "the API" alongside the web/mobile apps |
| `quota` | `quota` | `X-RateLimit-Count`/`X-RateLimit-Limit`/`X-RateLimit-Reset` off a live `GET /v3/profile` call, against the documented 100,000 requests/month cap |
| `auth:bearer-token` | derived | The `test` hook above |

`status.feedly.com` was checked against the unclaimed-Statuspage decoy pattern first —
`feedly.statuspage.io` is a plain `302` to statuspage.io's own marketing page, unclaimed. The real
page is a **Better Stack** page (not Statuspage-shaped: `/api/v2/summary.json`, `/history.atom` and
`/history.rss` all `301` away from it), confirmed live and self-identifying:

```json
{"data": {"type": "status_page", "attributes": {
  "company_name": "Feedly", "company_url": "https://feedly.com",
  "custom_domain": "status.feedly.com", "aggregate_state": "operational"}}}
```

Feedly for Threat Intelligence has no self-hosted option, so unlike some SaaS-plus-self-hosted apps
in this pack, this check is left at the `degraded` default rather than `informational`.

## Icon

`feedly.com/favicon.svg` **404s** (verified). Feedly's own site instead links a
`safari-pinned-tab.svg` mask icon at `color="#2bb24c"` — the same green as the
[simple-icons](https://simpleicons.org/) CDN's Feedly mark (`cdn.simpleicons.org/feedly`, `fill:
#2BB24C`), which was used as the icon source. Both are the same swoosh geometry; simple-icons' is a
full-color, optimized rendering rather than a colorless mask, which is what this app's icon slot
needs. Re-framed onto the pack's normalized `0 0 100 100` canvas by `_tools/icon-normalize.ts` —
`tests/index.test.ts` pins the untouched path data and the vendor's own brand hex.

## Testing

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/feedly && deno task validate && deno task check && deno task lint && deno task fmt && deno task test'
```

92 unit tests across every action, the auth method, both health checks, the shared client, and the
entry module — all against a mocked `HookContext` (fake `ctx.fetch`, no-op `ctx.log`), no real Feedly
account or network access required.
