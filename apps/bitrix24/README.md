# Bitrix24

Manage Bitrix24 CRM leads, contacts and deals via a portal's own inbound
webhook.

- **Categories** — crm, productivity
- **Auth methods** — webhook
- **Actions** — 15
- **Egress allowlist** — `*` (every Bitrix24 portal is its own host — see below)
- **Website** — https://www.bitrix24.com
- **API docs** — https://apidocs.bitrix24.com/ — `api-reference/crm/leads/*`,
  `api-reference/crm/contacts/*`, `api-reference/crm/deals/*`,
  `api-reference/common/users/profile.html`,
  `api-reference/common/system/method-get.html`, `error-codes.html`. All read
  2026-09-06.

## Setup

### Create an inbound webhook

1. In the target Bitrix24 portal, open **CRM → Developer resources → Other →
   Inbound webhook** (older UIs) or **Applications → Developer resources →
   Other → Inbound webhook** (current UI).
2. Pick the CRM permissions the webhook needs (at minimum `crm`) and generate
   it. Bitrix24 hands back one URL of the shape
   `https://<portal>/rest/<user_id>/<webhook_code>/`.
3. Split that URL into the three connection fields:
   - **Portal URL** — everything before `/rest/`, e.g.
     `https://mycompany.bitrix24.com`.
   - **User ID** — the numeric segment right after `/rest/` (often `1`).
   - **Webhook Code** — the long alphanumeric segment after that. This is the
     actual secret — create one webhook per system connecting to this portal
     so it can be revoked on its own.

### Why the allowlist is `*`

Bitrix24 is sold both as shared SaaS (`https://<company>.bitrix24.com`) and as
fully self-hosted on-premise/enterprise software ("Bitrix24 Box") on a custom
domain. Every customer's install — a "portal" in Bitrix24's own terminology —
is its own address and its own database. There is no shared vendor API host to
allowlist, so — like `gitea`, `mautic`, `tableau` and `bubble` in this pack —
the portal's URL is a connection field and egress is `*`.

### The secret lives in the URL path, not a header

An inbound webhook's authority is the `<user_id>/<webhook_code>` path segment
itself, not a bearer token attached separately — confirmed against every
method page's own "cURL (Webhook)" example, all of which build the request
URL as `{portal}/rest/{user_id}/{webhook_code}/{method}`. Actions in this app
build a public, secret-free URL (`{portal}/rest/{method}`); the auth `sign`
hook splices the `<user_id>/<webhook_code>` segment into the path before the
request goes out — the credential is never assembled inside an action.

## Actions

| Key | Type | Description |
|---|---|---|
| `lead-add` | perform | Create a new lead |
| `lead-get` | read | Retrieve a lead by id |
| `lead-list` | search | Search leads with an optional filter, selection and sort |
| `lead-update` | perform | Update a lead's fields |
| `lead-delete` | perform | Permanently delete a lead — gated behind confirmation |
| `contact-add` | perform | Create a new contact |
| `contact-get` | read | Retrieve a contact by id |
| `contact-list` | search | Search contacts with an optional filter, selection and sort |
| `contact-update` | perform | Update a contact's fields |
| `contact-delete` | perform | Permanently delete a contact — gated behind confirmation |
| `deal-add` | perform | Create a new deal |
| `deal-get` | read | Retrieve a deal by id |
| `deal-list` | search | Search deals with an optional filter, selection and sort |
| `deal-update` | perform | Update a deal's fields |
| `deal-delete` | perform | Permanently delete a deal — gated behind confirmation |

Every write action accepts an `extraFields` JSON escape hatch for any field
not curated as its own param — a portal's `UF_CRM_*` custom fields, `ADDRESS_*`,
`UTM_*`, and anything else in the vendor's field list. Curated params win on
conflict.

### Classic methods, not `crm.item.*`

Bitrix24 now steers new integrations toward a universal `crm.item.*` method
family (one add/get/list/update/delete keyed by `entityTypeId`), and every
`crm.lead.*`/`crm.contact.*`/`crm.deal.*` method page checked while building
this app carries a "development halted, use crm.item.*" notice. They remain
fully documented, dated, current pages — this is a deprecation notice, not a
removal — and are used here anyway: each classic method gives its own entity
a typed, curated field set (`STATUS_ID` for a lead, `STAGE_ID` for a deal)
rather than one generic shape that only makes sense once you already know
which `entityTypeId` means "deal". If the classic family is ever actually
removed, migrating to `crm.item.*` needs a signature change (a `entityTypeId`
param instead of a fixed method name) but no change to this app's Auth or
transport layer.

### Pagination

