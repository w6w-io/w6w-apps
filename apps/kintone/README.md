# Kintone

Read, write and search records in a Kintone (Cybozu) App, plus comments, file
attachments and form/App metadata, against each customer's own Kintone REST
API.

- **Categories** — productivity, databases
- **Auth methods** — api-token
- **Actions** — 12
- **Egress allowlist** — `*` (every Kintone tenant is its own host — see below)
- **Website** — https://www.kintone.com
- **API docs** — https://kintone.dev/en/docs/kintone/rest-api/overview/kintone-rest-api-overview/
  (requests/responses/error shape) and
  https://kintone.dev/en/docs/common/authentication/ (the four auth methods and
  exactly which REST APIs each one may call). Both read 2026-09-05.

## Setup

### API Token

1. In the Kintone App you want to connect, go to **Settings → API Token** and
   generate a new token. Up to 20 per App; create one per system connecting
   to it so it can be revoked on its own.
2. Note your tenant's own root URL — `https://{subdomain}.cybozu.com` or
   `https://{subdomain}.kintone.com` — and, if the App lives inside a Guest
   Space, that Space's ID.
3. Note an App ID this token can access (the App you just generated the token
   in, or another it has been shared to). Kintone has no whoami for API Token
   authentication, so the connection is verified with **Get App** against this
   ID instead.
4. Paste the Tenant URL, API Token, and App ID To Verify With into the
   connection. Set Guest Space ID only if the App lives inside one.

### Why the allowlist is `*`

Kintone is a no-code database/app builder, not a single hosted API: every
customer runs their own tenant at its own subdomain, with its own Apps and its
own field schemas. There is no shared `api.kintone.com` to allowlist, so —
like `bubble`, `mautic` and `tableau` in this pack — the tenant's own URL is a
connection field and egress is `*`.

### Why API Token, not Password Authentication

Kintone documents four ways to authenticate a REST API call:

| Method | Header | Scope |
|---|---|---|
| Password | `X-Cybozu-Authorization` (BASE64 `login:password`) | Whatever the logged-in user can see — the whole tenant |
| **API Token** | `X-Cybozu-API-Token` | One App, generated inside that App's own settings |
| Session | Cookie | Browser-only, not usable from a server integration |
| OAuth 2.0 | `Authorization: Bearer` | Whatever scopes were granted |

Password Authentication runs with the full privileges of a real user account
across every App and Space in the tenant — too broad for an unattended
integration credential, and it ties the connection to one human's account.
**API Token** is generated inside a single App's Advanced Settings, cannot see
any other App, and every call it makes is attributed to the built-in
"Administrator" user in Kintone's own audit log — the purpose-built,
least-privilege option, so it is the only method this app implements.

There is also an entirely different, legacy feature that happens to share the
name "Basic Authentication" in Kintone's own docs — a network-perimeter
`Authorization: Basic` header some older environments required in front of
everything else. **It has been deprecated and unavailable since June 2020**
and is not implemented here. It is easy to confuse with the still-current
`X-Cybozu-Authorization` header Password Authentication uses (a different
header, a different mechanism) — this app uses neither, but the distinction is
worth stating explicitly since both are named "Basic" somewhere in Kintone's
vocabulary.

### What an API Token cannot reach — no "list Apps" action

Kintone's Authentication reference enumerates exactly which REST APIs accept
API Token authentication, and it is a real allowlist, not "everything except
admin settings." In particular: **Get Apps** (list every App in the tenant) is
**not** on it — only the singular **Get App** is, and only for an App ID the
caller already knows. Password, Session, or OAuth 2.0 auth is required to list
Apps. This app has no such method, so there is deliberately no "list Apps"
action here — you supply the App ID (`app-get`'s output includes `code` and
`name`, useful for confirming you have the right one).

## Actions

| Key | Type | Description |
|---|---|---|
| `record-get` | read | Retrieve one record by Record ID |
| `record-add` | perform | Create one record from an object of field values |
| `record-update` | perform | Update one record, by Record ID or a unique-key field |
| `records-search` | search | Search an App's records with Kintone's query string |
| `records-add` | perform | Create up to 100 records in one call |
| `records-delete` | perform | Delete up to 100 records by Record ID — Kintone's only delete endpoint (no single-record delete exists) |
| `comment-add` | perform | Post a comment to a record, with optional @mentions |
| `comments-list` | read | List a record's comments |
| `app-get` | read | Retrieve an App's name, description, Space and creator/updater metadata |
| `app-fields-get` | read | List an App's field codes, types and settings |
| `file-upload` | perform | Upload a file, returning a `fileKey` for use in an Attachment field |
| `file-download` | read | Download a file attached to a record, base64-encoded |

### Field values are Kintone's own wire shape, not flattened

