# respond.io

Manage contacts, conversations, and messages across WhatsApp, SMS, Messenger, Instagram, email and
other channels, on the **respond.io Developer API v2**.

- **Categories** — support, crm, communication
- **Auth methods** — api-token
- **Actions** — 28
- **Health checks** — 1 (~~`service`~~, declared unavailable) + the derived `auth:api-token`
- **Egress allowlist** — `api.respond.io`
- **Website** — https://respond.io/
- **API docs** — https://developers.respond.io/ (see "Sources" below — not directly usable)
- **Official SDK** — https://github.com/respond-io/typescript-sdk
- **Status page** — https://status.respond.io/ (real, but unreachable machine-readable — see below)

respond.io is a business-messaging CRM: contacts arrive from any connected channel and land in one
inbox, as one **conversation** per contact. This app's centre of gravity follows that model — a
contact identified by `id:`/`email:`/`phone:`, its conversation (assignee, open/close status), and
the messages sent to or received from it — plus the workspace-level configuration (users, custom
fields, tags, channels, WhatsApp templates) those actions reference.

## Sources — why the SDK, not the docs site

`developers.respond.io` is a **Stoplight**-hosted single-page app (`<meta content="... Powered by
Stoplight.">`, confirmed 2026-09-05). Every `openapi.json`/`.yaml`-shaped path 404s, and the page
itself renders entirely client-side — there is no static spec to fetch. Per this pack's rule ("real
vendor docs only... verify... against the actual reference"), a prose scrape of a client-rendered page
was not attempted.

Instead, every path, verb, request/response field, and error shape in this app is verified against
respond.io's own **official** GitHub organization — confirmed via `gh api orgs/respond-io`
(`blog: https://respond.io`, operating since 2017, and the source of the `n8n-integration` community
node respond.io itself maintains):

