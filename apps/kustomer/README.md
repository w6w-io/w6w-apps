# Kustomer

Manage Kustomer customers, conversations, messages, notes, custom objects and CSAT surveys.

- **Categories** — support, crm
- **Auth methods** — api-key
- **Actions** — 23
- **Egress allowlist** — `*.api.kustomerapp.com`
- **Website** — https://www.kustomer.com
- **API docs** — https://developer.kustomer.com/kustomer-api-docs/reference/introduction

## Every organization has its own host

Kustomer, like Freshdesk and Zendesk, is addressed at a per-organization subdomain:
`https://{orgname}.api.kustomerapp.com`. The vendor's own "Getting started" page states
this explicitly and warns that omitting the org name from the base URL produces a
cross-pod error ("Auth token associated with pod prod2 but request is being handled by
prod1"). `w6w.network.allow` therefore declares the wildcard `*.api.kustomerapp.com`, and
the org subdomain is collected as an **Auth field** (`orgSubdomain`) rather than an
Action param — it identifies the account, so it belongs to the Connection, mirroring
`apps/freshdesk`.

## Auth scheme

`Authorization: Bearer {{API_KEY}}`, verified against
developer.kustomer.com/kustomer-api-docs/reference/authentication. Admins mint the key
under **Settings > Security > API Keys** and can scope it to an API role.

## Actions

| Resource | Actions |
|---|---|
| Customer | Create, Get, Find by Email, Find by External ID, List, Update |
| Conversation | Create, Get, List, Update, Add Tags |
| Message | Create, List |
| Note | Add to Conversation, List |
| Klass / KObject | List Klasses, List KObjects, Create KObject |
| Access management | List Teams, List Users, Get User |
| Satisfaction | List Surveys, Get Response |

Every request/response shape was verified against Kustomer's own machine-readable
OpenAPI documents (embedded as JSON in each `developer.kustomer.com/kustomer-api-docs`
reference page — the "Core Resources" and "Access Management" categories), not inferred
from a third-party integration directory.

## Deliberately left out — and why

- **Composing and sending outbound customer messages.** `POST /v1/conversations/{id}/messages`
  ("Create message from conversation") only *logs* a message on a conversation's
  timeline — its schema (`CreateaMessagefromConversationRequest`) carries no
  `body`/`htmlBody` content field at all (verified: absent from every property the
  schema declares). The fields that DO carry composed content (`body`, `htmlBody`,
  `to`, `from`) live on Kustomer's separate `Draft` resource
  (`draft_email`/`draft_chat`/`draft_sms`/`draft_whatsapp`/...), whose request schema is
  a `oneOf` discriminated by `channel` with a materially different property set per
  branch — a shape this app's first version doesn't attempt to model faithfully.
- **`DELETE /v1/conversations/{id}/tags`** ("Remove tags from conversation"). Its OAS
  operation declares no request body and no query parameter naming which tag(s) to
  remove, so which tags a call would actually target can't be confirmed from the
  documented shape. `conversation-add-tag` (append) is fully documented and included.
- **Customer/conversation search** (`POST /v1/customers/search`,
  `POST /v1/customers/archive/search`). The request schema is a general Elasticsearch-
  style query builder (`and`/`or`/`not`/`sort`/`aggs`, each an arbitrary nested object) —
  out of scope for a first version; the plain lookups (`customer-find-by-email`,
  `customer-find-by-external-id`, `customer-get`) cover the common case.
  `sort` on the plain list actions is a free-text field name, not this query DSL.
- **Audit logs, bulk operations, SLAs, spam senders, attachments, business
  schedules, drafts/forwards, sub-statuses, snoozes, tracking events.** All real,
  documented Core Resources endpoints, left out to stay within this app's
  customers/conversations/messages/notes/klasses/access-management/satisfaction scope.

## Health checks

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — `service.ts` reads Kustomer's real Statuspage.io incident feed,
`https://status.kustomer.com/history.atom` (verified: genuine
`content-type: application/atom+xml`, real `<entry>` elements). Kustomer's feed keeps
**one `<entry>` per incident**, with every update (Investigating → Identified →
Monitoring → Resolved) appended to that entry's content newest-first — verified by
counting `<id>` values in a live fetch (25 entries, 25 distinct ids). So an incident's
current state is whichever status word appears *first* in its plain-text summary, not
whether the word "Resolved" appears anywhere in it; `service.ts`'s `check` looks for the
first of `Resolved|Monitoring|Identified|Investigating` rather than testing a fixed
prefix.

### Is this credential live?

The Auth `test` hook probes `GET /v1/users/current` ("Get Current User") — a scope-free
whoami usable by a machine (API-key) user, requiring no role beyond a live token. Its
response body carries only display metadata (name, email, role list) and password
*metadata* (booleans + a timestamp, never a password) — never the credential itself.

### Do we have quota left?

`quota.ts` reads `x-ratelimit-limit` / `x-ratelimit-remaining` off the same whoami probe
— every Kustomer response carries them, verified against the vendor's Rate limiting
reference page. `x-ratelimit-reset` (UTC epoch seconds) appears only once the limit is
already exceeded, so it isn't read as a "remaining time" figure here.

### Is this org's host reachable?

`domain.ts` — an unauthenticated request to `GET /v1/users/current` on this
connection's own org host. Kustomer requires auth on every endpoint (there is no
unauthenticated ping), so a **401 is a pass**: it proves the org's host resolves, TLS
terminates, and the API answers. Only a transport failure, 404 (org renamed/gone), or
5xx counts as down.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | — | `health/service.ts` (Statuspage Atom feed) |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `domain` | dependency | connection | context | degraded | 120s | `health/domain.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

## Rate limits

Verified against developer.kustomer.com/kustomer-api-docs/reference/rate-limiting:
per-organization limits vary by plan (300–2,000 rpm), machine-user searches are limited
separately (100 rpm), and several object types (conversation, company, message,
customer) carry their own per-record update ceiling on top of the account-wide limit.

---

Researched and endpoint-verified 2026-08-29 against
developer.kustomer.com/kustomer-api-docs (the hosted OpenAPI 3.0 documents for the "Core
Resources" and "Access Management" categories, plus the Getting Started, Authentication,
Pagination, Rate limiting and Errors reference pages) and status.kustomer.com. Status
surfaces and per-org limits move; re-check if a probe starts failing for everyone at
once.