`record-add`/`record-update`/`records-add`'s field-value params are free-form
`json` params holding Kintone's own shape exactly —
`{"FieldCode": {"value": ...}}` — rather than a flattened
`{"FieldCode": value}` this app would have to guess how to re-wrap for every
field type (a Lookup, a Table/subtable, a User Selection and a plain text
field all nest differently). `app-fields-get` tells you what belongs in it for
a specific App.

### `record-update`: Record ID or a unique key, never both

Kintone's `Update Record` addresses a record either by its Record ID or by a
field with "Prohibit duplicate values" turned on (`updateKeyField`/
`updateKeyValue`). Kintone itself errors if both or neither are supplied; this
action checks that up front so the failure is clear rather than round-tripped
through the API first.

### `records-search`: pagination lives inside `query`

Kintone's Get Records has no separate `limit`/`offset` params — they are part
of the query-string mini-language (`... order by $id asc limit 100 offset
100`, default/max 100 per page unless the query itself raises it, capped at
500). `totalCount` costs Kintone an extra count query, so it defaults off.

### Files: two different `fileKey`s

`file-upload`'s response `fileKey` is only valid for attaching that upload to
a record's Attachment field value
(`{"value": [{"fileKey": "..."}]}` in `record-add`/`record-update`'s `record`
param) — uploading does **not** attach the file to anything on its own.
`file-download`'s `fileKey` input is a *different* value: the one already
present on an Attachment field inside a record you read via `record-get` or
`records-search`. Confusing the two is the single easiest way to get a
confusing 404 from this API.

## Auth: there is no whoami

Kintone publishes no generic account/whoami endpoint for API Token
authentication — a token is scoped to one App, so there is nothing about a
fresh connection that is guessable across every Kintone tenant. The connection
test instead calls `GET /k/v1/app.json?id={testAppId}` against an **App ID To
Verify With** field, the same App the token was generated in (or one it has
been shared to). Classification comes from the response body, not the status
code: Kintone's REST API Overview states its `{code, id, message}` JSON error
shape applies to *every* failure, so a structured JSON body — even one
rejecting a wrong App ID — proves the tenant URL and token reached a real
Kintone environment; only a non-JSON response is treated as "no tenant here"
rather than merely "rejected."

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Kintone's own shared platform up? |
| `site` | dependency | Is **this connection's** own tenant reachable? |

`service` reads `status.kintone.com` — a real Statuspage instance confirmed
2026-09-05 via its own `/api/v2/summary.json` (`page.name: "Kintone"`, served
directly from that hostname, no redirect needed). The page publishes exactly
one component, "Availability", which this check reads directly; it falls back
to the page-level indicator only if that component is ever renamed or removed.

`site` sends an **unsigned** request to `GET /k/v1/records.json?app=0` against
the connection's own tenant URL. Two shapes were confirmed live 2026-09-05,
against both a real subdomain and one made up to not resolve to any tenant:
a subdomain that is not provisioned gets Cybozu's generic edge 404 — an HTML
"forest_error" page (`このリンクは不正です`, "this link is invalid") that fires
for *any* path under that host, before the request ever reaches a Kintone
environment's own REST API router. A live tenant, by contrast, answers its
documented `{code, id, message}` JSON error shape even for this unauthenticated,
deliberately-invalid (`app=0`) request — rejecting it for a bad/missing
credential rather than falling through to the edge page. `site` tells the two
apart by response shape (JSON vs. not), not by status code, since both cases
answer with a 4xx.

## What is deliberately left out

- **List Apps, and everything about Kintone's own Users/Groups/Spaces admin
  surface.** These require Password, Session, or OAuth 2.0 authentication —
  see "What an API Token cannot reach" above. This app has no such auth
  method, so nothing that needs one is implemented.
- **Bulk update (`Update Records`, with `upsert`).** Left out to keep this
  app's first release to the surface most directly covered by
  `record-update`/`records-add`; single-record update and bulk create cover
  the common cases. Re-add it as `records-update` if a workflow needs
  bulk upsert — the request shape (`records[].id`/`updateKey`/`revision`/
  `record`) is documented at `docs/kintone/rest-api/records/update-records`.
- **Legacy "Basic Authentication."** Deprecated by Kintone since June 2020 —
  see "Why API Token, not Password Authentication" above.

## Icon

`assets/icon.svg` embeds the current mark from `https://www.kintone.com/favicon.ico`
(verified 2026-09-05: 4,286-byte `.ico`, a single 32×32 32bpp image — decoded
here and confirmed to be Kintone's own red cube glyph, not a blank or unrelated
placeholder) as a `data:image/png;base64` `<image>` inside an SVG wrapper — the
same approach `bubble`, `apollo`, `bannerbear`, `blandai`, `chatwork` and
others in this pack use when a vendor publishes no vector mark. Kintone's own
mobile-app icon (a light-blue cloud/speech-bubble, from the iOS App Store
listing for `com.cybozu.kintonemobile`) is a *different* mark used for that
product specifically, not the primary brand glyph, so it was not used here.
