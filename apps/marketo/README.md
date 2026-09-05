# Marketo

Manage Marketo (Adobe Marketo Engage) leads, static lists, companies and
smart campaigns.

- **Categories** — marketing, crm
- **Auth methods** — client-credentials (OAuth2 Client Credentials grant)
- **Actions** — 15
- **Egress allowlist** — `*` (per-tenant pod — see below)
- **Website** — https://business.adobe.com/products/marketo/adobe-marketo.html
- **API docs** — https://github.com/AdobeDocs/marketo-developer.en
  (`help/rest-api/*.md`) — the old `developers.marketo.com/documentation/rest/`
  host now 301s to `experienceleague.adobe.com`, which is a client-rendered
  page; the GitHub source behind it is what this app was built and verified
  against. Read 2026-09-05: `authentication.md`, `base-url.md`,
  `custom-services.md`, `error-codes.md`, `leads.md`, `list-membership.md`,
  `companies.md`, `smart-campaigns.md`, `usage.md`, `rest-api.md`,
  `getting-started.md`.

## Setup

### Custom Service (Client Credentials grant)

1. Marketo → **Admin → Users & Roles**: create a role with at least
   **Read-Only Lead** (or **Read-Only Person**) from the Access API
   permission group, then invite an **API Only** user with that role.
2. **Admin → LaunchPoint → New → New Service**, Service type **Custom**,
   API-Only User set to the user from step 1.
3. Open the new service's **View Details** to get the **Client ID** and
   **Client Secret**.
4. **Admin → Web Services**: copy the **REST API endpoint** and the separate
   **Identity URL** shown in the same box.
5. Paste all four values into the connection.

### Marketo's own documentation disagrees with itself about the base URL

`base-url.md` defines "Base URL" as `https://284-RPR-133.mktorest.com/rest`
— **with** `/rest` — and "Path" as `/v1/lead/...`. But `rest-api.md`'s own
worked example calls the same copied value the "Endpoint" and then builds a
call as `<Your Endpoint URL>/rest/v1/leads.json` — which only makes sense if
that value does **not** already include `/rest`. Rather than trust one of
Marketo's own pages over the other, `lib/client.ts`'s `normalizeRestBaseUrl`
strips a trailing `/rest` if present and this app always appends it itself —
so either paste works.

### The Identity URL is not derived from the REST base URL

Community convention assumes the Identity URL is always the REST host with
`/identity` swapped in for `/rest`, but nothing in Marketo's own
documentation states that rule — `authentication.md` and `custom-services.md`
both just say "find the Identity URL" as its own step. This app collects it
as its own connection field rather than guessing a derivation that isn't
written down anywhere.

### Credentials travel in the query string when minting a token

`authentication.md`'s own worked example mints a token with:

```
GET <Identity URL>/oauth/token?grant_type=client_credentials&client_id=<Client Id>&client_secret=<Client Secret>
```

— a `GET` request with `client_secret` in the URL. This app follows the
documented mechanism exactly (see `auth/client-credentials.ts`), but it's
worth knowing before putting request logging in front of the Identity
endpoint: a client secret in a query string is more likely to land in an
access log than one in a POST body or an `Authorization` header.

### Why the allowlist is `*`

Every Marketo subscription runs on its own pod, addressed by a
Munchkin-ID-derived host (e.g. `https://123-ABC-456.mktorest.com`) — there is
no fixed `api.marketo.com`. So the base URL is a connection field and the
egress allowlist is open, the same posture this pack already uses for
`mautic`, `tableau`, `kintone`, `learnworlds` and `invoiceninja`.

## Actions

