# Wealthbox

Wealthbox CRM contacts, tasks, events, opportunities and notes, on the **Wealthbox API v1**.

- **Categories** — crm
- **Auth methods** — api-key
- **Actions** — 21
- **Egress allowlist** — `api.crmworkspace.com`
- **Website** — https://www.wealthbox.com
- **API docs** — https://dev.wealthbox.com/

## The host is NOT a wealthbox.com subdomain

The single easiest way to get this app wrong is guessing the API host from the vendor's marketing
domain. dev.wealthbox.com's own "Introduction" states the API Endpoint verbatim:

> API Endpoint: `https://api.crmworkspace.com`

and every example request in the docs — auth, pagination, every resource — targets that host with a
`/v1` prefix, e.g.:

```bash
curl https://api.crmworkspace.com/v1/contacts -i -H "ACCESS_TOKEN:12345678901234567890123456789012"
```

The OAuth authorize/token endpoints live on a **third** host, `app.crmworkspace.com`
(`https://app.crmworkspace.com/oauth/authorize`, `.../oauth/token`) — not called by this app (see
below), so it is deliberately not on the allowlist. `w6w.network.allow` lists only
`api.crmworkspace.com`.

## Auth — a custom `ACCESS_TOKEN` header, no prefix

Wealthbox's personal API access token is **not** sent as `Authorization`, and carries **no** prefix
(no `Bearer`, no `Token`). The docs are explicit:

> "That token should then be passed as an HTTP Header, with the name `ACCESS_TOKEN`, in all requests
> to the API."