- **[`respond-io/typescript-sdk`](https://github.com/respond-io/typescript-sdk)**
  (`@respond-io/typescript-sdk` on npm) — the published TypeScript client. `src/client.ts` states the
  base URL (`https://api.respond.io/v2`) and the bearer auth shape; `src/clients/*.ts` state every
  path and verb; `src/types/*.ts` state every request/response field.
- **[`respond-io/mcp-server`](https://github.com/respond-io/mcp-server)** — respond.io's own MCP
  server, wrapping the same SDK. `src/constants.ts` supplied every enum vocabulary in
  [`lib/params.ts`](lib/params.ts); its own health-check implementation (`GET /space/user?limit=1`,
  "list users with limit 1") is the precedent for this app's credential probe.
- **Live probes against `api.respond.io` and `status.respond.io`** on 2026-09-05, confirming the base
  URL, the error envelope, and the two findings below.

## Two findings that would have cost real time

### 1. A CloudFront edge rule, not a respond.io one, gates the auth header's shape

`api.respond.io` sits behind CloudFront, and the **edge itself** — before respond.io's own
application code ever runs — refuses any request whose `Authorization` header is missing or not
shaped `Bearer <anything>`. Measured live 2026-09-05:

| Header sent                      | Result                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- |
| *(none)*                          | CloudFront `403` HTML block page (`<H1>403 ERROR</H1> ... Request blocked.`)      |
| `Authorization: xyz123` (no `Bearer`) | Same CloudFront `403` HTML block page                                        |
| `Authorization: Bearer ` (empty)  | respond.io's own `401` JSON: `{"code":401,"status":"AuthorizationError","message":"Token not found"}` |
| `Authorization: Bearer garbage`   | The same JSON `401` as above                                                      |

So a syntactically-empty-but-`Bearer`-shaped header reaches the real API and gets a real, structured
answer; a header that is absent or malformed gets an opaque edge block that looks nothing like a
respond.io error and would be easy to misdiagnose as "the API is down." [`auth/api-token.ts`](auth/api-token.ts)'s
`sign` always emits the `Bearer ` prefix, even for an empty credential, and its `test` hook checks the
response `content-type` before parsing JSON so a WAF block is reported as exactly that rather than a
confusing parse failure.

### 2. There is no `/whoami` or `/me` endpoint, and `status.respond.io` renders client-side only

Checked against every method of the official SDK's five clients (`ContactClient`,
`MessagingClient`, `CommentClient`, `ConversationClient`, `SpaceClient`): none of them exposes a
"who am I" read. The credential probe is instead `GET /space/user?limit=1` — the same
workspace-scoped, cheapest-available read respond.io's own `mcp-server` uses for its client health
check, not a guess.

Separately, `status.respond.io` **is** a genuine, self-identifying status page
(`<title>Respond.io Status</title>`, cookie `pd_status_page_version` — a PagerDuty-hosted page, not
the Atlassian Statuspage most other apps in this pack read) — but it renders entirely client-side.
Every Statuspage/RSS/Atom-shaped path this pack's other apps read, *and* a made-up nonsense path,
all answer the **identical 6,883-byte HTML shell**; the one truly nonexistent Statuspage-shaped path
(`/api/v2/summary.json`) answers a genuine `404` (`Cannot GET /api/v2/summary.json`), proving the
matching responses above are a real SPA-catch-all and not a probing mistake. See
[`health/service.ts`](health/service.ts) for the full measurement table. Declared `unavailable` at
`severity: "informational"` rather than wired to a page that would always silently read "ok".

## Auth

One method: `api-token`, type `bearer`. A personal API access token, minted per-workspace at
**Settings > Integrations > Developer API > Add Access Token** (per the official SDK's own README).
respond.io publishes no OAuth surface for third-party apps, so the token is the entire authentication
story. See "Finding 1" above for the CloudFront quirk this auth method works around.

## Actions

28 actions across five areas, mirroring the official SDK's five clients one-for-one.

**Contact** (11) — `contact-get`, `contact-create`, `contact-update`, `contact-delete`,
`contact-create-or-update` (the upsert-safe alternative to a bare create), `contact-merge`,
`contact-list` (filter by contact field / tag / lifecycle, AND/OR), `contact-add-tags`,
`contact-remove-tags`, `contact-list-channels`, `contact-update-lifecycle`.

**Conversation** (2) — `conversation-assign` (or unassign), `conversation-update-status`
(open/close, with an optional closing note).

**Messaging** (3) — `message-send` (one action covering all six documented message shapes — text,
attachment, WhatsApp template, email, quick reply, custom payload — via a `messageType` select that
reveals only the fields each shape needs), `message-get`, `message-list`.

**Comment** (1) — `comment-create` (an internal note on a contact; supports `{{@user.<id>}}`
mentions per the SDK's own example).

**Space / workspace** (11) — `space-user-list`, `space-user-get`, `space-custom-field-create`,
`space-custom-field-list`, `space-custom-field-get`, `space-closing-note-list`,
`space-channel-list`, `space-channel-template-list` (a channel's approved WhatsApp templates),
`space-tag-create`, `space-tag-update`, `space-tag-delete`.

### A documented gap: no way to list workspace tags

The official SDK's `SpaceClient` exposes `createTag`, `updateTag`, and `deleteTag` — **and no
`listTags`**. `update`/`delete` both address a tag by its **current name**, not an id (a tag id only
ever appears in what `createTag` itself returns). Per this pack's rule ("if a detail can't be
confirmed, leave the action out and say so"), no `space-tag-list` action is declared; a workflow
must track tag names itself, from what `space-tag-create` returned or from a contact's own `tags`
field.

### Contact identifiers

Every contact-scoped action takes one `identifier` string, exactly as the SDK types it:
`"id:123"`, `"email:user@example.com"`, or `"phone:+60123456789"` — validated against the same
grammar the official `mcp-server` uses in its own `REGEX_PATTERNS`
(`lib/client.ts`'s `assertIdentifier`). Like the official SDK, this app interpolates the identifier
into the URL path **unencoded** (matching the SDK's own `` `/contact/${identifier}` ``), which is
exactly why the grammar is enforced first — nothing outside the three documented shapes is allowed to
reach the request.

### No quota / rate-limit health check

The SDK reads `x-ratelimit-limit` / `x-ratelimit-remaining` / `retry-after` response headers
defensively (`HTTPClient.extractRateLimitInfo`), but neither header was observed on any live response
during this app's own testing — checked on a `401` with both a `Bearer`-shaped and a non-`Bearer`
header. respond.io may only emit them on an authenticated `2xx`, which this app has no live token to
confirm. Per "if a detail can't be confirmed, leave it out," no `quota` health check is declared.

## Health checks

One declared check, `service` (see "Finding 2" above for why it is `unavailable`, not a probe), plus
the `auth:api-token` check derived automatically from `Auth.test`.
