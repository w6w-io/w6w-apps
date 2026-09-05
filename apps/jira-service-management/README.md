# Jira Service Management

Manage Jira Service Management service desks, request types, customer requests, queues,
SLAs and organizations.

- **Categories** — support, project-management
- **Auth methods** — api-token, oauth2
- **Actions** — 17
- **Egress allowlist** — `*.atlassian.net`, `api.atlassian.com`
- **Website** — https://www.atlassian.com/software/jira/service-management
- **API docs** — https://developer.atlassian.com/cloud/jira/service-desk/rest/

## Same site, different API

Jira Service Management (JSM) Cloud lives on the same per-tenant `*.atlassian.net` site as
the sibling `jira` app, but it is a genuinely distinct REST surface — `/rest/servicedeskapi`
— covering service desks, request types, customer requests, queues, SLAs and organizations,
none of which exist on Jira Software's `/rest/api/3`. This app is not a re-wrap of `jira`'s
actions: every endpoint here was verified live against the vendor's own OpenAPI document,
https://developer.atlassian.com/cloud/jira/service-desk/swagger.json (also served at
`/swagger.v3.json`), fetched 2026-09-05.

Two things that surprised at build time:

- **Plain strings, not ADF, by default.** `RequestCreateDTO.isAdfRequest` and
  `CommentCreateDTO` both take plain text unless a caller explicitly opts into Atlassian
  Document Format — the reverse of Jira Software's v3 API, which the sibling `jira` app must
  always encode as ADF. Getting this backwards silently mangles every comment and
  description this app writes.
- **A bad credential doesn't get the documented JSON error shape.** Measured live
  (2026-09-05, `ecosystem.atlassian.net`) against an authenticated endpoint with no/bad
  credentials: HTTP 401 with a **plain-text** body — `Client must be authenticated to access
  this resource.` — mislabeled `content-type: text/html`. The OpenAPI document's own
  `ErrorResponse` schema (`{ errorMessage, i18nErrorMessage }`) never appears there.
  `lib/client.ts#readErrorDetail` always reads raw text first and only tries to parse JSON on
  top of it, so neither the client nor the `api-token` auth `test` hook ever assumes a shape
  that isn't actually on the wire.

## Auth

Same two Atlassian Cloud methods as the sibling `jira` app, because it's the same site:

| Method | Host | Notes |
|---|---|---|
| `api-token` | `{site}.atlassian.net` | Basic auth, account email + API token. |
| `oauth2` | `api.atlassian.com/ex/jira/{cloudId}` | OAuth 2.0 (3LO); `cloudId` resolved from `/oauth/token/accessible-resources` in `afterConnect`. |

`oauth2`'s scopes are the fine-grained, JSM-specific grants the OpenAPI document lists for
this exact surface (`read:request:jira-service-management`,
`write:request.comment:jira-service-management`, …) rather than the broad classic
`read:jira-work` / `write:jira-work` the sibling `jira` app uses — least privilege for the
resources this app actually touches. `offline_access` is included so a refresh token is
issued; without it the connection expires in an hour.

`oauth2`'s `afterConnect` does one thing the sibling `jira` app's doesn't need to: after
resolving the cloud id, it calls `GET /rest/servicedeskapi/info` on that specific cloud to
confirm Jira Service Management is actually provisioned there — a Jira Cloud site can exist
with Jira Software but no JSM license at all, which a generic
`accessible-resources` check would never catch.

## Actions (17)

| Resource | Actions |
|---|---|
| Service desk | `servicedesk-get-many`, `servicedesk-get` |
| Request type | `requesttype-get-many` |
| Customer request | `request-create`, `request-get`, `request-search`, `request-get-status`, `request-get-transitions`, `request-transition` |
| Comment | `comment-add`, `comment-get-many` |
| Participant | `participant-add`, `participant-get-many` |
| SLA | `sla-get-many` |
| Organization | `organization-get-many` |
| Queue | `queue-get-many`, `queue-get-issues` |

