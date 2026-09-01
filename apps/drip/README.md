# Drip

Manage Drip subscribers, tags, events and email series campaigns.

- **Categories** — marketing
- **Auth methods** — api-key
- **Actions** — 14
- **Egress allowlist** — `api.getdrip.com`
- **Website** — https://www.getdrip.com
- **API docs** — https://developer.drip.com

Not to be confused with **DripJobs** — an unrelated field-service CRM. This app targets
Drip, the email-marketing platform at getdrip.com.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.drip.com>, a real Atlassian Statuspage. Verified
directly (2026-09-01), not assumed from a sibling app: `GET /api/v2/summary.json`
returns `"page":{"name":"Drip","url":"https://status.drip.com"}`, and a nonsense sibling
path (`/api/v2/definitely-not-real-zzz.json`) 404s, ruling out a catch-all/unclaimed
page. Its component list names **"REST and JavaScript APIs"** explicitly — the exact
surface this app calls — alongside User Interface, Email Sending, New People Adds,
Workflows and Rules, Support Systems, and Analytics. This is not a marketing-only page.

### Is this credential live?

This is what the Auth `test` hook does. The `api-key` auth method probes:

```
GET /v2/user
```

Classified by the response **body** (a `users: [...]` array), never the status code
alone — and `/v2/user` never echoes the API token itself, so the probe can't leak the
credential back into a log.

### Do we have quota left?

Drip's "Rate Limiting" section documents `X-RateLimit-Limit` / `X-RateLimit-Remaining`
response headers, shown unconditionally in the docs' own example — unlike some vendors
that only emit them once a caller is already at the ceiling. `health/quota.ts` reads
them off a signed `GET /v2/user` (the same cheap call `auth.test` uses). The published
ceiling is **3,600 individual requests/hour per token**; batch endpoints are metered
separately (50 requests/hour, up to 1,000 records each) and this app does not use the
Batch API.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

## Auth scheme

HTTP Basic, with the API token as the **username** and an **empty password** — verified
against developer.drip.com's "Authentication" section: *"The API Token is the username
portion of the Basic Authentication scheme, with an empty password. (Note the trailing
colon to indicate an empty password.)"* The docs' own curl example confirms it:
`-u YOUR_API_KEY:` (a bare trailing colon, nothing after it). `sign()` sends
`Basic base64("<token>:")`.

Almost every endpoint is scoped `/v2/:account_id/...`, so the numeric **Account ID** is
collected as a second Auth field (alongside the token) rather than repeated on every
action, and echoed onto the connection's `display` data by `afterConnect` — the same
shape as `apps/freshdesk`'s per-account `domain` field.

## Findings worth flagging

- **A likely doc typo on "Remove a tag from a subscriber."** The page's prose "HTTP
  Endpoint" line for that one reads `DELETE /:account_id/subscribers/:email/tags/:tag`
  — missing the `/v2` prefix every other endpoint on the page carries. The same
  section's own runnable curl example uses the full, correctly-prefixed path
  (`https://api.getdrip.com/v2/YOUR_ACCOUNT_ID/subscribers/ID_OR_EMAIL/tags/TAG`).
  `actions/remove-tag.ts` follows the curl example, not the prose line.
- **`status.drip.com` is a real, API-specific status page** — worth calling out because
  several sibling apps in this pack (Mailchimp, Algolia, Basecamp, ...) had to declare
  their `service` check `unavailable` for lack of one. Drip is not one of those; the
  page has a dedicated "REST and JavaScript APIs" component.
- **Rate-limit headroom is genuinely readable**, also unlike several siblings (Aircall
  only emits its headers once already rate-limited; Basecamp and Algolia publish no
  headroom at all). Drip's docs show `X-RateLimit-Limit`/`X-RateLimit-Remaining`
  unconditionally, so `health/quota.ts` is a live probe rather than a declared absence.

## Deliberately out of scope

Left out because they could not be verified against developer.drip.com without
guessing at request/response shapes the reference page doesn't fully spell out, or
because they are a different node type entirely — not inferred from a sibling app:

- Single-Email Campaigns (Broadcasts), Workflows, Forms, Conversions.
- Webhooks (a Trigger surface, not an Action).
- Orders / Shopper Activity (carts, orders, products) — e-commerce integration, a
  different scope than the marketing-automation core this app covers.
- The Batch API — the individual-record endpoints this app uses cover the same
  operations at the granularity a workflow step naturally works at.

---

Researched and endpoint-verified 2026-09-01 directly against developer.drip.com (the
vendor's own single-page REST API reference) and status.drip.com's live Statuspage API.
Status surfaces move; re-check if a probe starts failing for everyone at once.
