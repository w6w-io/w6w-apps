# AWeber

Manage AWeber email lists, subscribers and broadcast newsletters — add, find, update and move
subscribers, create and schedule broadcasts, and manage tags, custom fields and segments, on the
**AWeber API v1**.

- **Categories** — email, marketing
- **Auth methods** — oauth2
- **Actions** — 33
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:oauth2`
- **Egress allowlist** — `api.aweber.com` (`auth.aweber.com` is allowed implicitly by the runtime for
  the declared OAuth `authorizationUrl`/`tokenUrl`; the `service` check adds `status.aweber.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://www.aweber.com/
- **API docs** — https://api.aweber.com/ (yes, the API host itself; see below)
- **Status page** — https://status.aweber.com/

AWeber is an email newsletter platform built around three resources: **Lists** (audiences),
**Subscribers** (the people on them), and **Broadcasts** (the newsletters sent to them). This app
covers that surface plus the account, tag, custom field and segment resources every list-scoped
action needs.

> **Everything below was verified against AWeber's own sources on 2026-09-05** — its OpenAPI 3.0.2
> document, served fully resolved (every `$ref` already inlined) as the embedded Redoc state on
> `https://api.aweber.com/` itself, plus live probes against `api.aweber.com` and
> `status.aweber.com`. Nothing here came from a third-party integration directory.

## The five things most likely to cost you a day

### 1. The real developer portal is not the URL you'd guess

`https://developers.aweber.com/` — the URL most searches surface — 301-redirects to AWeber's
marketing homepage, not a developer portal. The old candidate, `labs.aweber.com/docs/reference/1.0`,
is a dead 404. The actual, current, machine-readable reference is served **from the API host
itself**: `https://api.aweber.com/` renders a full Redoc page titled "AWeber API & Webhook
Documentation," with the resolved OpenAPI 3.0.2 spec embedded in the page and also fetchable
(un-resolved, `$ref`s and all) at `https://api.aweber.com/swagger.yaml`. `labs.aweber.com/apps` — the
"My Apps" console where a `client_id`/`client_secret` is minted — is still live.

### 2. An unsigned request answers an OAuth *1.0a* error — the API has not reverted

Probe `GET /1.0/accounts` with no `Authorization` header at all and AWeber answers:

```json
{"error":{"documentation_url":"https://api.aweber.com/#badrequest","message":"Missing oauth parameters: oauth_consumer_key, oauth_nonce, oauth_signature, oauth_signature_method, oauth_timestamp, oauth_access_key","status":400,"type":"MissingOAuthParametersError"}}
```

That reads exactly like a legacy OAuth 1.0a API — and AWeber's API **did** run on OAuth 1.0a before
2022, and still accepts it for existing integrations. But this response is the fallback for a request
carrying no recognizable auth scheme at all, not evidence the current API expects OAuth 1. The moment
a `Authorization: Bearer <token>` header is present — even a garbage one — the response switches to
the OAuth 2.0 shape (`401 invalid_token`), and the OpenAPI document's own security scheme is
unambiguous: `type: oauth2`, `authorizationCode` flow, PKCE-capable. AWeber's own migration guide
says it outright: "OAuth 2.0 is the successor to OAuth 1 ... please plan to move to OAuth 2.0 as soon
as you are able." This app implements OAuth 2.0 only.

### 3. Two unrelated error envelopes coexist

A REST-layer failure (bad request, not found, a documented `ForbiddenError`) answers:

```json
{"error": {"type": "SubListNotFoundError", "message": "...", "status": 404, "documentation_url": "..."}}
```

A bearer-token failure at the resource server answers the RFC 6750 shape instead — a **bare string**,
not an object:

```json
{"error": "invalid_token", "error_description": "The access token is invalid or has expired"}
```

Code that reads `body.error.message` unconditionally gets `undefined` on the second shape.
[`lib/client.ts`](lib/client.ts)'s `formatAweberError` and [`auth/oauth2.ts`](auth/oauth2.ts)'s
`test` hook both branch on `typeof body.error` to handle either.

### 4. Three incompatible ways to learn what you just created — and three pagination shapes

| Endpoint                       | Success                       | How you learn the new/updated entity      |
| ------------------------------- | ------------------------------ | ------------------------------------------ |
| `POST` add subscriber / create custom field / move subscriber | `201`, **no body** | Only a `Location` header (see `locationId` in `lib/client.ts`) |
| `PATCH` update subscriber / update custom field | non-standard **`209`** | The updated entity, in the body |
| `POST` create broadcast, `PUT` update broadcast | plain `200` | The entity, in the body |

