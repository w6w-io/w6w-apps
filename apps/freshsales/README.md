# Freshsales

Manage Freshsales Suite (Freshworks CRM) contacts, accounts and deals.

- **Categories** — crm
- **Auth methods** — api-key
- **Actions** — 20
- **Egress allowlist** — `*.myfreshworks.com`
- **Website** — https://www.freshworks.com/crm/sales/
- **API docs** — https://developers.freshworks.com/crm/api/

## Host pattern — different from the sibling Freshworks apps

Freshdesk and Freshservice (also in this pack) put the API directly on the account
subdomain — `acme.freshdesk.com`. **Freshsales does not.** It nests the API under a
shared `myfreshworks.com` domain with a `/crm/sales/api` path:

```
https://acme.myfreshworks.com/crm/sales/api
```

Verified against every sample `curl` on developers.freshworks.com/crm/api/.
`*.freshsales.io` appears exactly once on that docs page (inside one support-article
URL) and is **not** the API host — do not allowlist it.

## No flat "list all" endpoint

Freshdesk/Freshservice list a resource by hitting the collection directly
(`GET /tickets`). Freshsales has no equivalent — "List All Contacts" is
`GET /contacts/view/[view_id]`, not `GET /contacts`. Every listing goes through a
saved *view*, and view ids are per-account (there is no fixed "All Contacts" id you
can hardcode). Two consequences for this app:

- `contact-get-many` / `account-get-many` / `deal-get-many` each take a required
  `viewId` param.
- `view-get-many` is the action that resolves one: it calls `GET /[resource]/filters`,
  which returns the account's saved views (including the built-in "All Contacts" /
  "My Deals" / etc.) with their ids.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://freshsales.freshstatus.io>

Human incident-history page only (Freshstatus-hosted, same platform as Freshdesk's
`updates.freshdesk.com`). Verified `/history.atom`, `/history.rss`, `/api/v2/status`
and `/badge.json` all 404 — no JSON API or feed is reachable. The `domain` dependency
check probes this connection's own account host instead.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one
of the three it performs itself.

The `api-key` auth method probes:

```
GET /contacts/filters
```

Freshsales publishes no whoami endpoint, so this reuses the saved-views list every
list action needs anyway — scope-free, a single small read, and its response never
echoes anything the caller owns (only the account's view definitions). Classified by
body: a live credential returns `{"filters": [...]}`; a dead one returns Freshsales's
own `{"errors": {"code", "message"}}` shape.

### Do we have quota left?

Freshsales documents a cap in prose ("1000 API requests per hour per account", same
§Errors section as the 429 status code) but publishes **no response header** (or any
other mechanism) to read the remaining headroom from — verified: no `X-` header of any
kind appears anywhere on the docs page except the unrelated `X-UA-Compatible` meta tag.
This is a real difference from the sibling Freshdesk/Freshservice apps, which both
expose `X-RateLimit-*` headers.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | app | none | informational | — | _declared absent_ |
| `domain` | dependency | connection | context | degraded | 120s | `health/domain.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

**`service` and `quota` are both declared absent.** freshsales.freshstatus.io is a human
incident-history page with no JSON API or feed; Freshsales's docs describe a rate limit
in prose but expose no header to read headroom from. A declared absence always reports
`unknown`, so both carry `severity: "informational"` — otherwise either would pin every
verdict for this app at `unknown` forever.

## Auth scheme

Freshsales authenticates with a bespoke `Authorization` header — not Basic, not
Bearer:

```
Authorization: Token token=<api_key>
```

Verified against developers.freshworks.com/crm/api/ §Authentication and every sample
`curl` on that page (all 30+ carry `-H "Authorization: Token token=…"`). This is a
**different scheme** from the sibling Freshworks apps — Freshdesk and Freshservice
both use HTTP Basic with the key as the username and a throwaway password. Modelled
as `type: "custom"` rather than copying their `type: "basic"` verbatim, the same way
this pack models Anthropic's `x-api-key` header.

## What would have cost someone a day

1. **The host is not `acme.freshsales.io`, and it isn't `acme.freshdesk.com`-shaped
   either.** It's `acme.myfreshworks.com/crm/sales/api` — a shared corporate domain
   with a product path, not a per-product subdomain. Reusing the Freshdesk/Freshservice
   host-building code verbatim (swap the suffix, keep the shape) would silently 404
   every request.
2. **There is no "list all contacts" endpoint, at all.** Every listing goes through a
   saved view id, discovered via a separate `/filters` call. A port of the
   Freshdesk/Freshservice `get-many` pattern (hit the collection, page with `page`)
   would 404 immediately — there is no bare `/contacts` GET route to hit.
3. **The auth scheme looks like Basic auth's cousins but isn't.** `Authorization: Token
   token=<key>` is neither `Basic <base64>` nor `Bearer <key>` — sending either of those
   (an easy mistake, since both sibling Freshworks apps use Basic) gets a 401 with no
   hint that the header *shape* is the problem, not the key.
4. **A delete's response body is the bare JSON literal `true`**, not `{}` or a 204 — a
   client that assumes every 2xx body is an object will throw trying to read a
   property off a boolean.

## Deviations / scope

- Marketing Lists, the CPQ module (Products/Documents), Custom Modules, Phone call
  logs and the Search/Lookup endpoints are out of scope — none are core
  sales-workflow objects, and the pack's action-count budget doesn't call for them.
- No webhook/trigger surface — that is a Trigger, not an Action.
- `task-get-many`'s `filter` param is free text, defaulted to `open`. The docs'
  prose additionally describes "due today", "due tomorrow", "overdue" and
  "completed" filters, but only `open` appears in a worked `curl` example — the
  exact wire spelling of the others is not shown, so this app does not assert them
  as a closed set of options.
- `account-delete`/`deal-delete` are assumed to return the same bare `true` body
  verified for `contact-delete` (all three are the same REST pattern on the same
  API), rather than a separately confirmed sample — the docs' own response section
  for those two calls did not render in this app's research pass.

---

Researched and endpoint-verified 2026-09-01 against developers.freshworks.com/crm/api/.
Status surfaces move; re-check if a probe starts failing for everyone at once.
