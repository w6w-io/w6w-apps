# Little Green Light

Search, read, and log **constituents**, **gifts**, and **notes**, and read **appeals**,
**campaigns**, **funds**, and **groups**, in **Little Green Light (LGL)** — a web-based CRM built
for small and mid-size nonprofits — over LGL's own **REST API v1**.

- **Categories** — crm, finance
- **Auth methods** — bearer-token
- **Actions** — 12 (2 `search`, 7 `read`, 3 `perform`)
- **Health checks** — 2 (`service`, `quota`, both declared `unavailable`, `informational`) + the
  derived `auth:bearer-token`
- **Egress allowlist** — `api.littlegreenlight.com`
- **Website** — http://www.littlegreenlight.com
- **API docs** — https://api.littlegreenlight.com/api-docs/ (rendered) /
  https://api.littlegreenlight.com/api-docs/json/api-docs.json (machine-readable index)

> **Everything below was verified on 2026-09-05** against LGL's own machine-readable API
> reference — the Swagger 1.2 index above, plus its 33 per-resource sub-documents at
> `https://api.littlegreenlight.com/api-docs/json/lgl_api/v1/{resource}.json` — cross-checked
> against live unauthenticated and garbage-credential probes of `api.littlegreenlight.com`. A
> working credential was not available to this build, so the *shape* of a successful (200)
> response was not independently re-verified live — only the vendor's own documented schemas, and
> the 401/error path, which was.

## The three things most likely to cost someone a day

### 1. Auth is Bearer — not the HTTP Basic the bare 401 implies

A request with **no** `Authorization` header at all answers:

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="API"
Content-Type: text/html; charset=utf-8

HTTP Basic: Access denied.
```

— which looks exactly like a service that wants HTTP Basic credentials. But a request that
*does* send `Authorization: Bearer <garbage>` gets a second, more specific 401 instead:

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="Rack::OAuth2 Protected Resources", error="invalid_token", error_description="The access token provided is expired, revoked, malformed or invalid for other reasons."
Content-Type: application/json

{"error":"invalid_token","error_description":"The access token provided is expired, revoked, malformed or invalid for other reasons."}
```

That is the real scheme — confirmed independently against a third-party open source LGL client on
npm (`lgl-mcp-server`, source at `github.com/WillHeadlee/Little-Green-Light-MCP-Server`), which
calls `https://api.littlegreenlight.com/api/v1` with `Authorization: Bearer ${LGL_API_KEY}`. LGL's
own Swagger reference declares no `authorizations` block at all, so a caller who trusts the first
`WWW-Authenticate` challenge it sees and reaches for HTTP Basic would burn real time on a scheme
this API doesn't use. `auth/bearer-token.ts`'s `test` hook classifies on the structured
`error`/`error_description` JSON body, never on the bare status or either challenge header.

### 2. Search filters are an array of embedded `field=value` strings, not a search term

Every documented `/search.json` endpoint (`constituents`, `gifts`, `contact_reports`) takes a
**required**, repeatable `q[]` query parameter whose own worked examples read `q[]=name=brady` and
`q[]=updated_from=2016-01-01` — each array entry is itself a `field=value` filter clause, not a
free-text search term. Sending `q[]=brady` (the natural first guess) is a differently-shaped
request the API documents no support for. LGL's reference does not enumerate the full set of valid
filter field names beyond its one worked example per resource plus the fields also usable in
`sort` — this app exposes a raw `filters` param (an array of clause strings) rather than a set of
named filter dropdowns it would otherwise be guessing at.

### 3. One list envelope, shared by every one of the 33 documented resources

Every list endpoint — plain index AND search — wraps its `items` in the identical shape, confirmed
across the `constituents`/`gifts`/`notes`/`appeals`/`campaigns`/`funds`/`groups` sub-documents:

```json
{
  "api_version": 1.0,
  "items_count": 25,
  "total_items": 118,
  "limit": 25,
  "offset": 0,
  "next_item": 25,
  "next_link": "https://api.littlegreenlight.com/api/v1/constituents.json?limit=25&offset=25",
  "item_type": "Constituent",
  "items": [ /* ... */ ]
}
```

There is no separate "Pagination" section in the reference — this envelope *is* it, uniformly, for
every resource. `total_items`/`next_link` are what a caller needs to page through results.

### A smaller trap worth knowing: `CreateBody` requires `email_addresses`, even for organizations

The `Constituent` model itself requires only `first_name`/`last_name`, but the documented
`CreateBody` schema for `POST /constituents.json` additionally lists `email_addresses` as
required — an array, so this app satisfies it with `[]` when no email is given rather than forcing
one on every record (including an organization-only constituent, which the schema still requires
`first_name`/`last_name` for despite `is_org`/`org_name` existing as the alternative identity
path). This app follows the documented schema literally; it was not possible to verify live
whether LGL's server actually enforces every one of those "required" fields, since a working
credential was not available for this build.

