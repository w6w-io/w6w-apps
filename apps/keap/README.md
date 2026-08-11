# Keap

Keap — formerly Infusionsoft — is a small-business CRM and marketing-automation
platform. This app covers the parts a workflow actually reaches for: contacts,
tags, companies, opportunities, tasks, notes, campaigns and automations,
commerce reads, users, the business profile, and transactional email.

**36 actions · 2 auth methods · 3 declared health checks (+2 derived) · 298 unit
tests.**

## Sources

Everything here was verified on **2026-08-11** against Keap's own
machine-readable OpenAPI 3.1 documents and live probes. Nothing came from a
third-party integration directory.

| Source | Bytes | md5 |
|---|---:|---|
| [`crm.infusionsoft.com/app/v3/api-docs/V1`](https://crm.infusionsoft.com/app/v3/api-docs/V1) | 344,714 | `ec10d44f3f8d61876f8c8af4deb32dc1` |
| [`crm.infusionsoft.com/app/v3/api-docs/V2`](https://crm.infusionsoft.com/app/v3/api-docs/V2) | 958,308 | `85f512657302f58bed63fa8945917c69` |

Plus these developer-portal pages, which carry things the OpenAPI does not:
[OAuth2](https://developer.keap.com/getting-started-oauth-keys/),
[Personal Access Tokens & Service Account Keys](https://developer.infusionsoft.com/pat-and-sak/),
[API Token Quota and Usage Measurements](https://developer.infusionsoft.com/api-token-quota-and-usage-measurements/),
[Legacy Key Deprecation](https://developer.infusionsoft.com/legacy-key-deprecation/).

> **Do not try to scrape `developer.keap.com/docs/restv2/`.** It is a Redoc
> shell: `/docs/rest/` and `/docs/restv2/` are both 3,214 bytes and differ *only*
> in a per-request Cloudflare challenge nonce (`diff`ed 2026-08-11 — one line,
> `window.__CF$cv$params`). The endpoint content is rendered client-side from the
> two URLs above, which its own `config.js` names. A nonsense sub-path 404s with
> the site's 21,349-byte error page, so the shell is not a catch-all either — it
> is just empty. Note also that `api.infusionsoft.com/crm/rest/v1/openapi.json`
> is **auth-gated**: it answers 401 with the same Apigee `fault` envelope as
> every other endpoint (see finding 1). The two `crm.infusionsoft.com` URLs are
> not gated.

Base URL: `https://api.infusionsoft.com/crm`, the single server both documents
declare. Every path carries its own `/rest/v1` or `/rest/v2` prefix.

## v1 or v2, per resource

The rule is **v2 unless v2 does not have the resource**. v2 is the vendor's
stated direction and is the larger, better-documented surface: 236 paths / 398
operations across 43 tags, against v1's 92 paths / 141 operations across 20.

There is exactly one exception, and it is not a preference — it is the only
option:

| Resource | Version used | Why |
|---|---|---|
| **Appointments** | **v1** | v2 declares 236 paths and **not one is an appointment**. v1 has four (`/appointments`, `/appointments/{id}`, and the model + custom-field endpoints). Dropping them to stay v2-pure would remove a resource rather than modernise one. |
| Business profile | v2 | `GET /rest/v2/businessProfile` and `GET /rest/v1/account/profile` return the same information under different schema names. v1 additionally returns `phone_ext`; that is not worth pinning a resource to the older surface. |
| Everything else | v2 | Contacts, tags, companies, opportunities, tasks, notes, campaigns, automations, products, orders, subscriptions, email, users. |

`tests/index.test.ts` derives the set of v1-touching actions from every action's
own source and asserts it is exactly the two appointment actions, so a third one
cannot be added without justifying it there.

## The five things that would have cost a day

### 1. Two error envelopes, and the documented one is the rarer

Both OpenAPI documents declare *every* non-2xx response as the `Error` schema —
`{code, message, status, details[]}`. That is the **application's** shape, and
you only see it once a request has been authenticated.

Keap fronts the API with an Apigee gateway, and everything the gateway rejects
itself — every auth failure, every throttle — arrives in Apigee's own shape,
which appears **nowhere** in either document:

```json
{"fault":{"faultstring":"Invalid Access Token",
          "detail":{"errorcode":"keymanagement.service.invalid_access_token"}}}
```

An integration that parses only the documented shape prints `undefined` for
exactly the failures that are most common in production. `lib/client.ts` reads
both.

### 2. One status code, four situations

Keap answers **401 for four different things**, three of them byte-identical at
the status line. Measured against `api.infusionsoft.com` on 2026-08-11:

| Request | Status | `fault.detail.errorcode` |
|---|---|---|
| no `Authorization` header | 401 | `oauth.v2.InvalidAccessToken` |
| `Authorization: not-a-real-token` (no `Bearer`) | 401 | `oauth.v2.InvalidAccessToken` |
| `Authorization: Bearer <garbage>` | 401 | `keymanagement.service.invalid_access_token` |
| a path that does not exist, unauthenticated | 401 | `oauth.v2.InvalidAccessToken` |

The first two mean *no credential reached Keap* — reconnect, because the problem
is upstream of the token. The third means *a token was presented and rejected* —
it is wrong, expired or revoked. Sending a user to the wrong screen is the cost
of reading the status code instead of the body, and `auth/probe.ts` classifies
from `fault.detail.errorcode` for that reason.

The fourth row has a second consequence: **the gateway authenticates before it
routes**, so you cannot probe endpoint existence without a credential. An
unauthenticated 404 check proves nothing on this API.

### 3. `status.keap.com` looks like a catch-all and is not one

Keap was acquired by Thryv. `status.keap.com` **301-redirects to the apex of
`status.thryv.com`, discarding the path**:

```
GET https://status.keap.com/api/v2/summary.json
  -> 301  location: https://status.thryv.com     (no path!)
  -> 200  text/html  1,293,064 bytes
```

Every path under `status.keap.com` therefore answers with the same 1.29 MB HTML
page, which reads exactly like an unclaimed-host catch-all. Follow the redirect
by hand and the real page is an ordinary Atlassian Statuspage:

| Path on `status.thryv.com` | Status | Bytes | md5 (first 12) |
|---|---|---:|---|
| `/api/v2/summary.json` | 200 | 18,010 | `4d867110d499` |
| `/api/v2/status.json` | 200 | 223 | `586ed4fd5ffc` |
| `/history.atom` | 200 | 54,613 | `00fadd40f5c7` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | — |

Four different answers and a hard 404 on the nonsense path: real, not a
catch-all. `page.name` is `"Thryv"`, `page.url` is `https://status.thryv.com`.

**The runtime allowlists the URL you pass, not the redirect target**, so
`health/service.ts` calls `status.thryv.com` directly and declares only that
host.

**And the page-level indicator is not Keap's verdict.** `status.indicator` rolls
up **52 components in 6 product groups** — Business Center, Marketing Center,
MyAccount, Reporting Center, Payments and Keap. Exactly **one group is Keap's**
(`dkpk4thk3t66`), with 8 children: Authentication, APIs, Automation,
Contacts/Company, Email, Forms, Landing Page, Communication (Text,Voice). Reading
the indicator — which every other Statuspage-backed app in this pack correctly
does — would report Keap down because Thryv's Website Builder is having a bad
afternoon. This check derives its verdict from the Keap group's own children and
reports the Thryv-wide indicator as message context only. If the group ever
disappears from the page, the check reports `unknown` rather than falling back to
the indicator.

### 4. A `filter` grammar, not query parameters

Every v2 list endpoint declares exactly five query parameters — `filter`,
`page_token`, `order_by`, `page_size`, `fields` — and **no per-field ones**. All
search terms go inside the one `filter` string:

```
?filter=given_name%3D%3DMary%3Bcity%3D%3DChan%2A
        given_name==Mary  ;  city==Chan*
```

`?email=x` is not an error and not a filter — it is ignored, and the call
returns everything. Clauses join with `;`, equality is `==`, a trailing `*` is a
prefix match on text fields, and `> < >= <=` work on numeric and date fields.
Custom fields are addressed by their `field_name` from the resource's `/model`
endpoint. Three documented sentinels are *not* ids and are the only way to ask
their question: `category_id==NONE` (tags in no category),
`user_id==UNASSIGNED` (tasks with no owner), and `email==NONE` /
`given_name==NONE` / `family_name==NONE` on tagged contacts (field absent).

Two more things about the query string:

- **Encoding.** `lib/client.ts` builds the query itself rather than using
  `URLSearchParams`, which applies form encoding (space → `+`, `*` left bare).
  Keap's own examples spell the escapes out — `%3D%3D`, `%3B`, `%2A`, `%20` —
  and that is what this sends.
- **Two array parameters, serialized differently, and neither says so.** Both
  `fields` and `update_mask` are array-typed with no `style`/`explode`. Every
  `fields` description reads "Comma-delimited list of …", so it is joined;
  `update_mask` has no such prose and its `items.enum` members are bare property
  names, so a comma-joined value is not in the enum and it must be a repeated
  key. Getting that backwards re-opens finding 5.

### 5. `PATCH` deletes what you did not mention

Every collection property on `CreateUpdateContactRequest` — `addresses`,
`email_addresses`, `phone_numbers`, `fax_numbers`, `social_accounts`,
`custom_fields` — carries Keap's own note:

> "Any item not listed here will be removed if it already exists. If an empty
> array is specified, all existing values will be removed."

So `PATCH {"email_addresses":[{"email":"new@x.com","field":"EMAIL1"}]}` does not
*add* an address; it makes that the only one, discarding EMAIL2 and EMAIL3.
`update_mask` is what narrows the blast radius, so **`contact-update` always
sends one**, derived from the properties actually filled in when the caller does
not name them. An update with nothing to update is refused rather than sent
maskless.

This cannot rescue the *within*-property case: naming `email_addresses` in the
mask still replaces the whole list. Read the contact first if you mean to add
one.

## Auth

Both credential types Keap currently supports, because they are not equivalent.

| Method | `key` | Wire format | Notes |
|---|---|---|---|
| OAuth 2.0 (Authorization Code) | `oauth2` | `Authorization: Bearer <access_token>` | Needs a Keap developer app registered on this w6w installation |
| Personal Access Token / Service Account Key | `access-key` | `Authorization: Bearer <key>` | Created in the Keap app under Settings > API Settings. No registration, no expiry |

**OAuth has exactly one scope, and it is `full`.** Keap: "The only current valid
value is `scope=full`." There is no least-privilege OAuth story here — an
approved integration can read and write everything the authorizing user can.

**The refresh request is not shaped like the code exchange.** This is the OAuth
detail that costs an afternoon. Both go to `POST https://api.infusionsoft.com/token`
as `application/x-www-form-urlencoded`, and they authenticate the client
differently:

- **Code exchange** — `client_id` and `client_secret` in the **form body**, with
  `code`, `grant_type=authorization_code`, `redirect_uri`.
- **Refresh** — `grant_type=refresh_token` and `refresh_token` in the body, and
  the client credentials in an **HTTP Basic header**: Keap's own pseudo-code is
  `Basic + base64_encode(CLIENT_ID + ':' + CLIENT_SECRET)`. No body-parameter
  form is documented for this grant.

A host that reuses the body form for refresh gets a connection that works until
the first access token expires. **Refresh tokens also rotate** — Keap returns a
new one with every refresh and the old one stops working, so it must be
persisted each time. Neither is something an App can implement (it is never
handed the client secret), so both live here as a note to whoever wires the host
side; `auth/oauth2.ts` declares no `refresh` hook for that reason.

**PKCE is set to `false` explicitly.** `pkce` defaults to `true` in `@w6w/types`,
and Keap's authorization request documents exactly four query parameters —
`client_id`, `redirect_uri`, `response_type`, `scope`. Neither `code_challenge`
nor `code_challenge_method` appears in the OAuth guide or in either document's
`authorizationCode` flow object, and the token request is authenticated with the
client secret (a confidential client). Leaving the default on would send Keap a
parameter it has never said it handles. **This is an absence of documentation,
not documented absence of support** — it was not testable without a registered
`client_id`. If Keap publishes PKCE support, flipping it is a one-line change
guarded by a test.

**A Personal Access Token is not a Service Account Key.** Keap: a PAT "operates
under the user context of the user creating it, with that user's visibility and
editing permissions", while a SAK is admin-only and "will grant admin access to
all of your stored data". A PAT held by a restricted user is a perfectly *live*
credential that will still be refused plenty of reads — which is what picks the
health probe below.

**Legacy XML-RPC API keys are deliberately not offered.** They still work when
sent as `Authorization: Bearer <legacy key>`, but Keap's own deprecation notice
announces scheduled brownouts and eventual deactivation. Offering them would be
building in a future outage.

## Health checks

| Check | Kind | Posture | What it answers |
|---|---|---|---|
| `service` | service | `none`, egress widened to `status.thryv.com` | Is the **Keap group** on Thryv's status page healthy? (See finding 3.) |
| `quota` | quota | `signed` | How much daily quota, per-minute throttle and per-tenant ceiling is left? |
| ~~`spike-rate`~~ | quota | declared absence, `informational` | Keap publishes no per-second spike metrics — stated as a positive fact. |
| `auth:oauth2`, `auth:access-key` | credential | derived | Projected from each method's `test` hook. |

**The credential probe is `GET /rest/v2/oauth/connect/userinfo`**, chosen by
reading its schema and measuring the wire, not by its name:

- **It requires a credential.** Unauthenticated it answers 401 — and so does
  everything else on this API, so the ElevenLabs `/v1/voices` / Apify `/v2/store`
  trap (a probe that passes for a connection whose token never attached) cannot
  occur here.
- **No permission can withhold it.** It is OIDC-shaped identity about the
  caller. The obvious alternatives — `GET /contacts?page_size=1`,
  `GET /tags?page_size=1` — are exactly what a restricted-user PAT is
  legitimately refused, which would report a working connection as broken.
- **It echoes no credential.** `GetUserInfoResponse` is
  `{email, sub, id, keap_id, family_name, given_name, middle_name,
  preferred_name, is_admin, tenant_id}` — identity, not secret. (Contrast
  Mailjet's `/apikey`, Follow Up Boss's `/me` and ElevenLabs' `/v1/user`, which
  hand the caller's own credential back.)

A **429 on the probe fails loudly** with a message saying so. It proves nothing
about the credential either way, and `test` has no third state, so it refuses to
pass a token it never verified.

**The quota check reads headers, and one family is pipe-delimited.** Keap
documents three families and this check reports all three separately, because the
case that matters most is "plenty of my own quota left, tenant ceiling exhausted
by somebody else's integration":

| Family | Window | OAuth | PAT / SAK |
|---|---|---:|---:|
| `x-keap-product-quota-*` | day | 150,000 | 30,000 |
| `x-keap-product-throttle-*` | minute | 1,500 | 240 |
| `x-keap-tenant-throttle-*` | minute + day | 10,000 / 250,000 (per application instance, any token type) | same |

Keap's documented header table describes each field as a **scalar** —
"`x-keap-tenant-throttle-time-unit` … Currently 'minute' for all consumers". The
wire disagrees: measured 2026-08-11 the tenant family carries **two windows in
one header**, positionally aligned and pipe-delimited
(`time-unit: minute|day`, `interval: 1|1`), matching the documented
10,000/minute + 250,000/day pair. `Number("1|1")` is `NaN`, so a reader that
trusts the documented scalar reports nothing at all.

> **What was and was not measured on the quota headers.** The header *names*,
> their presence on every response and the pipe-delimited structure were
> measured directly — an unauthenticated 401 carries the full header set with
> `time-unit` and `interval` populated. The *numeric* values were **not**: they
> are blank without a live credential, which is why this check is `signed`. The
> parser therefore handles both the scalar and the pipe forms and reports
> `unknown` rather than a zero when a family is absent or blank.

## Actions

| Resource | Actions |
|---|---|
| Contact | `contact-list` · `contact-get` · `contact-create` · `contact-update` · `contact-delete` · `contact-tags-list` |
| Note | `contact-notes-list` · `contact-note-create` |
| Tag | `tag-list` · `tag-create` · `tag-apply` · `tag-remove` · `tag-contacts-list` |
| Company | `company-list` · `company-get` · `company-create` |
| Opportunity | `opportunity-list` · `opportunity-get` · `opportunity-create` · `opportunity-stage-list` |
| Task | `task-list` · `task-create` |
| Email | `email-send` · `email-list` · `email-status-get` |
| Campaign / Automation | `campaign-list` · `campaign-sequence-list` · `campaign-sequence-add-contacts` · `automation-goal-achieve` |
| Commerce | `product-list` · `order-list` · `subscription-list` |
| Account | `user-list` · `business-profile-get` |
| Appointment (v1) | `appointment-list` · `appointment-create` |

### Smaller traps, each documented where it lives

- **`emails:send` bodies must be Base64**, and sending raw HTML does **not**
  error — the recipient gets the literal markup. `email-send` encodes for you
  (UTF-8-safe; bare `btoa` throws on an emoji) and leaves already-encoded content
  alone. It also answers **202 Accepted with no body** — no message id, nothing
  to correlate a later delivery against; use `email-list` filtered by contact.
  And exactly one of `user_id` / `from_address` is required, never both.
- **`contacts` POST with `duplicate_option` is an upsert**, without it a create.
  A new contact must carry at least one email, phone or address.
- **Required properties that are not the obvious ones**: a Task requires only
  `assigned_to_user_id` (not a title); a Note requires `user_id` *and* either a
  title or a type; an Opportunity requires `stage_id` (Keap has no default
  stage).
- **`tags/{id}/contacts:applyTags` returns per-contact results and still answers
  200 when part of the batch failed** — the failure is a value in the map, under
  the key `results`. Its mirror, `:removeTags`, answers **204 with no body at
  all**, and the campaign equivalent names its map
  `add_to_sequence_results` (the automation equivalent:
  `add_to_automation_sequence_results`). Four shapes, one idea.
  `ALREADY_IN_SEQUENCE` is not a failure — it is what a safe re-run returns.
- **`automations/goals/achieve` takes integer ids** (`contact_id`,
  `automation_id`, `goal_id`) where every other v2 endpoint declares the same
  identifiers as strings, and requires *either* `integration`+`call_name` *or*
  `automation_id`+`goal_id` — but only `contact_id` is in the schema's `required`
  list, so naming neither pair passes schema validation and fails at runtime.
- **Four spellings of "the date window"**, one per resource:
  `start_update_time`/`end_update_time` (contacts), `since_time`/`until_time`
  (tasks), `start_created_time`/`end_created_time` (emails),
  `created_since_time`/`created_until_time` (orders). There is no shared
  convention; each action states its own.
- **`order_by` field names are per-resource and sometimes odd.** Opportunities
  sort by `created_time` where everything else uses `create_time`; campaigns use
  lowercase unseparated names (`publisheddate`, `completedContactCount`,
  `datecreated`, `lastupdated`).
- **Two schema defects, handled rather than propagated.** `remind_time_mins`
  (v2 task) and `remind_time` (v1 appointment) are declared `type: integer` with
  a **string** enum; numbers are sent, per the declared type and the `example`.
  And v1's `GET /appointments` declares one object-typed query parameter,
  `appointmentSearchCommand`, that does not exist on the wire — the real
  parameters are its own properties sent flat (`since`, `until`, `limit`,
  `offset`, `contact_id`), which is what a Spring command object produces.
- **Sparse responses.** The v2 Company list omits `notes`, `fax_number`,
  `address`, `email_address`, `phone_number`, `update_time`, `create_time` and
  `custom_fields` unless `fields` names them, so an empty `email_address` means
  "not requested", not "not set". Companies also expose tags only as `groups`, a
  **comma-delimited string** — a Contact carries both that and a real `tag_ids`
  array.
- **v1 and v2 page differently.** v2 is an opaque cursor (`page_size` in,
  `next_page_token` out); v1 is offset/limit and returns `next` as a
  fully-formed absolute URL. `appointment-list` reads the offset back out of it
  rather than handing a caller a URL to re-fetch blind.
- **`campaigns/{id}/sequences` advertises a cursor it cannot accept** — the
  response carries `next_page_token` and the operation declares exactly one
  parameter (`campaign_id`). The token is surfaced as a `truncated` flag, since
  reporting it is all that can be done.

## Deliberately not covered

The v2 surface is 398 operations across 43 tags; this app models the CRM core.
Everything below is a conscious omission, not an oversight.

**Whole resource areas left out**

- **Affiliates** (48 operations) — commission programs, redirect links, payments,
  clawbacks and their own custom-field model. A product in its own right.
- **Commerce writes** — order and subscription creation, order items, payments,
  invoicing, taxes, refunds, payment methods and merchant configuration
  (`Orders` 29, `Subscriptions` 20, `Payment Methods` 4, `Sales` 3,
  `Merchants` 1, `Shipping` 1). Reading orders, subscriptions and products is
  covered; writing money is not, because a half-modelled billing surface is worse
  than none.
- **Discounts** — five separate tags (free-trial, order-total, product,
  product-category and shipping discounts, 33 operations) each with their own
  criteria endpoints.
- **Lead sources** and their expense/recurring-expense trees (21 operations).
- **Custom-field administration** — the `…/model/customFields` create/update/
  delete endpoints, their groups and tabs, on all seven resources that have them.
  Reading and writing custom-field *values* is supported everywhere via the
  `customFields` param; creating the field definitions is a schema-migration
  operation, not a workflow step.
- **Files** (6), **Reporting** (4), **Webforms** (2), **Product categories** (9),
  **Product interest bundles** (8), **Subscription plans** (5),
  **User groups** (2), **Locale lookups** (4), **Settings** (3),
  **Integrations/WordPress** (4), **Referrals** (2), **Automation categories** (4),
  **Lead score** (1).
- **Contact links, merge, payment methods** — `contacts:merge`,
  `contacts:link`/`:unlink`, `contacts/{id}/paymentMethods`, and the link-type
  admin endpoints.
- **`GET /rest/v2/companies/{id}/tags`** and the company tag apply/remove pair —
  the contact-side equivalents are covered; the company side is not.
- **`GET /rest/v2/notes`** (account-wide) — the per-contact form is modelled
  instead, because the account-wide one needs `contact_id` inside the filter to
  be scoped and forgetting that returns every note in the account.

**v1-only surfaces left out**

- **REST Hooks** (`/rest/v1/hooks`, 8 operations) — Keap's webhook subscription
  API, and the natural basis for a `TriggerDefinition`. Triggers are out of
  scope for this app; adding them means reading `rfcs/trigger.md` first.
- **XML-RPC** (`api.infusionsoft.com/crm/xmlrpc`) entirely.

**Things deliberately not exposed on covered actions**

- **`sinceAsDate` / `untilAsDate`** on v1 appointments — the same two bounds in a
  second format, with nothing documented about which wins if both are sent.
- **Opportunity `update`/`delete`, task `update`/`delete`, note
  `update`/`delete`, company `update`/`delete`, tag `update`/`delete`** — the
  create and list halves are modelled; the mutating remainder is not, to keep
  this app's first version reviewable.
- **`subscription-list`'s `status` clause is free text.** Keap publishes no enum
  for it anywhere in the v2 document, so inventing a select would ship values the
  vendor never named.

## Egress

`w6w.network.allow` is `["api.infusionsoft.com"]` — one host, because Keap is
SaaS-only with a single origin and a tenant is identified by the credential, not
by the URL. No action accepts a host parameter and none contains an absolute URL
(asserted in `tests/index.test.ts`).

`status.thryv.com` belongs to the `service` check's own `network.allow` and is
never added to the app's list. `accounts.infusionsoft.com` is allowed implicitly
as an OAuth endpoint host. `127.0.0.1` is **not** declared: nothing here calls it.

## Icon

`assets/icon.png` — downloaded verbatim from
<https://keap.com/apple-touch-icon.png> on 2026-08-11.

- **4,222 bytes**, `image/png`, 180 × 180 RGBA
- **md5 `33a0ccad77795f59944838c316d93135`**

`tests/index.test.ts` asserts the byte length and reads the PNG magic and the
IHDR dimensions straight off the header, so a redraw fails the suite.

**No SVG was used, and the two candidates were checked.**
`keap.com/favicon.svg` answers **404** with a 202,176-byte HTML page — the site's
404 document, not an icon. `keap.com/safari-pinned-tab.svg` is real (1,239 bytes,
`image/svg+xml`, md5 `de7a71ff118f65f258c112ebc14c2fea`) but is a
potrace-generated **monochrome mask icon** with no colour, which is what Safari's
pinned-tab slot requires and a poor app mark. The full-colour apple-touch-icon is
the vendor's actual mark.

## Development

```bash
# All of these run in the api container; there is no deno on the host.
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/keap && deno task validate && deno task check \
         && deno task lint && deno task fmt && deno task test'
```

Use **`deno task fmt`**, never bare `deno fmt` — the task is scoped to
`index.ts actions/ auth/ health/ lib/ tests/` so it cannot rewrite `assets/`.
