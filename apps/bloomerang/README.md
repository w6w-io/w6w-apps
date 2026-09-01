# Bloomerang

Bloomerang nonprofit donor/fundraising CRM — constituents, donations, funds, notes and tasks, on the
**Bloomerang REST API v2**.

- **Categories** — crm, finance
- **Auth methods** — api-key
- **Actions** — 10
- **Egress allowlist** — `api.bloomerang.co`
- **Website** — https://bloomerang.co
- **API docs** — https://bloomerang.com/api/rest-api/
- **OpenAPI spec** — https://bloomerang-api-documentation.s3.us-west-2.amazonaws.com/public_crm_generated.json

## Where the documentation actually lives, and the trap next to it

Bloomerang's marketing docs page (`bloomerang.co/features/integrations/api/rest-api`, which redirects
to `bloomerang.com/api/rest-api`) embeds a Swagger UI that loads its spec from an S3 bucket:

```
https://bloomerang-api-documentation.s3.us-west-2.amazonaws.com/public_crm_generated.json
```

That JSON is the real, current OpenAPI 2.0.0 document (`info.title: "Bloomerang API"`,
`info.version: "2.0.0"`) this app was built against — 81 paths, verified live.

**The trap:** the docs site *also* still serves a `/api/rest-api-v1/` page for a **deprecated v1**
API, explicitly labelled "This version of the REST API is now deprecated... If you are creating a
new integration, use the current REST API." v1 used a different host casing
(`api.bloomerang.com`, `.com` not `.co`) and a different object model (singular `Constituent`
resources rather than v2's `/constituent` create + `/constituents/search` split). Reading the v1 page
first (it ranks reasonably in search, and its examples look complete) would build the wrong app
entirely. This app targets **v2 only**, at `https://api.bloomerang.co/v2` — note **`.co`**, a
different domain from the docs site itself (`bloomerang.com`).

## Auth — a private key, sent as `X-API-KEY`

Bloomerang calls this a **private key API**, not an "API key" — the vocabulary matters: "The REST API
is a private key API. It is for server-to-server integrations... The private key allows anyone to
change any information they want, so you must keep this key secret." It's minted per Administrator
user (CRM → user icon → Edit My User → API Keys) and carries that user's own permissions.

The wire format is a plain, unprefixed header, confirmed against the OpenAPI document's
`ApiKeyAuth` scheme (`{"type": "apiKey", "in": "header", "name": "X-API-KEY"}`) and against the live
API (2026-09-01):

```
$ curl -i https://api.bloomerang.co/v2/user/current
HTTP/2 401
{"Message":"Missing Authorization Header","ErrorCode":110}

$ curl -i https://api.bloomerang.co/v2/user/current -H "X-API-KEY: bogus"
HTTP/2 401
{"Message":"Invalid Credentials","ErrorCode":109}
```

Both are real Bloomerang error bodies on the real host — not a generic gateway 401 — which is
exactly the kind of check that rules out a decoy host. `auth/api-key.ts`'s `test` hook classifies a
failure from that `Message` field, never from the status code alone.

Bloomerang's OpenAPI document also declares an OAuth 2.0 authorization-code flow
(`authorizationUrl: https://crm.bloomerang.com/authorize/`, scopes `ViewOnly` /
`StandardEditFinancialData` / `Standard` / `OrgAdmin`), which Bloomerang recommends specifically for
third-party, multi-tenant integrations. This app ships the private key only, because it needs no app
registration, redirect URI or client secret — the right tradeoff for a single org's own
server-to-server connection.

## Auth probe — `GET /user/current`, chosen to never echo the key

`GET /user/current` is documented as "Gets the user corresponding to the private API key used." It
needs no permission beyond the key existing (every private key belongs to exactly one Administrator
user, who can always read their own record), and its response body carries that user's own
`Id`/`Name`/`Email`/`PermissionLevel` — **never the key itself**. That distinction mattered here:
Bloomerang's `/keys` endpoint literally returns a user's API keys given a username/password, which
would have been the wrong probe to reuse for a liveness check that must not risk echoing a
credential back into logs or display data.

## Actions

| Action | Type | Endpoint |
|---|---|---|
| `search-constituents` | search | `GET /constituents/search` |
| `get-constituent` | read | `GET /constituent/{id}` |
| `create-constituent` | perform | `POST /constituent` |
| `update-constituent` | perform | `PUT /constituent/{id}` |
| `list-transactions` | search | `GET /transactions` |
| `get-transaction` | read | `GET /transaction/{id}` |
| `create-donation` | perform | `POST /transaction` |
| `list-funds` | search | `GET /funds` |
| `create-note` | perform | `POST /note` |
| `create-task` | perform | `POST /task` |

**Scope note on `create-donation`:** Bloomerang's transaction model supports up to 20 "Designations"
per transaction, each independently typed as `Donation` | `Pledge` | `RecurringDonation` |
`RecurringDonationPayment` with its own field set. This action covers the common single-designation
Donation case only — the shape Bloomerang's own docs describe first. Split payments across multiple
designations, and the Pledge/RecurringDonation transaction types, are left out rather than guessed at
partially; use the Bloomerang UI or a direct API call for those.

**This app never touches payment data.** Bloomerang's own docs are explicit that the private-key REST
API is for server-to-server data sync: "you must process the donations and collect any funds
yourself. Then you submit the finished data to Bloomerang from your server." `create-donation`
*records* that a donation happened; it does not charge a card or move money, and online transaction
forms must not use this key per Bloomerang's own warning.

**Pagination.** Every list endpoint takes `skip` (default 0) and `take` (default 50, **hard-capped at
50** per the OpenAPI schema's `maximum: 50`) and returns
`{ Total, TotalFiltered, Start, ResultCount, Results }`.

Left out deliberately: households, addresses/emails/phones as standalone objects, appeals,
campaigns, custom fields, duplicates/merge, tributes, and the pledge/recurring-donation transaction
family. Each is real surface in the OpenAPI document, but reaching parity would have meant guessing
at nested shapes (attachments, custom-value discriminated unions) this pass didn't verify live
end-to-end. Follow-up work can add them against the same client.

## Health checks

| Check | Kind | Detail |
|---|---|---|
| `service` | service | [Atlassian Statuspage](https://bloomerang.statuspage.io/api/v2/summary.json), scoped to the `CRM API - api.bloomerang.co` component |
| `quota` | quota | declared absent — no rate-limit headers are documented or observed |
| `auth:api-key` | derived | projected from the `test` hook above |

**`service`** reads `bloomerang.statuspage.io` (linked from Bloomerang's own site footer as "System
Status"), confirmed to be a genuinely claimed page (`page.id: "v5y674dmtys4"`, `page.name:
"Bloomerang"`, and a real 404 for an invented sibling path). The page lists 28 components spanning
the CRM app, the Volunteer app, the Fundraising app (Qgiv, a separate Bloomerang-owned product), and
third-party dependencies like AWS and SendGrid — most of which say nothing about this app's REST API.
The check reads the one component named exactly `CRM API - api.bloomerang.co`, so an incident
elsewhere on the page (e.g. the Volunteer app) does not report this app's own API as degraded.

**`quota`** is a declared absence, not a guess: Bloomerang's OpenAPI document declares no rate-limit
response headers on any endpoint, and a live request (2026-09-01, both the unauthenticated and the
invalid-key case) carried none — only the standard IIS/ASP.NET response headers. `severity:
"informational"` so this entry never pins the App's roll-up verdict at `unknown` forever.

## Icon

Bloomerang publishes no standalone `favicon.svg`. `assets/icon.svg` embeds the vendor's own
256×256 `apple-touch-icon.png` (the "b" flower mark on the brand green background) as a base64
`<image>` inside an SVG wrapper — the same pattern already used by several sibling apps in this pack
whose vendor ships only a raster mark.
