# GetResponse

Contacts, campaigns (lists), tags, custom fields and broadcast newsletters on the **GetResponse
API v3** — on the retail platform and on GetResponse MAX.

- **Categories** — marketing, email
- **Auth methods** — api-key
- **Actions** — 14
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.getresponse.com`, `api3.getresponse360.com`, `api3.getresponse360.pl`
- **Website** — https://www.getresponse.com/
- **API docs** — https://apidocs.getresponse.com/v3 · [OpenAPI](https://apireference.getresponse.com/)

> **Everything below was verified against GetResponse's own OpenAPI document on 2026-08-11** —
> [`apireference.getresponse.com/open-api.json`](https://apireference.getresponse.com/open-api.json),
> OpenAPI 3.0.0, version stamp `3.2026-07-28`, 2.4 MB, **141 paths** — plus its narrative
> documentation and live probes against `api.getresponse.com`. Nothing here came from a third-party
> integration directory.

## The five things most likely to go wrong

### 1. There are three platforms, and a key works on exactly one

| Platform | Host |
| --- | --- |
| GetResponse (retail) | `api.getresponse.com` |
| GetResponse MAX (US) | `api3.getresponse360.com` |
| GetResponse MAX (PL) | `api3.getresponse360.pl` |

MAX is the enterprise product, and its customers cannot reach the retail host at all. The platform is
therefore an **Auth field** next to the key rather than an action parameter — they are two halves of
one Connection — and all three hosts are allowlisted **by name**. Unlike the self-hosted apps in this
pack the set is closed and known at publish time, so the manifest says so instead of widening to `*`.

A key/platform mismatch is the most likely real-world connect failure, so `test` names it explicitly
rather than reporting only "rejected".

### 2. The header value carries a literal prefix

From the vendor's own security scheme — "Header value must be prefixed with api-key":

```
X-Auth-Token: api-key 0123456789abcdef0123456789abcdef
```

Omitting `api-key ` produces `code 1014, "Unsupported authentication method"` (verified live), which
reads like a rejected key rather than a malformed header. Paste the key alone — this app adds the
prefix.

### 3. Creating a contact answers **202**, and the contact does not exist yet

GetResponse's spec declares `202` as the success response for `POST /contacts`: the add is **queued**,
not performed. There is no contact id in the reply, and a List Contacts immediately afterwards may not
find it. A workflow that creates and then reads back has to poll by email rather than assume.

A duplicate address is a `409`, so "create or update" is two calls: try create, and on 409 look the
contact up and use Update Contact.

### 4. Update is a POST — the verb tells you nothing

GetResponse uses `POST` for both create and update across the API. `POST /contacts` creates;
`POST /contacts/{id}` updates. The id in the path is the only thing that distinguishes them.

Update is partial — only the fields present are applied — and unlike create it answers `200`
synchronously with the updated contact.

### 5. Filters and sorts are bracketed query parameters

```
?query[email]=ada@example.com&query[createdOn][from]=2026-01-01&sort[createdOn]=DESC
```

The brackets are part of the parameter name. `buildQuery` produces them from ordinary fields, and it
**skips unset values** — GetResponse treats `query[email]=` as a filter matching nothing, which is
indistinguishable from a genuine empty result.

Two ids that look interchangeable and are not: `campaign` is an **object** (`{campaignId}`), and tags
are referenced by **id** (`{tagId}`), never by name. Sending a bare string or a tag name is a
validation error rather than an implicit lookup or create.

## Auth

One method: an **API key** from **Integrations & API → API**, plus the platform.

The spec also declares OAuth2 with implicit, authorization-code and client-credentials flows. It is
not shipped, for the reason that recurs across this pack — an access token must be fetched and
refreshed, and `sign` is network-less — and because GetResponse's OAuth grants only a single `all`
scope, so it buys no least-privilege benefit over a key the user can revoke.

### The probe is `GET /accounts`

It returns the account that owns the key — `accountId`, `email`, `firstName`, `companyName`,
`timeZone` — and was read before adoption: **there is no key material in it**, which is what
disqualifies the `/me`-shaped endpoints elsewhere in this pack (Follow Up Boss's `/me` returns the
caller's own API key; Wufoo's `users.json` returns every user's). It needs no permission beyond the
key existing, and it is the only endpoint that confirms both halves of the credential at once.

`test` distinguishes GetResponse's error codes rather than flattening them: **1014** is
authentication (and names the platform-mismatch possibility), **1015** is throttling — which is not a
bad credential and must not read as one at connect time.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `contact-list` | search | `GET /contacts` |
| `contact-get` | read | `GET /contacts/{id}` |
| `contact-create` | perform | `POST /contacts` |
| `contact-update` | perform | `POST /contacts/{id}` |
| `contact-delete` | perform | `DELETE /contacts/{id}` |
| `contact-tags-add` | perform | `POST /contacts/{id}/tags` |
| `campaign-list` | search | `GET /campaigns` |
| `campaign-contacts` | search | `GET /campaigns/{id}/contacts` |
| `tag-list` | search | `GET /tags` |
| `tag-create` | perform | `POST /tags` |
| `custom-field-list` | search | `GET /custom-fields` |
| `from-field-list` | search | `GET /from-fields` |
| `newsletter-list` | search | `GET /newsletters` |
| `newsletter-create` | perform | `POST /newsletters` |

### Notes on individual actions

**"Campaign" means list, not send.** GetResponse calls a contact list a campaign, which is worth
saying because the word means a broadcast in most other marketing tools. `campaign-list` is usually
the first call a workflow makes — Create Contact and Create Newsletter both need a `campaignId`.

**`newsletter-create` sends real email.** Five fields are required and three of them are ids you have
to fetch first: a verified sender (`from-field-list` — an unverified address is rejected), a campaign,
and content. There is one subtlety the API makes easy to get wrong: the top-level `campaign` says
which campaign the newsletter *belongs to*, while `sendSettings.selectedCampaigns` says who it goes
**to**. This action defaults the second from the first so the common case is one field, and lets you
name a different audience when it differs.

**`contact-delete` takes `messageId` and `ipAddress`.** They are optional, and they record *why* a
contact was removed. A deletion without them loses that provenance permanently — which is exactly
what a consent audit asks about later.

**`custom-field-list` before setting custom fields.** The payload is keyed by `customFieldId` and
`value` is an array even for a single value; the ids and their `valueType` are published nowhere else.

**Date filters are ISO 8601**, and `changedOn` (not `createdOn`) is the cursor for "whose data
changed", which is usually what a sync wants.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | (default `degraded`) | Reads `status.getresponse.com/api/v2/summary.json` |
| `quota` | quota | app | informational | Declared `unavailable` — no readable headroom |
| `auth:api-key` | — | connection | — | Derived from `Auth.test` automatically |

### The status page is real — checked three ways

`/api/v2/summary.json` returns 13,626 bytes of JSON while `/api/v2/definitely-not-real-zzz.json`
returns **404 with 0 bytes**; the body is `application/json` parsing as the Statuspage v2 schema,
matching neither known unclaimed-host signature; and it self-identifies as
`page.name: "GetResponse"`, `page.url: "https://status.getresponse.com"`.

It publishes **42 components** — among them `API`, `Webhooks`, `Contacts (+Import)`, `Forms and
Popups`, `Webforms`, `Integration` and `Paid Ads` — at a granularity that makes the component
breakdown genuinely useful rather than decorative.

Severity stays at the `degraded` default. GetResponse is SaaS-only: both retail and MAX are
vendor-hosted, so there is no self-hosted install for which this page would be irrelevant, and an
incident really is evidence about every Connection. That is the **opposite** call from
`apps/metabase`, `apps/baserow` and `apps/mattermost`, and the difference is simply that those
products can be self-hosted and this one cannot.

One nuance recorded in the check itself: the page does not separate retail from MAX, so a MAX-only
incident may not appear here and a retail incident is reported to MAX connections too.

### Why `quota` is unavailable

A live response carries no `RateLimit-*`, `X-RateLimit-*` or `Retry-After` header. Throttling is
real — the OpenAPI document declares a `429` on **every endpoint**, with code **1015** and the
message "quota reached, please wait till next quota window" — but it is enforced by refusal, so
nothing can be read before it runs out.

`GET /accounts/sending-limits` is the tempting near-miss and is deliberately not used: it reports an
**email sending** allowance, not API request headroom, and reporting it here would answer a different
question than the check asks.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Autoresponders, RSS newsletters, transactional emails** | Each is its own configuration surface with its own content model. Worth their own pass. |
| **Newsletter statistics, campaign statistics, contact activities** | Reporting rather than integration, and most return time series that need a shaping decision. |
| **Search contacts (saved segments)** | `/search-contacts` builds and stores a segment definition — schema-shaped work, where `contact-list`'s filters cover the ad-hoc case. |
| **Shops, products, orders, carts** | GetResponse's ecommerce surface — a large, separate domain. |
| **Forms, landing pages, webforms, workflows** | Design-time objects built in the UI. |
| **Webhooks / callbacks** | Belongs to a trigger surface, not an action surface. |
| **File uploads and multimedia** | Multipart, and needs a two-step upload-then-reference flow. |
| **Account administration** (blocklists, login history, billing) | Administration rather than workflow steps. |

## Icon

`assets/icon.png` is **GetResponse's own mark**, not a drawing. No SVG is available from the usual
verbatim sources — simple-icons does not carry GetResponse — so the mark was taken from n8n's
`nodes-base`:

```
https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/GetResponse/getResponse.png
```

It is a 60×60 PNG, unmodified. The App contract accepts `assets/icon.{svg,png}`, and a real
low-resolution mark is a better answer than an invented vector one. Run `deno task fmt`, never bare
`deno fmt`.

## Layout

```
getresponse/
├── index.ts                  # AppDefinition: 14 actions, 1 auth, 2 health checks
├── lib/client.ts             # platform → host, bracketed query builder, error taxonomy
├── auth/api-key.ts           # X-Auth-Token with the literal `api-key ` prefix; /accounts probe
├── actions/                  # one file per action
├── health/                   # service (Statuspage, 42 components) + quota (unavailable)
└── tests/                    # 78 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 78 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/
```