Status is not directly writable on a request — same rule as Jira Software — so
`request-get-transitions` lists what's currently available before `request-transition`
executes one.

**Deliberately out of scope**, and why: attachments (multipart upload, which the sandbox's
`ctx.fetch` is not for), approvals, the knowledge base, and customer/organization membership
management. Several of those live under REST paths the vendor's own docs mark
`X-ExperimentalApi: opt-in` — no stable contract to build against without that header, so
this app leaves them out rather than guess at behavior that "may change without notice".

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left. A fourth — is
*this tenant's own site* actually serving JSM — gets its own check too, because JSM sits on
a per-tenant host a cross-tenant status page cannot speak for.

### Is the vendor up?

**Service status** — <https://jira-service-management.status.atlassian.com>

```
GET https://jira-service-management.status.atlassian.com/api/v2/summary.json
```

Atlassian Statuspage. Verified live (2026-09-05) as a page **genuinely distinct** from the
sibling `jira` app's `jira-software.status.atlassian.com` — different page id
(`pv54g7ltsc24` vs. `7yh3h3y0c0x1`), self-identifies as `"Jira Service Management"`, and its
components are JSM-specific (`Jira Service Management Web`, `Service Portal`, plus the
Opsgenie incident/alert flows JSM ships alongside). Unauthenticated, CORS-enabled, cheap
enough to poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
four it performs itself.

| Auth method | Probe |
|---|---|
| `api-token` | `GET /rest/servicedeskapi/servicedesk?limit=1` |
| `oauth2` | `GET https://api.atlassian.com/oauth/token/accessible-resources` |

`servicedesk?limit=1` is documented "Permissions required: Any", so it works whether the
connection is an agent or a customer-only license — the narrowest credential this app can be
connected with. Neither probe is classified from the HTTP status alone: both read the
response body (`lib/client.ts#readErrorDetail`) because a bad credential's real shape on the
wire is plain text, not the documented JSON error envelope (see above).

### Is this tenant's own site serving JSM?

**`site`** — `GET {base}/rest/servicedeskapi/info`, unauthenticated (documented "Permissions
required: None, the user does not need to be logged in" — verified live 2026-09-05 against
`ecosystem.atlassian.net`, `support.atlassian.net` and `jira.atlassian.com`, all 200 with no
credential).

The response's `isLicensedForUse` is a genuinely JSM-specific fact worth surfacing on its
own: measured live, a real Jira Cloud site (`support.atlassian.net`) answers 200 with
`isLicensedForUse: false` — the site exists and is serving, but Jira Service Management
itself isn't purchased/enabled there. That's a different problem from "the site is down" or
"the credential expired" (the derived `auth:*` check), so it gets its own `down` verdict
with its own message rather than presenting as either of those.

### Do we have quota left?

No headroom endpoint. Measured live (2026-09-05): no `X-RateLimit-*` (or any rate-limit)
header on an unauthenticated `/info` call. Atlassian applies dynamic, cost-based limits and
answers 429 with `Retry-After` only — the same conclusion the sibling `jira` app reached for
the platform API this one shares a host with.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `site` | dependency | connection | context | degraded | 120s | `health/site.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `jira-service-management.status.atlassian.com` (for `service`) is reachable **only
inside that hook's worker** — not from any action, and not from the other checks. The spec
allows the widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

**`quota` is declared absent.** No `X-RateLimit-*` (or any quota) header was observed on any
`servicedeskapi` response, authenticated or not; a 429 carries only `Retry-After`. A declared
absence always reports `unknown`, so it carries `severity: "informational"` — otherwise it
would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified live 2026-09-05 against the public OpenAPI document
(https://developer.atlassian.com/cloud/jira/service-desk/swagger.json) and three real Jira
Cloud sites (`ecosystem.atlassian.net`, `support.atlassian.net`, `jira.atlassian.com`).
Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts
failing for everyone at once.
