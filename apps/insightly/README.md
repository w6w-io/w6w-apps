# Insightly

Manage Insightly contacts, organisations, opportunities and leads.

- **Categories** — crm
- **Auth methods** — api-key
- **Actions** — 20
- **Egress allowlist** — `*.insightly.com`
- **Website** — https://www.insightly.com
- **API docs** — https://api.na1.insightly.com/v3.1/help (the API's own live Swagger help
  page — see "The pod" below for why the host is not a fixed address)

## The pod

Insightly is multi-tenant across regional hosts rather than one shared API host. Its own
docs state it plainly (`v3.1/help`, "API URL" section):

> The API is accessible via the following URL: `https://api.{pod}.insightly.com/v3.1/`...
> Your instance's pod can be determined by accessing 'User Settings' and finding the API
> URL right under your API Key.

Verified live 2026-09-05:

- `GET https://api.insightly.com/v3.1/Contacts` (no pod) → **404** — the bare hostname
  serves the static `/v3.1/help` page but nothing else.
- `GET https://api.na1.insightly.com/v3.1/Contacts` → **401**, with the documented body
  `{"Message":"Authorization has been denied for this request."}` — a real, reachable
  endpoint that just needs a credential.
- `GET https://api.<made-up-pod>.insightly.com/...` → the hostname does not resolve at
  all (DNS failure), not a 404 from an Insightly server.

A manifest cannot enumerate every pod, so `w6w.network.allow` declares the wildcard
`*.insightly.com` (the same pattern this pack uses for Freshdesk's and Gorgias's
per-account subdomains), and the pod is collected as a Connection field — not an Action
param — read off the redacted connection's `display` data that `afterConnect` records.

## Auth scheme

HTTP Basic, with the per-user API key as the username and a **blank password** — verified
against the API's own documented example call:

```
GET: https://api.{pod}.insightly.com/v3.1/Contacts
Authorization: Basic YWM5YTIyOTItZjI1YS00NDgzLTlkNTQtMDAwMDAwMDAwMDAw
```

(`ac9a2292-f25a-4483-9d54-000000000000:` base64-decoded — the key, a colon, and nothing
after it.) Every API key is tied to one Insightly user, so actions run under that user's
own record permissions.

## List actions double as search

Insightly exposes two different endpoints per object: a plain `GET /{Object}` (paged with
`top`/`skip`, no field filtering) and a separate `GET /{Object}/Search` (adds
`field_name`/`field_value` and `updated_after_utc`, e.g.
`/Leads/Search?field_name=LEAD_RATING&field_value=5`). Rather than double the action
count, each `*-get-many` action exposes both through one set of params: leave the filter
field blank for a plain listing, or set it to switch to `/Search`.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.insightly.com> (Atlassian Statuspage). Verified live:
`page.name` is `"Insightly"` (not a decoy), with exactly two components, `Insightly Web
App` and `Insightly API` — the latter is reported by name in the check's `components`
map, not folded anonymously into the page rollup.

### Is this pod reachable?

Insightly's Statuspage is not region/pod-suffixed, so a pod-specific outage — or simply a
mistyped pod — would not show up in `service`. The `pod` dependency check probes this
connection's own pod, unauthenticated. A **401 is a pass** (it proves the pod is serving);
a thrown fetch error (DNS resolution failure, since a wrong pod never resolves to any
Insightly server) is reported `down`, naming the pod, which is how "you typed the wrong
pod" gets told apart from "Insightly is down" and from "your key expired."

### Is this credential live?

The Auth `test` hook probes `GET /Users/Me` — a scope-free whoami (`APIUser`: name, email,
timezone, role id, ...) that echoes no credential material, unlike a probe such as
Follow Up Boss's `/me` or Mailjet's `/apikey`.

### Do we have quota left?

`X-RateLimit-Limit` and `X-RateLimit-Remaining` response headers, verified against
`v3.1/help`'s "Rate Limit Response Header" section — every request carries them, and a
429 is returned once the plan's **daily** allowance (1,000-100,000 requests/day depending
on plan, rolling 24h reset) is exhausted.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `pod` | dependency | connection | context | degraded | 120s | `health/pod.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

## Deviations / what's left out

- **`OPPORTUNITY_STATE` is a plain string, not a `select`.** Insightly's own v3.1 schema
  declares it `type: string, maxLength: 20` with no enumerated values in the API's
  reference. It is widely known from Insightly's UI to use values like
  `OPEN`/`WON`/`LOST`/`ABANDONED`, but since the API's own documentation doesn't state
  that, this app doesn't assert it either — per the rule that an unconfirmed detail is
  left out rather than guessed.
- **`LEAD_SOURCE_ID`/`LEAD_STATUS_ID` are plain numeric-ID params**, not dropdowns —
  they're per-account picklists (`GET /LeadSources`, `GET /LeadStatuses`), and adding two
  more list actions just to populate a dropdown was left out of scope. Insightly's schema
  marks both required for a Lead alongside `LAST_NAME`; this app only requires
  `LAST_NAME` and lets Insightly's own 400 response (surfaced verbatim) say more if an
  account actually enforces it.
- **Out of scope entirely**: file attachments, tags, links between records, projects,
  tasks, custom objects, and the pipeline/stage/pricebook administrative endpoints — all
  real v3.1 API surfaces, left out to keep this app to the four core CRM objects.
- No webhook/trigger surface — that is a Trigger, not an Action, and out of scope here.

---

Researched and endpoint-verified 2026-09-05 against `api.na1.insightly.com/v3.1/help`
and its underlying Swagger/OpenAPI document (`/v3.1/swagger/docs/v3.1`). Status and pod
routing move; re-check if a probe starts failing for everyone at once.
