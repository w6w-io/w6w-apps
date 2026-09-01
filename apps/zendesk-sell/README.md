# Zendesk Sell

Contacts, leads, deals, notes and tasks in **Zendesk Sell** (formerly Base CRM / getbase.com), over
the **Sell API v2**.

> **Not the same app as `apps/zendesk/`.** That app is Zendesk Support (ticketing) — a different
> host, a different auth story, a different data model. Sell shares only a parent company with it.
> `w6w.displayName: "Zendesk Sell"` exists specifically so the two are never confused in a listing.

- **Categories** — crm, marketing
- **Auth methods** — oauth2 (Authorization Code, the vendor's own recommended flow)
- **Actions** — 31
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:oauth2`
- **Egress allowlist** — `api.getbase.com` (the `service` check adds `status.zendesk.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.zendesk.com/sell/
- **API docs** — https://developer.zendesk.com/api-reference/sales-crm/introduction/
- **Status page** — https://status.zendesk.com/

> **Everything below was verified against the vendor's own sources on 2026-09-01** —
> `developer.zendesk.com/api-reference/sales-crm/*` (Introduction, Requests, Responses, Errors,
> Rate Limits, Authentication/\*, Resources/\*) plus live probes against `api.getbase.com` and
> `status.zendesk.com`. Nothing here came from a third-party integration directory.

## The three things most likely to cost you a day

### 1. The API host never moved to a `zendesk.com` domain

Zendesk folded Sell's old standalone reference (`developers.getbase.com`) into its unified developer
docs — that URL now 301-redirects to `developer.zendesk.com/api-reference/sales-crm/introduction/`.
It is tempting to assume the wire endpoint moved with the docs. **It did not.** The current
reference's own Introduction page states it in full:

> Use the following endpoint to communicate with the api: `https://api.getbase.com`

and every OAuth and resource example on every sub-page — Authentication, Contacts, Leads, Deals,
Notes, Tasks — still targets `api.getbase.com`, never a `zendesk.com` host. This app's
`w6w.network.allow` is `["api.getbase.com"]` for exactly that reason.

### 2. List and single-resource responses use different envelopes — and each list item is DOUBLE-wrapped

A single resource (`get`, `create`, `update`, `upsert`) answers:

```json
{ "data": { "id": 2, "name": "Mark Johnson" }, "meta": { "type": "contact" } }
```

A collection (`list`) answers an envelope where **each item carries its own `data`/`meta` pair**,
not a bare array of records:

```json
{
  "items": [
    { "data": { "id": 1, "name": "A" }, "meta": { "type": "contact" } },
    { "data": { "id": 2, "name": "B" }, "meta": { "type": "contact" } }
  ],
  "meta": { "type": "collection", "count": 2, "links": { "self": "..." } }
}
```

Unwrapping only the outer key on a list response returns the item envelopes, not the records.
`lib/client.ts`'s `SellClient.list()` unwraps both levels; `SellClient.get/create/update()` unwrap
only the single level.

### 3. `status.zendesk.com` genuinely has a dedicated Sell component — but no documented API

Per the pack's own "a page with the right name is not proof of the right component" lesson, this was
checked rather than assumed. `status.zendesk.com` is a Zendesk-built React dashboard, **not**
Atlassian Statuspage — every `/api/v2/*` and `/history.{atom,rss}` guess this app tried (the shapes
Apify's and other vendors' status pages use) answered `404`. The dashboard instead calls its own
internal, undocumented endpoints:

- `GET /api/ssp/services` — confirmed live 2026-09-01: service id `"63"` is
  `{"name": "Sales", "slug": "sell"}`. The `slug` is what proves this is genuinely the Sell product
  (the same list also carries `"Support"`, `"Chat"`, `"Voice"`, each with its own distinct slug).
- `GET /api/ssp/incidents` — a JSON:API-shaped incident log with structural `serviceId` and
  `resolvedAt` fields (not prose sniffed for the word "resolved").

`health/service.ts` reads this, scoped to service id 63, and treats it defensively: any shape it
doesn't recognise reports `unknown`, never `down` or `ok` — because this is reading a private API
that could be reshaped without notice, a materially different risk from a documented Statuspage
contract. See that file's module doc for the full reasoning.

## Auth

**OAuth 2.0 only** — Sell publishes no other authentication method for third-party integrations.
Specifically the **Authorization Code** grant, which the vendor's own reference calls "the preferred
method of integration with Sell" (its "Multi-User Application" flow). Endpoints
(`/oauth2/authorize`, `/oauth2/token`, `/oauth2/revoke`) all live on `api.getbase.com`, never a
`zendesk.com` host. No PKCE — the reference documents four flows and never mentions a
`code_challenge` parameter on any of them. Scopes requested: `read write profile` — `profile` is
required for both the CRUD actions' account/user needs and the `GET /v2/users/self` credential probe
(the vendor's own scope table: `profile` "grant[s] read-only access to the account and users info
only", separately from `read`/`write`). Access tokens expire in exactly one hour; the host renews
them via the standard `refresh_token` grant against the same `/oauth2/token` endpoint.

The credential probe is `GET /v2/users/self`, not the also-documented `GET /v2/accounts/self` —
either works, but `/v2/users/self` needs no id and its documented response shape carries no
credential material of any kind (unlike some vendors' whoami endpoints).

## What's covered

- **Contacts** — list, get, create, update, delete, upsert (find-or-create by filter)
- **Leads** — list, get, create, update, delete, upsert, and **convert** (`POST
  /v2/lead_conversions`) into a contact and/or deal
- **Deals** — list, get, create, update, delete, upsert
- **Notes** — list, get, create, update, delete (attach to a lead, contact or deal)
- **Tasks** — list, get, create, update, delete (floating or attached to a lead, contact or deal)
- **Users** — list (Sell's Users API is read-only — no create/update/delete exists)
- **Account** — get (`GET /v2/accounts/self`)

Each Create/Update action types the vendor's most-used fields and adds an `extraFields` JSON param
(merged in last, overriding the typed fields) for the remaining documented string fields — `fax`,
`twitter`, `facebook`, `linkedin`, `skype`, `lossReasonId`, and so on — rather than one param per
field for an API surface this wide.

## Deliberately out of scope

- **`address[city]`-style bracketed query filters and `custom_fields[<name>]` list filters/sorts** —
  both require a field to already be marked *Filterable* in the caller's own Sell account, so a
  static param can't offer a useful picker, and Sell silently ignores an unrecognised filter rather
  than erroring, making a free-text bracket-syntax field easy to get wrong without feedback. The
  upsert actions DO use the bracket form for their one required filter, since that shape is fixed by
  the API rather than per-account.
- **Sync API, Search API (GraphQL), Firehose API** — premium, additive surfaces layered on top of
  the Core API this app covers, each with its own protocol (long-polling sync, a bespoke query
  language, a real-time event stream). Genuinely useful, out of scope for a first pass.
- **Calls, Visits, Appointments, Documents, Line Items, Orders, Products, Pipelines, Stages, Sources,
  Sequences, Sequence Enrollments, Collaborations, Text Messages, App Locations** — all documented,
  real Core API resources. Left out for scope, not because anything about them couldn't be verified.
- **Rate-limit headroom** — see `health/quota.ts`: the vendor states a fixed 36,000/hour ceiling but
  exposes no remaining-quota header or endpoint, so this is declared `unavailable` rather than
  guessed.

Nothing was left out because it could not be confirmed against the vendor's own reference.

## Icon

`assets/icon.svg` is the **generic Zendesk mark** (from simpleicons.org, `#03363D`), not a
Sell-specific sub-mark. Zendesk's own marketing pages block automated fetches (403 on
`zendesk.com/sell/favicon.svg`, on the page itself, and on every CloudFront asset path this app
tried), and no distinct "Sell" logo was found through any reachable path — Sell is sold under the
Zendesk brand, not a separate one, which is consistent with there being no separate mark to find.
`assets/icon.dark.svg` (a white re-inking of the same verbatim path data, generated by
`_tools/icon-legibility.ts fix`) is the `appearance.darkMode.icon` variant — the single-colour dark
teal mark fails this pack's dark-tile legibility threshold as shipped.

## Layout

```
zendesk-sell/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # SellClient, the two response envelopes, error formatting, User-Agent
│   └── params.ts                # shared Param fragments (pagination, address, tags, custom fields)
├── auth/oauth2.ts                # OAuth 2.0: sign, test, afterConnect
├── actions/                      # one file per action (31)
├── health/
│   ├── service.ts                # status.zendesk.com, scoped to the Sales/Sell component
│   └── quota.ts                  # declared absence, informational
├── assets/
│   ├── icon.svg                  # generic Zendesk mark (light)
│   └── icon.dark.svg             # white re-inking, for the dark tile
└── tests/                        # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt`
deno task test
```

`deno task validate` (`--config ./deno.json`) currently fails identically for this app **and every
sibling app checked** (`apify`, `basecamp`) with `Import "@w6w/runtime" not a dependency` — the
per-app `deno.json` this task template copies does not map that import, while `_tools/deno.json`
does. This is pre-existing pack-wide drift between `_tools/audit.ts` and the per-app task template,
not something specific to this app. The equivalent, working invocation —

```bash
cd ../../_tools && deno run --no-check -A --config ./deno.json ./audit.ts zendesk-sell
```

— passes with 0 errors, 0 warnings.