| Key | Type | Description |
|---|---|---|
| `lead-get` | read | A single lead by ID |
| `lead-find` | search | Leads matching a field filter (e.g. by email) |
| `leads-describe` | read | Every field (standard + custom) on the lead object |
| `lead-sync` | perform | Create a lead, update one, or either |
| `lead-delete` | perform | Permanently delete one or more leads |
| `list-add-leads` | perform | Add leads to a static list |
| `list-remove-leads` | perform | Remove leads from a static list |
| `list-get-members` | read | The leads on a static list |
| `list-is-member` | read | Whether given leads belong to a static list |
| `company-get` | search | Companies matching a field filter |
| `company-sync` | perform | Create a company, update one, or either |
| `campaign-get` | read | A single smart campaign's metadata |
| `campaign-list` | read | Browse smart campaigns |
| `campaign-trigger` | perform | Push leads through a trigger campaign's flow |
| `campaign-schedule` | perform | Schedule a batch campaign to run |

## Three things that would have cost a day

### 1. Every REST call answers HTTP 200, even on failure

`error-codes.md` is explicit: "When a call contains an error, the API
typically still returns HTTP status code 200. The JSON response contains a
`success` member with a value of `false` and an array of errors." A 601
(invalid token), 602 (expired token) or 606 (rate limit exceeded) all arrive
this way — not as a 401 or 429. Checking `res.ok` anywhere in this app would
treat every authentication failure, rate limit, and bad parameter as a
success. `lib/client.ts`'s `MarketoClient` checks the envelope's own
`success` field on every call; only the separate Identity (OAuth token)
endpoint uses a real HTTP 401, and only for a bad Client ID/Secret.

### 2. The vendor's own docs contradict each other on the base URL shape, and the "confirmed" icon source was a stale CDN cache

See "Marketo's own documentation disagrees with itself about the base URL"
above for the first half. The second: the scouting note for this app cited
`cdn.jsdelivr.net/npm/simple-icons@latest/icons/marketo.svg` as "confirmed
present." It answers `200`, but the response header `x-jsd-version: 13.21.0`
reveals jsdelivr's `@latest` alias was serving a **stale edge cache** of an
old published version — the current `simple-icons@16.29.0` (verified via
`data.jsdelivr.com`'s file listing and the package's own data JSON) has
**removed Marketo entirely**: `@16.29.0/icons/marketo.svg` 404s, and no
`Marketo` entry exists in its data file. The mark is real Marketo artwork
(byte-identical to the last version that shipped it), but this app pins the
asset source to the immutable `simple-icons@13.21.0` tag rather than
`@latest`, since an `@latest` cache miss would now 404.

### 3. Two API surfaces, one base URL, and no way to tell from the path alone which one a given call needs

Lead, list, company and campaign-trigger/schedule calls live under
`/rest/v1/...` (the "Lead Database" API). Smart Campaign metadata
(`campaign-get`/`campaign-list`) lives under `/rest/asset/v1/...` (the
"Asset" API) — a different prefix on the *same* instance host, discovered
only by noticing `smart-campaigns.md` links two entirely separate endpoint
references ("Asset" for query/create/clone/delete, "Leads" for
Schedule/Trigger) for what reads as one feature on the docs page.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `instance` | dependency | Is **this connection's own pod** reachable, and does it look like Marketo's routing? |
| `service` | service | Declared unavailable — no reachable, trustworthy status feed exists |
| `quota` | quota | Declared unavailable — the usage endpoint reports a count, never the ceiling |

