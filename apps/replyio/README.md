# Reply.io

Manage contacts, sequences (multichannel outreach campaigns), email accounts, custom fields, and
team-wide email reporting, on the **Reply API v3**.

- **Categories** — marketing, crm, email
- **Auth methods** — api-key (Bearer)
- **Actions** — 18
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.reply.io` (the `service` check adds `status.reply.io` to its own hook
  allowlist, never to the app's)
- **Website** — https://reply.io/
- **API docs** — https://docs.reply.io/ (v3, current) · https://apidocs.reply.io/ (v1/v2, deprecated)
- **OpenAPI** — https://docs.reply.io/api-reference/bundled.yaml
- **Status page** — https://status.reply.io/

> **Everything below was verified against Reply's own sources on 2026-09-01** — its bundled OpenAPI
> 3.1 document ([`docs.reply.io/api-reference/bundled.yaml`](https://docs.reply.io/api-reference/bundled.yaml),
> 1,878,601 bytes, `info.version` `3.0.0`, 281 paths), the `docs.reply.io` pages it links, and live
> probes against `api.reply.io` and `status.reply.io`. Nothing here came from a third-party
> integration directory.

## v1/v2 vs v3 — this app is v3 only

Reply publishes three API generations at the same host. Its own v1/v2 docs (Postman-published, at
`apidocs.reply.io`) say plainly: *"API V1 and V2 are still working, but both versions are outdated
and no longer supported... please use V3 going forward."* v3 (Mintlify docs at `docs.reply.io`) is
the current, actively-maintained surface with a real OpenAPI document behind it — 406 documentation
pages, 70 MCP tools, a CLI, and skills, versus v1/v2's flat Postman collection covering
campaigns/people/actions with no scoped API keys. This app implements v3 exclusively.

## The four things most likely to cost someone a day

### 1. The docs describe a 401 shape the wire doesn't produce

`docs.reply.io/api-reference/authentication` says: *"If the Authorization header is missing,
invalid, or contains a revoked API key, the API returns 401 Unauthorized with an empty response
body... Do not expect a JSON error response."*

A live probe on 2026-09-01 (`GET /v3/whoami`, once with no `Authorization` header and once with a
syntactically plausible fake token) shows the opposite: both answered
`content-type: application/problem+json`, 99 bytes,
`{"title":"Unauthorized","status":401,"detail":"Authentication credentials are missing or invalid."}`.

[`lib/client.ts`](lib/client.ts)'s `formatReplyError` and [`auth/api-key.ts`](auth/api-key.ts)'s
`test` hook both handle whichever shape actually arrives: the JSON body is preferred when present,
and the documented empty-body/`WWW-Authenticate` fallback is used only when the body genuinely is
empty.

### 2. One enum, two casings, depending on which way it travels

`companySize` on a `Contact` is spelled **PascalCase** in the request schema
(`"SelfEmployed"`, `"TwoHundred"`, …) and **camelCase** in the response schema
(`"selfEmployed"`, `"twoHundred"`, …) — confirmed directly from the OpenAPI document's own separate
request/response component schemas for `POST /v3/contacts` and `GET /v3/contacts`, not inferred.
Building a create/update request with the casing read off a `contact-get` result produces a
plausible-looking value Reply may not actually recognise.

[`lib/params.ts`](lib/params.ts) exports both option lists — `companySizeRequestOptions`
(write) and `companySizeResponseOptions` (read) — under names that make the direction impossible to
confuse, and [`actions/contact-create.ts`](actions/contact-create.ts) /
[`actions/contact-update.ts`](actions/contact-update.ts) use only the request-cased one.

### 3. `customFields` isn't the same shape on create vs. update

`POST /v3/contacts` (create) and `GET /v3/contacts` (read) both use `{key, value}`. `PATCH
/v3/contacts/{id}` (update) uses `{id, value}` **or** `{name, value}` instead — the OpenAPI document
says so explicitly in the field's own description: *"Unlike the response model which uses
`key`/`value`, the patch model accepts `id`, `name`, and `value`."* Sending `{key: "...", value:
"..."}` in an update silently fails to match the field it was meant to update.
[`actions/contact-update.ts`](actions/contact-update.ts)'s param hint states the update shape
explicitly and by name, precisely because it's the one call site where guessing the create shape is
tempting and wrong.

### 4. A sequence's `settings` object is all-or-nothing

On `POST /v3/sequences`, `settings` is optional at the top level — omit it, and Reply's defaults
apply. But the moment it's included at all, 7 of its fields (`emailsCountPerDay`,
`daysToFinishProspect`, `emailSendingDelaySeconds`, `dailyThrottling`, `disableOpensTracking`,
`repliesHandlingType`, `enableLinksTracking`) become required together. A caller who means to tweak
just `emailsCountPerDay` and leaves the rest to Reply's defaults gets a 400, not a merge.
[`actions/sequence-create.ts`](actions/sequence-create.ts) doesn't expose `settings` at all for
exactly this reason — the one call shape guaranteed valid is to omit it entirely and let Reply apply
its own defaults.

## A fifth finding, specific to the health check

`status.reply.io` (a real, claimed Atlassian Statuspage — confirmed live, page name `"Reply"`, 5
components including "Reply API") sits behind a Cloudflare rule that **blocks a request carrying no
distinctive `User-Agent`**. Measured on 2026-09-01 by varying only that one header against
`status.reply.io/api/v2/summary.json`:

| `User-Agent` sent           | Result                    |
| ---------------------------- | -------------------------- |
| (none at all)                | `403`                      |
| curl's own default (`curl/8.x`) | `403`                   |
| bare `Mozilla/5.0`            | `403`                      |
| `w6w-apps/replyio` (or almost any other explicit string) | `200`, real JSON |

This isn't "browser vs. script" — it targets specific default/generic signatures. A host's own
default outbound fetch may or may not set a `User-Agent`, so
[`health/service.ts`](health/service.ts) sets one explicitly (`STATUS_USER_AGENT`) rather than
relying on it.

A tempting sibling URL is also a trap: `reply.statuspage.io/api/v2/summary.json` answers `200` with
127,695 bytes of HTML — the documented signature of an **unclaimed** Statuspage subdomain. This app
never uses it.

## Actions

| Key | Type | What |
| --- | --- | --- |
| `whoami-get` | read | Which user the connected API key acts as (`userId`, `username`, `teamId`) |
| `contact-list` | read | Browse contacts, or look one up by exact email / LinkedIn URL |
| `contact-get` | read | Fetch one contact's full record |
| `contact-create` | perform | Add a contact |
| `contact-update` | perform | Patch specific fields on a contact |
| `contact-delete` | perform | Delete a contact (idempotent — a 404 counts as success) |
| `contact-filter` | search | Filtered/sorted contact search with field rules, list/sequence scoping, free text |
| `custom-field-list` | read | Every custom field contacts can carry (bare array, no paging) |
| `sequence-list` | read | Browse sequences, filterable by status/owner/folder/name |
| `sequence-get` | read | One sequence in full: settings, connected accounts, steps |
| `sequence-create` | perform | Create a sequence (Reply's defaults; see finding 4 above) |
| `sequence-start` | perform | Start or resume a sequence |
| `sequence-pause` | perform | Pause a running sequence |
| `sequence-contacts-add` | perform | Bulk-enroll contacts in a sequence (up to 10,000 ids) |
| `sequence-contact-list` | read | Who's enrolled in a sequence, and where each stands |
| `email-account-list` | read | Browse email accounts you can send from |
| `email-account-get` | read | One email account in full |
| `email-reporting-overview-get` | read | Team-wide email delivery/engagement totals for a period |

## What's deliberately left out

This app covers contacts, sequences, email accounts, and email reporting — the surface named in its
brief. Reply's v3 API is much larger (281 paths): AI SDR (playbooks, offers, knowledge bases,
autopilot, pending approvals), LinkedIn accounts and direct outreach, the inbox, tasks, calls
reporting, holiday calendars, webhooks, live data search, and more are all real, documented, and
simply out of scope here rather than guessed at. Sequence *step* authoring (`POST
/v3/sequences/{id}/steps`) is likewise not covered — a step's body shape is itself a
provider-specific union (email vs. LinkedIn vs. call vs. task) that deserves its own pass rather than
a partial one.

## Health

- **`service`** (`kind: "service"`, unsigned) — polls `status.reply.io`'s Atlassian Statuspage feed.
  See the User-Agent finding above.
- **`quota`** (`kind: "quota"`, signed, per-connection) — reads the `x-rate-limit-limit` /
  `x-rate-limit-remaining` / `x-rate-limit-reset` response headers off `GET /v3/whoami`. These headers
  are **not** documented on Reply's "Rate limits" page (which states only the 100/minute and
  3,000/hour ceilings and the `Retry-After` 429 behaviour) but were observed live on every response
  measured. `x-rate-limit-limit` is a window label (`"1h"`), not a number — the app maps it to the
  documented ceiling for that window rather than inventing one.
- **`auth:api-key`** (derived) — Reply's own docs single out `GET /v3/whoami` as needing *no scope at
  all* and returning only `{userId, username, teamId}`, so it doubles safely as both the connection
  probe and the `whoami-get` Action.

## Scopes

Every v3 API key carries `domain:verb` scopes (e.g. `contacts:read`, `sequences:operate`). `write`
and `operate` each also satisfy a `read` requirement in the same domain; `domain:*` and the global
`*:*` are wildcards. Each action's source comment names the narrowest scope Reply's OpenAPI document
declares for it.
