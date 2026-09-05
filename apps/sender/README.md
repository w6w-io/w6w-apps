# Sender

Send campaigns, manage subscribers/groups/segments, custom fields and custom events, and manage
account webhooks on **Sender (sender.net)**, an email (and SMS) marketing platform.

- **Categories** — marketing, email
- **Auth methods** — api-token
- **Actions** — 39
- **Health checks** — 2 (~~`service`~~, ~~`quota`~~, both declared absent) + the derived
  `auth:api-token`
- **Egress allowlist** — `api.sender.net`
- **Website** — https://www.sender.net/
- **API docs** — https://api.sender.net/

> **Everything below was verified against `api.sender.net`'s own documentation pages on
> 2026-09-05** — a real Astro/Starlight site confirmed via its sitemap
> (`api.sender.net/sitemap-0.xml`, 74 distinct endpoint pages), byte-diffed against a bogus path to
> rule out a catch-all SPA shell. Nothing here came from a third-party integration directory.

## The soft-fallback-200 trap

`api.sender.net` answers an **unrecognized path with HTTP 200** and its own homepage, not a 404 —
`curl -I https://api.sender.net/definitely-not-a-real-page` is a 200. That means path liveness
proves nothing about whether an endpoint exists. Every action here was instead checked against the
sitemap's own documentation page for that exact endpoint and its worked request/response example.

This same trap reappears one level up, in the health-check search below: `sender.freshstatus.io`
answers HTTP 200 too, and is *also* not real.

## Response shapes: `data` is not always there

Most Sender responses answer `{"data": …}`, optionally alongside a Laravel-style `links`/`meta`
pagination envelope. But several documented endpoints answer **without** a `data` wrapper:

| Endpoint                                          | Shape                                                |
| -------------------------------------------------- | ----------------------------------------------------- |
| `DELETE /v2/subscribers`                           | `{"message": "...", "delete_instance": "..."}`        |
| `GET /v2/subscribers/{id}/events`                  | Bare object keyed by channel (`email`, `sms`, …)      |
| `GET /v2/campaigns/{id}/errors`                    | `{"errors": [...], "warnings": [...]}`                |
| `GET/POST /v2/account/webhooks[/{id}]`             | The webhook object itself, no `data` key              |
| Most create/delete/rename mutations                | `{"success": true, "message": "..."}`, `data` optional |

[`lib/client.ts`](lib/client.ts)'s `SenderClient.data()` unwraps a top-level `data` key **only when
present**, returning the parsed body verbatim otherwise, so it handles both shapes without guessing
per endpoint. List endpoints use `.json()` directly instead of `.data()`, because their `links`/
`meta` pagination fields sit **alongside** `data`, not nested inside it — unwrapping would silently
drop them.

`GET /v2/fields`'s own worked example response answers `data` as a single object rather than an
array, inconsistent with `meta.total: 8` in the same example — almost certainly a documentation
typo, not a real shape difference from every other list endpoint. `field-list.ts` returns the body
untouched rather than asserting a shape the vendor's own example doesn't consistently show.

## No status page could be confirmed real

Four candidates were checked on 2026-09-05, and none held up:

| Candidate                     | Result                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `status.sender.net`            | Does not resolve (NXDOMAIN)                                                          |
| `sender.statuspage.io`         | 302-redirects to `statuspage.io`'s own marketing site — the signature of an unclaimed Statuspage subdomain |
| `sender.freshstatus.io`        | **HTTP 200**, 12,198 bytes — but its embedded Next.js `__NEXT_DATA__` payload carries `"accountDetails":{"status":"Not Found","response":{"status":404,"data":{"detail":"Account with the subdomain does not exist"}}}`. The 200 is a client-rendered SPA shell, not Sender's page — the exact "200 ≠ real endpoint" trap the API host itself exhibits, just on a different domain |
| `sender.net/status`            | 301s to `www.sender.net/status/`, which answers a genuine 404 (Sender's own "We lost this page" template) |

`health/service.ts` states this as a positive fact (`unavailable`, `severity: "informational"`) per
`HEALTHCHECKS.md`, rather than a silent gap or a fabricated check against a decoy.

## Quota headroom: also left undeclared

`api.sender.net/errors/` documents `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
and `Retry-After`, but only under its **"429 - Too many requests"** section — the page never states
whether those headers also ride along on ordinary 2xx responses (where a `remaining` count would be
genuinely useful as headroom) or appear only on the 429 refusal itself, after the limit is already
hit. Confirming that needs a live account and token, which this pass did not have. `health/quota.ts`
declares the check unavailable rather than shipping one that might always read `unknown` while
implying otherwise, or a fabricated one that assumes the headers exist on success responses.

## Credential probe: `GET /v2/groups?limit=1`

Sender documents no scoped-token concept — its own `authentication/` page warns a token "carries
full access to your account" — and no public/unauthenticated endpoint exists anywhere in the crawled
sitemap. `GET /v2/groups?limit=1` was picked as the cheapest available authenticated read that
returns no credential material (a groups list is `{id, title, recipient_count, ...}`). Sender's
`errors/` page documents 401 in prose ("Check your API key") but gives no worked JSON example for
it, unlike 400 and 422 — so `auth/api-token.ts` classifies failure from whatever `message` field the
response body actually carries plus the HTTP status, rather than assuming one unverified exact
string.

## Segments are read-only

The crawled sitemap has `segments/delete-segment`, `get-segment`, `list-segments` and
`segments/subscribers` — no create-segment page exists anywhere. Segments are built in the Sender
web app; this API (and this app) can only read and delete them.

## Account webhooks are a paid-plan feature

Every `account-webhooks/*` page carries a `Paid plan required` callout in the vendor's own docs. A
403 from any `webhook-*` action most likely means the connected account is on a free plan, not that
the credential is broken — each action's description says so.

`webhook-create`/`webhook-update`'s `topic` parameter is a free string, not a `select`, because the
vendor's own parameter table names it "Available topics to create webhook:" and then the list is
**empty** — a gap in Sender's own documentation. The only topics confirmed by a worked example
anywhere in the crawled docs are `groups/new-subscriber` and `campaigns/new`; `groups/unsubscribed`
is named only in the `relation_id` field's description, never itself demonstrated. Shipping a
`select` here would fabricate a "complete" list Sender itself doesn't publish.

## The `ids=[...]` query format is ambiguous, and this app picks the standard one

`campaigns/delete`'s own worked example is `DELETE /v2/campaigns?ids=[eE0x14]` — an unquoted
bracket literal, not standard query encoding of any kind. `lib/client.ts` instead sends array query
parameters as repeated `key[]=value` entries (`ids[]=eE0x14&ids[]=another`), the standard PHP/Laravel
array-query convention this API is built on elsewhere. The one endpoint that shows the opposite
convention — `subscribers/{id}/events?actions=["got"]`, a JSON array **literal** inside one query
value — is built that way explicitly in `subscriber-events-get.ts`, matching that endpoint's own
example exactly rather than generalizing one convention across both.

## Deliberately not implemented in this pass

Documented by the vendor, but left out here — verify against the vendor pages named before adding
any of these:

- **Transactional campaigns** (`transactional-campaigns/*`) — create/send/update/report/list, plus
  bounce/click/open/complaint tracking for transactional (as opposed to marketing) email.
- **Workflows** (`workflows/*`) — list/detail/start/statistics/steps for Sender's visual automation
  builder.
- **Statistics** (`statistics/*`) — campaign-level clicks/opens/bounces/unsubscribes/spam-complaint
  reporting, separate from the per-subscriber event history `subscriber-events-get` already covers.
- **JavaScript SDK** pages (`javascript-sdk/*`) and **MCP Server** (`mcp/`) — client-side/browser and
  MCP-specific surfaces, not REST endpoints this app's sandboxed `ctx.fetch` model applies to.

## Actions

**Subscribers** — `subscriber-create`, `subscriber-get`, `subscriber-list`, `subscriber-update`,
`subscriber-delete`, `subscriber-add-group`, `subscriber-remove-group`, `subscriber-remove-phone`,
`subscriber-events-get`

**Groups** — `group-create`, `group-list`, `group-get`, `group-update`, `group-delete`,
`group-subscribers-list`

**Segments** (read-only) — `segment-list`, `segment-get`, `segment-delete`,
`segment-subscribers-list`

**Fields** — `field-create`, `field-list`, `field-update`, `field-delete`

**Custom events** — `event-create`

**Campaigns** — `campaign-list`, `campaign-get`, `campaign-create`, `campaign-delete`,
`campaign-send`, `campaign-schedule`, `campaign-cancel-schedule`, `campaign-cancel-followup`,
`campaign-copy`, `campaign-errors-get`

**Account webhooks** (paid plans only) — `webhook-list`, `webhook-get`, `webhook-create`,
`webhook-update`, `webhook-delete`

## Auth

**`api-token`** (bearer) — an API token from Sender account settings, sent as
`Authorization: Bearer <token>`. Not scoped: the token carries full account access.