The header **value** is the token verbatim. `apiKey: { in: "header", name: "ACCESS_TOKEN" }` describes
this wire shape exactly, so `type: "apiKey"` is the accurate declaration — no bespoke `sign`-only
encoding is needed (contrast Close, which needs a base64 Basic header for the same conceptual "API
key" auth).

Get a token at **Wealthbox → your name (top right) → Settings → API Access Tokens → Create Access
Token**.

**OAuth 2.0 also exists** (authorization-code + refresh-token grants, `https://app.crmworkspace.com`
authorize/token endpoints, per RFC 6749) but is **not self-serve**: obtaining a client id/secret
requires emailing `support@wealthbox.com` with the integration's details. There is no public
client-registration endpoint or stable client id this app could ship generically, so a static OAuth2
`AuthDefinition` would either be non-functional or would bake in one integrator's private client id.
The personal API access token needs no such registration — dev.wealthbox.com itself recommends it for
"building personal integrations... and testing integration capabilities" — so it is what this app
ships. Add OAuth as a second `AuthDefinition` if this app is ever registered as a listed Wealthbox
integration partner.

## Conventions this app encodes

**Page-based pagination, no `has_more`.** Every list endpoint takes `page` (default 1) and
`per_page` (default 25) — a page-NUMBER scheme, not offset/cursor. Unlike Close's `{data, has_more}`
envelope, Wealthbox's response carries no continuation signal at all: a caller pages forward until a
page comes back with fewer than `per_page` items. `PAGE_PARAMS` in `lib/client.ts` exposes both on
every search action.

**Array filters use Rails `key[]=` query syntax.** `tags` on `list-contacts` accepts several values;
the client sends them as repeated `tags[]=a&tags[]=b` rather than a comma-joined string or bare
repeated `tags=`, matching the Rails convention this API (and Close's) uses.

**Contact's `PUT` is a genuine partial patch — Task/Event/Opportunity's `PUT` is NOT.** This is the
finding most likely to cost someone real debugging time, because it is *inconsistent within the same
API*:

- Contact: "All fields are optional; any fields not included in the request will not be updated."
  (`update-contact` only requires `contactId`.)
- Task: `name` and `due_date` are marked **required** on `PUT /v1/tasks/{id}`, identically to Create.
- Event: `title`, `starts_at` and `ends_at` are marked **required** on `PUT /v1/events/{id}`.
- Opportunity: `name`, `target_close`, `probability`, `stage` and `amounts` are all marked
  **required** on `PUT /v1/opportunities/{id}`.

So moving an Opportunity's `stage`, for example, means resending its name, target close date,
probability and full `amounts` array too — sending `stage` alone risks a rejected request (or worse,
a field silently reset), not a safe partial update. `update-task`, `update-event` and
`update-opportunity` mark those fields `required` in their own `params`, matching the vendor docs
literally rather than assuming Close-style patch semantics carry over.

**A huge, mostly-optional Contact schema is capped, not modelled exhaustively.** Contact alone has
60+ documented request attributes (investment profile, driver's license, agreement dates, family-role
contact links, ...). `create-contact`/`update-contact` expose the fields every integration needs
directly and route everything else through `additionalProperties` — an object merged verbatim into
the request body — the same escape hatch this pack already uses for Hubspot's equally large Contact
object.

## Actions

21 actions, each mapping 1:1 to an endpoint confirmed in dev.wealthbox.com's live documentation.

### Contacts (5)

| Action | Endpoint |
| ------ | -------- |
| `list-contacts` | `GET /v1/contacts` |
| `get-contact` | `GET /v1/contacts/{id}` |
| `create-contact` | `POST /v1/contacts` |
| `update-contact` | `PUT /v1/contacts/{id}` (genuine partial patch) |
| `delete-contact` | `DELETE /v1/contacts/{id}` |

### Tasks (4)

| Action | Endpoint |
| ------ | -------- |
| `list-tasks` | `GET /v1/tasks` |
| `create-task` | `POST /v1/tasks` (assign to a user OR a team) |
| `update-task` | `PUT /v1/tasks/{id}` (requires `name` + `due_date` — see above) |
| `delete-task` | `DELETE /v1/tasks/{id}` |

dev.wealthbox.com documents "create and assign to a user" and "create and assign to a team" as two
separate operations; both share one endpoint and body shape (`assigned_to` vs. `assigned_to_team`),
so `create-task` exposes both fields on one action rather than splitting it in two.

### Events (4)

| Action | Endpoint |
| ------ | -------- |
| `list-events` | `GET /v1/events` |
| `create-event` | `POST /v1/events` |
| `update-event` | `PUT /v1/events/{id}` (requires `title`/`starts_at`/`ends_at` — see above) |
| `delete-event` | `DELETE /v1/events/{id}` |

`linkedTo`/`invitees` accept only `Contact` (and, for invitees, `User`) as resource types, per the
docs.

### Opportunities (4)

| Action | Endpoint |
| ------ | -------- |
| `list-opportunities` | `GET /v1/opportunities` (won/lost excluded unless `includeClosed`) |
| `create-opportunity` | `POST /v1/opportunities` |
| `update-opportunity` | `PUT /v1/opportunities/{id}` (requires the full create-set — see above) |
| `delete-opportunity` | `DELETE /v1/opportunities/{id}` |

`linkedTo` accepts an array but Wealthbox states plainly: "Only the first contact specified will be
used" — the param hint says so rather than implying multi-contact linking that silently drops entries
2+.

### Notes (2)

| Action | Endpoint |
| ------ | -------- |
| `list-notes` | `GET /v1/notes` |
| `create-note` | `POST /v1/notes` |

The **list response envelope key is `status_updates`, not `notes`** — dev.wealthbox.com states it
directly: "Notes are returned in the `status_updates` array." `list-notes`' `output` reflects that
literally so a caller reading the field name does not go looking for a `notes` key that never
arrives. `linkedTo` supports only `Contact` as its resource type.

### Account metadata (2)

| Action | Endpoint |
| ------ | -------- |
| `list-users` | `GET /v1/users` (defaults to `active` users) |
| `list-custom-fields` | `GET /v1/categories/custom_fields` |

These exist to make the write actions usable rather than as ends in themselves — the `stage`,
`category`, `assigned_to`/`assigned_to_team` and custom-field ids the create/update actions take are
all per-account and otherwise undiscoverable. `GET /v1/me` (Wealthbox's "Retrieve login profile
information") is **not** exposed as its own action: the auth `test` hook already exercises it, and the
connected user/account is on the Connection label via `afterConnect`.

## Health checks

### `service` — declared absent, not faked

**This is the second finding worth a day of someone's time.** `status.wealthbox.com` resolves and
does answer 200 for what looks like a real status.io feed at
`/1.0/status/5c5df1d4f1fdd844f29883d6` — the same `api.status.io/1.0/status/{pageId}` shape this pack
already recognizes from Discourse/GitLab, just served from Wealthbox's own custom domain instead of
`api.status.io` directly. **But the payload is a frozen decoy**: checked 2026-08-24, every
`updated` timestamp in the response — the overall rollup and both listed components ("Wealthbox",
"Wealthbox API") — reads `2019-02-08T21:17:08...`, over seven years stale, and every status reads
"Operational" (`status_code: 100`). A feed that has not moved in seven years and has never reported
anything but "Operational" carries **zero** information: it cannot distinguish a real outage from the
monitor having been abandoned. `HTTP 200 with a JSON-shaped body` is not proof of a live signal, and
polling this endpoint would produce a permanently-cheerful, meaningless check.

The other candidate surfaces were checked and ruled out the same day:

| Path | Result |
| ---- | ------ |
| `status.wealthbox.com/1.0/status/{id}` | **200**, real JSON, but frozen at 2019 data |
| `status.wealthbox.com/api/v2/summary.json` (Statuspage.io shape) | **404** |
| `status.wealthbox.com/api/v2/status.json` | **404** |
| `wealthbox.statuspage.io/api/v2/summary.json` | **401**, body: `"Your page is inactive. Please include an API key..."` |

So there is no live, machine-readable surface to poll. `health/service.ts` declares `unavailable`
with `severity: "informational"`, per `rfcs/healthcheck.md`'s "Declaring absence" — a positive,
honest fact rather than a check that would always read `ok` regardless of reality. The derived
`auth:api-key` check (from `auth/api-key.ts`'s `test` hook, `GET /v1/me`) is what actually answers
"is this working" day to day.

### Credential check

Free: the runtime derives an `auth:api-key` check from the Auth `test` hook, which probes
`GET /v1/me` — Wealthbox's own "Retrieve login profile information" endpoint. It is the right
liveness probe because every valid token can read its own login profile (no resource permission
beyond existing is required), and its response body is profile metadata only — it never echoes the
token, so this probe cannot leak the credential back to a caller.

### No `quota` check

dev.wealthbox.com's "Throttling" section documents a rate ("one request/second over a five minute
sampling period", short bursts tolerated, `429` when exceeded) but publishes **no** corresponding
response header (`ratelimit-*`, `x-ratelimit-*`, or otherwise) to read that headroom from. Without a
header there is nothing for a `quota` check to probe honestly — inventing a synthetic reading would be
worse than omitting the check, so this app ships none.

## Icon

`assets/icon.svg` is Wealthbox's own logomark, extracted from the inline `<svg class="wb-logo ...">`
element wealthbox.com's own header serves (a hexagon outline enclosing a stylised "W", the same mark
as `https://www.wealthbox.com/favicon.ico`/the site's PNG favicons). The fill colour
(`#0260fd`) was sampled directly from the site's own 192×192 favicon PNG rather than guessed. The
paths are copied verbatim from the live page (viewed/verified 2026-08-24); only the wordmark portion
of the original combined logo+wordmark SVG was dropped, since an app icon needs the mark alone.

## Development

```sh
deno task test    # unit tests
deno task check
deno task lint
deno task fmt
```

Every action, the auth method, the health check, the entry module and the client have unit tests
driven by a mocked `HookContext` — no network, no credentials.

## Links

Verified 2026-08-24.

- **Vendor site** — https://www.wealthbox.com
- **API docs (used to build this app)** — https://dev.wealthbox.com/
- **API access token settings** — https://app.crmworkspace.com/settings/api_access_tokens (linked
  from the auth docs; requires a Wealthbox login)
- **Status page (declared absent — see above)** — https://status.wealthbox.com
