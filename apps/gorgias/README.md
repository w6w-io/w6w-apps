# Gorgias

Manage Gorgias tickets, customers, messages, tags, views and satisfaction surveys.

- **Categories** — support
- **Auth methods** — basic
- **Actions** — 22
- **Egress allowlist** — `*.gorgias.com`
- **Website** — https://www.gorgias.com
- **API docs** — https://developers.gorgias.com/reference/introduction

## Auth scheme

Gorgias's private-app credential is HTTP Basic with the account's **email** as the username and a
**REST API key** as the password — verified against
[developers.gorgias.com/reference/authentication](https://developers.gorgias.com/reference/authentication)
("Use your email (username) and your API key") and against the OpenAPI spec embedded in the
reference docs, whose every operation declares `security: [{ basicAuth: [] }]`.

Gorgias also documents OAuth2 (`type: "oauth2"` in `@w6w/types` terms) as **mandatory for public
apps** distributed through their App Store — out of scope here, matching this pack's convention of
exposing only the private-app credential unless a task calls for the public-app flow.

Like `apps/freshdesk`, every Gorgias account has its own host (`<domain>.gorgias.com`), so the
domain is collected as an Auth field rather than an Action param and echoed onto the Connection's
`display` by `afterConnect` — `lib/client.ts` reads it from there.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.gorgias.com>, an Atlassian Statuspage instance. Verified live
2026-08-29: `/api/v2/status.json` returns a structured summary and `/history.atom` is a real,
currently-maintained Atom feed (25 entries, most recent dated 2026-08-27). The Atom feed is used via
the spec's `feed` mechanism (`health/service.ts`) rather than hand-parsed.

Gorgias's Statuspage instance concatenates every update for one incident into a **single** `<entry>`
(newest update first) instead of emitting one entry per update — the opposite shape from Mistral's
and BambooHR's feeds in this pack, where the newest entry for a long-resolved incident still carries
the incident's original title. The same word-boundary `resolved|completed|monitoring` regex those
apps use against the whole `summary` still applies correctly here, since a `resolved` marker
anywhere in the concatenated history is the same signal either way.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

The `basic` auth method probes:

```
GET /account
```

The current account's own metadata (domain, settings, status) — no scope required, and it never
echoes the caller's credential. A 401 is classified from Gorgias's own `{ "error": { "msg": "..." } }`
body (verified live) rather than the bare status code.

### Do we have quota left?

`X-Gorgias-Account-Api-Call-Limit` (format `used/limit`, e.g. `10/40`), plus `Retry-After` on 429 —
verified against
[developers.gorgias.com/reference/limitations](https://developers.gorgias.com/reference/limitations).
Gorgias meters with a leaky bucket: API-key integrations get 40 requests per 20-second window (80 for
OAuth2 apps, a smaller 10-second window for Enterprise accounts).

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` (feed) |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `domain` | dependency | connection | context | degraded | 120s | `health/domain.ts` |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |

`domain` is the same idiom `apps/freshdesk` and `apps/zendesk` use for a per-tenant API: an
unauthenticated `GET /account` where a **401 is a pass** (the domain resolves and the API answers) and
a **404 is down** (the subdomain doesn't exist — the account may have been renamed). Verified live
2026-08-29 against a real Gorgias domain (`401 {"error":{"msg":"Unauthorized."}}`) and a made-up one
(`404`, a plain Flask HTML page).

## Deviations and scope

Gorgias's own docs describe a much larger surface than the ticket/customer/message/tag/view/survey
core this app targets. Deliberately left out, with why:

- **OAuth2** — documented as mandatory only for *public* apps distributed through Gorgias's App
  Store; this app exposes the private-app Basic-auth credential.
- **Custom fields, macros, rules, integrations, jobs, teams, users, widgets, voice calls, metric
  cards and legacy statistics** — configuration/reporting objects, not named by the ticket /
  customer / message / tag / view / survey core surface this task specified.
- **`GET /tickets/{ticket_id}/messages`** (list a ticket's messages) is marked **deprecated** in
  Gorgias's own reference docs, in favor of `GET /messages?ticket_id=...` — this app implements only
  the latter (`message-get-many`).
- **`list-satisfaction-surveys`'s own OpenAPI schema returns a bare JSON array**, not the
  `{ object, uri, data, meta }` cursor envelope every other list endpoint in this app shares (tickets,
  customers, tags, views, messages) — even though the operation still accepts `cursor`/`limit`/
  `order_by`. `survey-get-many`'s output is a plain `surveys` array rather than the `data` key used
  everywhere else, to match.
- **Ticket assignment (`assignee_user`/`assignee_team`), custom fields, and ticket-tag
  add/remove/set endpoints** are left out of `ticket-create`/`ticket-update` to stay within a focused
  action set — tags can still be attached at creation time via the `tags` param.

---

Researched and endpoint-verified 2026-08-29 against developers.gorgias.com/reference/* (the
OpenAPI schema embedded in each reference page) and status.gorgias.com.
