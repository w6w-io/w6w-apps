# PhantomBuster

Launch and monitor PhantomBuster **Phantoms** (agents), read the containers and result data they
produce, and check organization resource headroom, on the **PhantomBuster API v2**.

- **Categories** — marketing, crm, developer-tools
- **Auth methods** — api-key
- **Actions** — 14
- **Health checks** — 3 (`service`, `quota`, ~~`request-rate`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.phantombuster.com` (the `service` check adds
  `status.phantombuster.com` to its own hook allowlist, never to the app's)
- **Website** — https://phantombuster.com/
- **API reference** — https://hub.phantombuster.com/reference
- **OpenAPI spec** — https://github.com/phantombuster/public-gists/blob/master/swagger-api-v2.json
- **Status page** — https://status.phantombuster.com/

PhantomBuster runs **Phantoms** — pre-built or custom browser-automation agents that scrape and act
on sites like LinkedIn, Sales Navigator and Instagram. The shape of most PhantomBuster automations is
the same three beats this app centres on: launch an agent, poll the container it creates, and read
the output or result object that container produces.

> **Everything below was verified against PhantomBuster's own sources on 2026-09-01** — its
> machine-readable OpenAPI 3.0 document (mirrored in full at
> [`github.com/phantombuster/public-gists/blob/master/swagger-api-v2.json`](https://github.com/phantombuster/public-gists/blob/master/swagger-api-v2.json),
> `info.version` `2.0.0`, and re-served per-endpoint at `hub.phantombuster.com/reference/*.md`), plus
> live probes against `api.phantombuster.com` and `status.phantombuster.com`. Nothing here came from
> a third-party integration directory.

## The three things most likely to cost someone a day

### 1. The vendor's own prose guide documents a different, older API

`hub.phantombuster.com/docs/api` — the page titled simply "API", linked right from the reference
nav — describes base URL `https://phantombuster.com/api/v1`, header `X-Phantombuster-Key-1`, and
JSend-style envelopes (`{"status":"success","data":{...}}` / `{"status":"error","message":"..."}`).
That is the **legacy v1** surface. Every endpoint this app calls — agents, containers, orgs — is
documented in the reference nav's individual pages as **v2**, with a completely different base,
header and error shape:

| | The prose guide says (v1) | The OpenAPI doc + live wire say (v2, what this app uses) |
|---|---|---|
| Base URL | `https://phantombuster.com/api/v1` | `https://api.phantombuster.com/api/v2` |
| Auth header | `X-Phantombuster-Key-1` | `X-Phantombuster-Key` |
| Error shape | `{"status":"error","message":"..."}` | `{"status":"error","error":"..."}` |

The v2 header and error shape were confirmed **live** on 2026-09-01: a request with no key answers
`401 {"status":"error","error":"Missing session cookie or API key (use HTTP header
'X-Phantombuster-Key' or query string parameter 'key')"}`; a wrong key answers
`401 {"status":"error","error":"API key not found"}`. Coding against the guide's `-Key-1` header (or
its `message` field, or its v1 base URL) against the real, current, well-documented v2 endpoints is
exactly the trap: every one of those details is confidently wrong for this API. See
[`lib/client.ts`](lib/client.ts).

### 2. Ordinary reads hand you live credentials — and one of them is worse than most apps in this pack

| Endpoint | Field | What it actually is | Gated by the vendor? |
|---|---|---|---|
| `GET /orgs/fetch` | `identityTokens[].token` / `.magic_link` | Magic-link **login tokens** for the whole org | No — returned unconditionally |
| `GET /orgs/fetch` | `qualificationFlow.sessionCookie` | A raw session cookie **pasted during onboarding**, when the org went through it | No — returned unconditionally |
| `GET /orgs/fetch` | `proxies` | Proxy-pool addresses **and passwords** | Yes — only with `?withProxies=true` |
| `GET /orgs/fetch` | `crmIntegrations[].refreshToken` | HubSpot/Salesforce/Pipedrive OAuth **refresh tokens** | Yes — only with `?withCrmIntegrations=true` |
| `GET /agents/fetch` | `proxyPassword` | That agent's own dedicated proxy credential | No — returned unconditionally |

`identityTokens` and `qualificationFlow.sessionCookie` are stripped by `org-get`
(`stripOrgSecrets` in [`lib/params.ts`](lib/params.ts)) because the vendor hands them back with no
opt-in required. `proxies` and `crmIntegrations` are worse in kind — a CRM **refresh token** is a
standing credential to a third-party account — but this app never has to strip them, because it
never sets the two query flags (`withProxies`, `withCrmIntegrations`) that would make PhantomBuster
include them in the first place. `org-resources-get`, the other org read, has no secret-bearing
fields at all per its schema.

`agent-get` (`GET /agents/fetch`) always returns that agent's `proxyPassword`, stripped by
`stripAgentSecrets`. It also always returns `argument` and `agentObject` — the agent's launch
configuration and scratch state, as an **opaque JSON-encoded string whose shape is defined by the
agent's own script**, not by this API. For many catalog agents (LinkedIn, Sales Navigator,
Instagram, …) that opaque blob is exactly where the target site's session cookie lives. This app has
no way to safely parse a vendor-specific, per-agent-type blob without risking corrupting a caller's
own data — the same trap this pack's Apify app documents for its own opaque fields — so `agent-get`
returns it verbatim rather than guessing at a parse, and callers should treat its result as
sensitive. `agent-list` (`GET /agents/fetch-all`) gates that same field behind an explicit
`withArgument=true` query flag, which this app never sets — so a list read never has that material to
leak in the first place.

The invariant is enforced rather than remembered: a test in
[`tests/index.test.ts`](tests/index.test.ts) derives, from every action's own source, the set of
actions that request a secret-bearing path, and asserts it is exactly the set that calls
`stripOrgSecrets`/`stripAgentSecrets`. Adding a new call to `/orgs/fetch` or `/agents/fetch` without
stripping fails the suite.

### 3. No documented rate limiting anywhere

Neither the OpenAPI document nor any prose guide mentions a rate limit, a `429` status, or an
`X-RateLimit-*` header. A live 401 response carried no such header either. This is a stronger absence
than Apify's in this same pack — Apify at least documents fixed ceilings in prose even though it
exposes no remaining count; PhantomBuster documents no policy at all. `health/request-rate.ts`
declares this `unavailable` with `severity: "informational"` rather than silently omitting the check
or leaving the App pinned at `unknown` forever.

## What's deliberately out of scope

- **`GET /users/fetch-me`** is not used anywhere in this app — not as an action, not as the auth
  probe. It is the one endpoint in this app's whole surface marked `security: []` in the vendor's own
  OpenAPI document (every other endpoint requires the declared `apiKeyAuth`), its own description
  says it may **create a new session as a side effect of a GET** ("If a sessionId is not provided the
  endpoint will create a new session and return the newly created id"), and its response
  unconditionally includes a live `sessionId` and a `zendeskToken`. A health probe's response is
  stored and displayed on every check; this app declines to make that call at all rather than mint
  (and expose) a session on a timer. See `auth/api-key.ts#WHY_NOT_USERS_FETCH_ME`.
- **`/identities/*`** (magic-link identity search/save, used by PhantomBuster's own "Identities"
  feature) are not implemented. Their request bodies are documented, but their **response shapes are
  not** — the OpenAPI document gives `/identities/search` only a bare `200`/`400`/`500` description
  with no schema. Per this pack's rule, an endpoint whose shape cannot be confirmed is left out rather
  than guessed at.
- **`/agents/launch-soon`, `/agents/unschedule-all`, `/scripts/*`, `/branches/*`, `/org-storage/*`,
  `/ai/*`** and the captcha-solving endpoints are all documented but out of scope for this app's
  focus (launch → monitor → read); they were deliberately not built rather than rushed.
- **`agent-launch`'s response body is not asserted.** The vendor's OpenAPI document declares only a
  success description ("Agent launched successfully.") for `200`, no schema. Rather than invent a
  `containerId` field the spec does not promise, this action returns the real HTTP status plus
  whatever the vendor actually sends (parsed if JSON), and nothing is asserted beyond that.
- **`container-output`'s `mode=raw`** is not exposed. The vendor's own parameter description says raw
  mode answers as plain text instead of JSON, but the OpenAPI schema still types the `200` response as
  `application/json`, and this app's client always parses as JSON (see `lib/client.ts`). Rather than
  guess which content type a given call will answer with, this action only ever requests the default
  (`json`) mode.

## Health checks

- **`service`** — `status.phantombuster.com`, a real Atlassian Statuspage (verified live 2026-09-01:
  `/api/v2/summary.json` answers 200 with 2,545 bytes of genuine JSON self-identifying as
  `"name": "Phantombuster"`). Seven flat components: Phantoms (the agent-execution fleet), API,
  Phantom file delivery, Phantom email notifications, Content CDN, Image CDN, Developer
  documentation. PhantomBuster is SaaS-only, so this check is left at the `degraded` default severity.
- **`quota`** — `GET /orgs/fetch-resources`, which returns both a remaining reading (top-level) and
  the plan ceiling (nested `plan.*`) for the same 13 dimensions in one call: daily/monthly execution
  time, mail/captcha/discovered-mail/AI/SERP credits, and S3 storage. **Which direction the top-level
  numbers read (remaining vs. used) is a documented assumption, not a live-confirmed fact** — no
  credentialed account was available while building this app. See the reasoning and the three grounds
  for the reading in [`health/quota.ts`](health/quota.ts).
- **`request-rate`** — declared `unavailable`, `informational` severity. See finding 3 above.

The credential-liveness probe (`auth/api-key.ts`) and the `quota` check deliberately read the exact
same endpoint, `GET /orgs/fetch-resources`: it needs a credential, is reachable without any special
scope, and returns nothing secret — the same reasoning this pack's Apify app applies to
`/v2/users/me/limits`.

## Auth

**API key** (`X-Phantombuster-Key` header) — PhantomBuster > your avatar (top right) > Settings >
API key. Shown once; regenerate it there if lost or compromised. An optional, non-secret
**Organization ID** field is also collected: nearly every v2 endpoint accepts an optional
`X-Phantombuster-Org` header ("not necessary when using a third party key" per the vendor's own
parameter description), needed only for a key that can act across more than one organization.

## Actions

**Agents** — `agent-list`, `agent-get`, `agent-launch`, `agent-stop`, `agent-delete`,
`agent-fetch-output` (incremental console-output/status polling), `agent-fetch-deleted`.

**Containers** — `container-list`, `container-get`, `container-output`, `container-result-object`
(the value an agent script set via `buster.setResultObject()` — returned as a raw string, since the
vendor types it as a plain nullable string an agent script can populate with anything, not
guaranteed JSON).

**Organization** — `org-get`, `org-resources-get`, `org-running-containers-list`.

`agent-stop` and `agent-delete` are marked `idempotent: true` — safe to retry, since stopping an
already-stopped agent or deleting an already-deleted one causes no further harm. `agent-launch` is
the only `perform` action marked `idempotent: false`: PhantomBuster documents no idempotency key for
launching an agent, and a retry always queues another run.