`instance` sends an **unsigned** `GET /rest/v1/leads/describe.json` and reads
the response body rather than the status code: Marketo's documented
`{"success": false, "errors": [{"code": "601"|"602", ...}]}` envelope for a
missing/invalid token proves the pod is alive and answering — treated as a
`pass`, not a failure, since the point is reachability, not credential
validity (that's the derived `auth:client-credentials` check). A `610`
("resource not found") is treated as `down` instead — that means something
answered, but not Marketo's own routing at this path, which usually means the
REST base URL is wrong.

`service` is a **declared absence**. Verified 2026-09-05:
`marketo.statuspage.io/api/v2/summary.json` answers `401` with the body
`"Your page is inactive. Please include an API key to access this
resource."` — the same "claimed but inactive" signature this pack already
found for `deel`'s and `luma`'s Statuspage instances. `status.marketo.com`
and `trust.marketo.com` don't even complete a TLS handshake. And
`www.marketo.com/trust/` redirects to `adobe.com/trust.html`, Adobe's generic
corporate trust page — nothing Marketo-specific, let alone per-pod.

`quota` is also a **declared absence**. `rest-api.md` states the daily quota
in prose only — "Each subscription is allocated 50,000 API calls per day…
Contact your account manager to increase the daily quota" — so the real
ceiling is per-subscription and not a constant this app can hardcode.
`GET /rest/v1/stats/usage.json` reports today's call total and a per-user
breakdown, but never the ceiling itself, and no Marketo endpoint publishes an
`X-RateLimit-*`-style response header anywhere in the reference docs.
Reporting "remaining" against the documented default would silently
misreport any subscription whose account manager raised it.

## Deprecation notices found while reading the docs

- **SOAP API**: deprecated and unavailable as of July 31, 2026
  (`getting-started.md`). Not relevant here — this app was always REST-only.
- **`access_token` query parameter**: being removed August 31, 2026
  (`authentication.md`) in favor of the `Authorization` header exclusively.
  This app has always used the header (`sign` stamps
  `Authorization: Bearer …`), so it is unaffected.
- **Get Lead Activities / Get Lead Changes with `listId`**: beginning
  September 30, 2026, calls against a static list with 10,000+ members will
  fail with error 1003 instead of the current behavior. Neither endpoint is
  implemented in this app (see below), so this only matters if they're added
  later.

## What this app deliberately does not do

Marketo's REST surface is large; this first pass covers the daily
lead/list/company/campaign loop and leaves the rest named rather than
silently missing:

- **Bulk Extract / Bulk Import** (leads, activities, custom objects, program
  members) — a separate asynchronous job-queue API, not a synchronous action
  shape.
- **Programs, Opportunities, Opportunity Roles, Custom Objects, Named
  Accounts, Named Account Lists, Sales Persons, Channels** — each is its own
  object model with its own describe/query/sync surface, mirroring the
  lead/company pattern this app already establishes but out of scope for a
  first pass.
- **Activities** (`Get Lead Activities`, `Get Lead Changes`, `Add Custom
  Activity`) — a large, filter-heavy surface with the `listId` deprecation
  above already in flight.
- **Tags, Tokens, Emails, Email Templates, Forms, Landing Pages, Landing
  Page Templates, Snippets, Fragments, Dynamic Content, Files, Folders,
  Transactional Email** — Asset API surfaces for building marketing
  collateral, not the workflow actions that consume it.
- **Smart Campaign create / clone / delete / activate / deactivate** — only
  `campaign-get`/`campaign-list` (read) are here; authoring a campaign's own
  trigger/filter/flow graph is a visual-editor surface, the same reasoning
  this pack applies to Mautic's and Gitea's own builder/admin surfaces.
- **Custom Services management, User Management** — administrative
  surfaces, out of scope the same way Gitea's admin/mirrors/wikis are.
- **The JavaScript (Munchkin) tracking API, mobile SDK, and email
  scripting** — client-side/template surfaces, not REST actions.
- **`cloneToProgram` on Schedule Campaign** — Marketo's own docs cap it at 20
  calls/day and recommend the dedicated Clone Program endpoint instead
  (itself in the "Programs" surface above), so `campaign-schedule` omits it.

## Errors

Every action and health check reads Marketo's documented Response-Level
envelope — `{"success": false, "errors": [{"code": "...", "message":
"..."}]}` at HTTP 200 — via `lib/client.ts`'s `MarketoClient`, which throws
with the code and message rather than trusting `res.ok`. Record-Level errors
(a `"status": "skipped"` entry inside a `result` array, e.g. "Lead already
exists") are returned as part of the action's own output rather than thrown,
since a partial success across a batch of leads/companies is a normal
outcome a workflow needs to inspect, not a failure of the call itself.