`res.ok` (used internally by every action here) is `true` for any 2xx status, so `209` needs no
special handling to *succeed* — but code that checks `res.status === 200` treats every successful
update as a failure.

Pagination has the same three-way split. Most collections wrap `{"entries": [...]}` and page with
`ws.start`/`ws.size` (offset, max 100). Broadcast opens/clicks page with a cursor pair instead —
`after`/`before` (mutually exclusive) plus `page_size` — with no way to skip to an arbitrary offset.
And `GET .../tags` answers a **bare array of strings**, no envelope, no paging, at all:

```json
["alpha", "beta", "gamma"]
```

### 5. `GET .../broadcasts` has no "give me everything" mode, and drafts have a hidden scope

`status` is a **required** filter (`draft` | `scheduled` | `sent`) — there is no way to list every
broadcast regardless of state in one call. And AWeber's own caveat on `draft`: "only returns API
created Broadcast drafts" — a draft someone is composing in the AWeber web UI never appears here, and
cannot be updated or deleted through this API either (`404`/`409` instead).

## Smaller findings, still worth knowing before you hit them

- **Two body fields are the literal strings `"true"`/`"false"`, not JSON booleans.** Add Subscriber's
  `update_existing` and `strict_custom_fields` are documented as a two-value string enum. Sending the
  real boolean `true` (what a checkbox naturally produces) is outside the schema.
  `actions/subscriber-add.ts` accepts a normal boolean param and converts it.
- **`tags` means something different on Add vs. Update Subscriber.** Adding a subscriber takes a flat
  array to set as their tags. Updating one takes `{"add": [...], "remove": [...]}` — additive/
  subtractive, not a replacement. `actions/subscriber-update.ts` exposes separate "Add tags"/"Remove
  tags" params rather than reusing the flat shape.
- **"Not tagged" is the query key `tags_not_in`**, not `not_tags` or `exclude_tags` — one of over
  twenty documented `find` filters (`actions/subscriber-find.ts` exposes the common ones directly and
  the rest via an "Extra filters" JSON passthrough, using AWeber's own query names).
- **Whoami endpoints can leak.** `GET /1.0/accounts` is safe (`entries[].id`, `company`, collection
  links — no secret). It is deliberately the only endpoint this app's `test`/`afterConnect` hooks
  call.
- **Rate limit is prose-only.** "AWeber API requests are limited to 120 requests per minute, per
  customer account" is the entire documentation of it — no response header, on any endpoint, signed
  or not, carries a remaining count or a reset time (verified live). `health/quota.ts` declares this
  absence rather than guessing at headroom from whether a call happened to succeed.
- **A `POST /purchases` call can silently create a subscriber.** AWeber's own words: "If the
  subscriber does not exist, it is created. If the subscriber exists, then it will be updated. This
  endpoint combines 3 api calls into one." Worth knowing before wiring it to a checkout webhook that
  might fire for people not already on the list.

## What isn't here

- **OAuth 1.0a** — still accepted by the API for legacy integrations, but AWeber's own guidance is to
  migrate off it, and this app only ever implements OAuth 2.0.
- **Legacy Campaigns endpoints** (`/campaigns`, `/campaigns/{type}{id}/stats`) — AWeber's own
  documentation states plainly that "The Campaigns email automation platform within the AWeber web
  platform is not currently supported by the AWeber API" for anything beyond reading followup/
  broadcast metadata already covered by the Broadcasts resource above. Not implemented here to avoid
  presenting a half-supported surface as a real integration point.
- **Web forms, split tests, and landing pages** — read-only collections this pass didn't cover; add
  them as a follow-up if a workflow needs them. Nothing about their shape is uncertain, they were
  simply out of scope for this pass.
- **Beta `2.0-beta` endpoints** — the OpenAPI document itself warns these are early-access previews
  of a future v2 API, not a stable surface to build against yet.

## Health checks

- **`service`** — `status.aweber.com`, a real Atlassian Statuspage (verified live: a bogus sibling
  path 404s with 0 bytes; the page names itself `"AWeber"`; its ten components are AWeber's own,
  including one literally named `API`). Unsigned, `kind: "service"`.
- **`quota`** — declared `unavailable`, `severity: "informational"`. See finding 5 above.
- **`auth:oauth2`** — derived automatically from the `test` hook, which probes `GET /1.0/accounts`.