## Auth

One method: `bearer-token`, type `bearer` — `Authorization: Bearer <token>`. LGL's reference
declares no OAuth surface for third-party integrations; an account-level access token is the
entire authentication story. The exact steps to generate that token are not documented anywhere in
LGL's own API reference (its Swagger doc's `authorizations` field is `null`), so this app's field
hint describes it only at the level a connecting user needs, without inventing a specific menu
path — consult LGL support if the option cannot be found in your account.

### The probe is `GET /api/v1/constituents.json?limit=1`

The cheapest documented read, bounded to one record. It requires a live token and returns nothing
beyond the connecting organization's own constituent data — never anything that could be mistaken
for the credential. `test` classifies from the response body (the structured
`{"error":"invalid_token","error_description":"..."}` on a live-measured 401), not the bare status
code — asserted directly in
[`tests/auth/bearer-token.test.ts`](tests/auth/bearer-token.test.ts).

## Actions

12 actions. `resource` groups them in the editor.

| Key | Type | Endpoint | Notes |
| --- | --- | --- | --- |
| `constituent-search` | search | `GET /api/v1/constituents/search.json` | required `filters` (`q[]`), `expand`, `sort`, pagination |
| `constituent-get` | read | `GET /api/v1/constituents/{id}.json` | |
| `constituent-create` | perform | `POST /api/v1/constituents.json` | `first_name`/`last_name` required per schema |
| `gift-list` | read | `GET /api/v1/constituents/{id}/gifts.json` | pagination only |
| `gift-search` | search | `GET /api/v1/gifts/search.json` | required `filters` (`q[]`), `expand`, `sort`, pagination |
| `gift-create` | perform | `POST /api/v1/constituents/{id}/gifts.json` | `gift_type_name` required |
| `note-list` | read | `GET /api/v1/constituents/{id}/notes.json` | pagination only |
| `note-create` | perform | `POST /api/v1/constituents/{id}/notes.json` | `text`, `original_date` required |
| `appeal-list` | read | `GET /api/v1/appeals.json` | pagination only |
| `campaign-list` | read | `GET /api/v1/campaigns.json` | pagination only |
| `fund-list` | read | `GET /api/v1/funds.json` | pagination only |
| `group-list` | read | `GET /api/v1/groups.json` | pagination only |

Every list/search action returns the full [list envelope](#3-one-list-envelope-shared-by-every-one-of-the-33-documented-resources)
(`items`, `items_count`, `total_items`, `next_link`, …), not just the bare `items` array.

### Deliberately out of scope

- **Update and delete.** LGL documents `PATCH`/`DELETE` for every resource this app covers
  (constituents, gifts, notes, appeals, campaigns, funds, groups), but this first pass covers the
  read/search/create surface a workflow most commonly needs. Left out to keep scope focused, not
  because of a vendor limitation — a follow-up could add `constituent-update`, `gift-update`, etc.
  against the same documented `PATCH .../{id}.json` shape.
- **`appeal_requests`, `class_affiliations`, `contact_reports`, `custom attributes`, `email
  addresses`, `events`, `group_memberships`, `invitations`, `keywords`, `mailing_templates`,
  `memberships`, `phone_numbers`, `street_addresses`, `team_members`, `volunteer_times`, `web
  addresses`, and the various `*_types` lookup resources.** All 33 resources are documented in the
  Swagger index; this app covers the 7 most workflow-relevant ones. Every path/model claim above
  and in the action files was verified against the live spec — nothing here is inferred from a
  sibling app or a marketing page.
- **Appeal/campaign/fund/group create, update and delete.** Documented (`POST`/`PATCH`/`DELETE`
  on each), but left as read-only here for the same scope reason as above.

## Health checks

- **`service`** (`kind: "service"`, `informational`, declared `unavailable`) — both
  `status.littlegreenlight.com` and `littlegreenlight.statuspage.io` redirect (302 → 301 → 200) to
  Atlassian's own Statuspage marketing page (`www.atlassian.com/software/statuspage`) — the
  unclaimed-Statuspage-page pattern seen elsewhere in this pack. No other machine-readable status
  surface (Instatus, Better Stack, incident.io, RSS/Atom) was found for this vendor.
- **`quota`** (`kind: "quota"`, `informational`, declared `unavailable`) — no rate-limit or quota
  header of any kind appears on any response measured live, including the 401 a garbage Bearer
  token gets, and none of LGL's 33 per-resource Swagger sub-documents describes a quota field,
  header, or dedicated usage endpoint.
- **`auth:bearer-token`** — derived automatically from the Auth `test` hook.

## Development

```bash
deno task check      # typecheck
deno task lint        # deno lint
deno task fmt          # format (lineWidth 100, semicolons, double quotes)
deno task test          # unit tests
deno task validate       # @w6w/validator conformance audit
```