`*-list` actions return a page of at most 50 records. `total` is the full
match count; `next`, when present, is the `start` value to pass for the next
page. `next` is absent once every match has been returned.

### Multi-value fields

Bitrix24's `PHONE`/`EMAIL` fields are "multiple" (`crm_multifield`): an array
of `{VALUE, VALUE_TYPE}`. The curated `phone`/`email` params accept one plain
string and wrap it as a single `WORK`-typed entry; use `extraFields` to send
several numbers/addresses or a different `VALUE_TYPE`.

## What is deliberately left out

- **OAuth2.** Bitrix24 also documents a full authorization-code flow via a
  local application registered per portal (`scope.html`,
  `api-reference/oauth/*`). The webhook reaches the identical CRM surface with
  one generated URL and zero per-portal app registration, so only it is
  implemented.
- **Everything outside leads/contacts/deals** — companies, products,
  activities, timeline, duplicates, and the rest of Bitrix24's REST surface.
  A focused CRM core, not the whole API.
- **`user.current`** was considered for the auth probe but requires the
  `user`/`user_brief`/`user_basic` scope, which a webhook scoped narrowly to
  `crm` may not have. `profile` (scope `basic`, "retrieve basic information
  about the current user without any scopes, unlike `user.current`") works
  regardless of what the webhook was granted, so it is used instead.

## HTTP 200 is not proof of success

Bitrix24's own `error-codes.html` states the rule directly: check "the HTTP
status of the response OR the presence of a specific JSON structure" —
`{"error": "...", "error_description": "..."}`. Every method page's documented
statuses (`NO_AUTH_FOUND` → 401, `INVALID_REQUEST` → 400, etc.) suggest that
error body normally rides a matching non-2xx status, but since the vendor's
own docs name the *body shape* as the thing to check rather than the status
code, `Bitrix24Client` inspects every response body for `{error}` before
trusting it — including a 200 (`lib/client.ts`, `auth/webhook.ts`'s `test`
hook, and the `portal` health check all apply this rule independently).

## Auth: no admin/whoami endpoint, so `profile` is the probe

Bitrix24 publishes no dedicated ping/health endpoint. `profile` was chosen
over `user.current` specifically because it is scoped `basic` rather than
`user` (see "What is deliberately left out" above) — it works no matter what
the webhook's creator granted it, and its response (`ID`, `NAME`, `LAST_NAME`,
`ADMIN`, `PERSONAL_GENDER`, `TIME_ZONE`, `PERSONAL_PHOTO`) never echoes the
webhook code back, unlike some vendors' whoami endpoints in this pack. The
`test` hook classifies strictly from the response body's own `{error}`/
`{result}` shape, never from the HTTP status alone.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `portal` | dependency | Is **this connection's** own Bitrix24 portal reachable? |
| `service` | service | declared unavailable — see below |

`portal` sends an **unsigned** `method.get` request (scope `basic`, no
`<user_id>/<webhook_code>` segment at all). Bitrix24's own error-codes page
documents that an unauthenticated call still gets a structured
`{"error":"NO_AUTH_FOUND","error_description":"Wrong authorization data"}`
body — that structured shape IS the "a live Bitrix24 REST router answered"
signal, independent of whether this connection's own credential still works
(which is what the derived `auth:webhook` check is for). Something answering
in a shape that is neither `{error}` nor `{result}` is reported `degraded`
rather than assumed down, since no vendor-documented "definitely wrong host"
shape exists to compare against.

`service` is a declared absence, for two independent reasons:

1. **No usable machine-readable feed exists.** `status.bitrix24.com` is
   genuinely Bitrix24-run (page title "Bitrix24 status page", not a decoy) but
   is a client-rendered SPA: `/api/v2/summary.json` and `/api/v2/status.json`
   both answered `200 text/html` with an **empty body** when checked
   2026-09-06 — there is no JSON payload behind either path. A same-named
   `bitrix24.statuspage.io` also exists and is the unclaimed-Statuspage decoy
   this pack has hit elsewhere: it 302s straight to `www.statuspage.io`'s own
   marketing page.
2. **Even a real feed would answer the wrong question.** Every Connection
   this app makes points at a customer's own portal — a shared-cloud
   subdomain for most, but a fully self-hosted on-premise install for
   enterprise customers. A vendor-wide status page could only ever speak for
   the shared cloud tier, exactly the gap `mautic`'s `service` check documents
   for genuinely self-hosted software. `portal` answers the question that
   actually matters for any given Connection.

## Icon

`assets/icon.svg` is Bitrix24's own favicon
(`https://www.bitrix24.com/favicon.svg`, 1095 bytes, verified 2026-09-06),
used verbatim.
