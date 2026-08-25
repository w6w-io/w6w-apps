# SignNow

Send documents out for signature, track and cancel invites, download signed PDFs, work from
templates, manage folders, and subscribe a webhook to document/user events, against **SignNow's
REST API**.

> **Auth:** OAuth 2.0 Resource Owner Password Credentials grant (`custom`) — one method,
> `oauth2-password`
> **Categories:** legal, documents, productivity
> **API:** `https://api.signnow.com` (production) or `https://api-eval.signnow.com` (free trial /
> eval accounts) — a connect-time choice, not an environment toggle on one account

---

## The thing to get right first: two hosts, and the spec's own `host` is the wrong one

SignNow's machine-readable contract
([`signnow/OpenAPI-Specification`](https://github.com/signnow/OpenAPI-Specification),
`signNow-oas2.json`) declares `host: api-eval.signnow.com`. That is SignNow's **free trial /
evaluation** environment — issued to developer accounts created at
[signnow.com/developers](https://www.signnow.com/developers) before subscribing to a paid plan.
Accounts on a paid plan live on `api.signnow.com` instead. These are **two separate user bases**,
not two environments of the same account the way Docusign's demo/production split works: a
password-grant login that works on one host will not exist on the other. Copying the spec's `host`
field verbatim into a production integration silently points it at the wrong environment.

This app makes the host a connect-time field (`apiHost`, defaulting to `api.signnow.com`) rather
than hardcoding either. Both hosts serve the identical API — only the account base differs — so
every action works unchanged against whichever host the Connection was made against.

## Auth

**Resource Owner Password Credentials grant**, `POST {apiHost}/oauth2/token`, HTTP Basic
(`client_id:client_secret` — a SignNow **API application**'s own credentials, from *Settings → API
Apps*) plus form fields:

| `grant_type` | Fields | Used for |
|---|---|---|
| `password` | `username`, `password` (a SignNow account's own login) | Minting the initial token (`exchange`) |
| `refresh_token` | `refresh_token` | Renewing an expired token (`refresh`) |

Both grants sit under the same Basic header. This app collects four fields — API Environment,
Client ID, Client Secret, Account Email, Account Password — and the resulting Connection acts as
that one fixed SignNow account, with no browser redirect. That is SignNow's own documented shape
for a server-to-server integration.

**The `authorization_code` grant is deliberately not implemented.** The same `/oauth2/token`
endpoint documents a third `grant_type=authorization_code`, for a user-consent browser flow — but
the OpenAPI contract defines only the token endpoint, with **no `/oauth2/authorize` path**
anywhere in it. Without a verified authorization URL this app cannot construct a safe redirect, so
per this pack's rule ("if a detail can't be confirmed, leave it out"), it is left out.

**The body is url-encoded, not multipart, and that is a runtime fact, not a SignNow one.** The spec
documents `POST /oauth2/token` as `consumes: multipart/form-data`. This runtime's `ctx.fetch`
stringifies every request body with `String(body)` on its way out of the sandbox worker (see
`packages/core/packages/runtime/src/sandbox/worker.ts`) — a real `FormData` would serialize to the
literal, useless string `"[object FormData]"`. `application/x-www-form-urlencoded` — which
`URLSearchParams#toString()` produces correctly, which the operation's own `consumes` list also
names, and which is RFC 6749's own token-endpoint encoding — is used instead, and was verified live
2026-08-25 to parse identically to a real multipart request (both classify a bad Basic pair as the
same `invalid_client`).

**`test`** calls `GET /user` with the stored Bearer token — chosen specifically **not** to call
`GET /oauth2/token` (SignNow's token-*verify* endpoint), which echoes the caller's own access token
back in its response body (`{"access_token": "…", "scope": "…", …}`). Using it as a credential probe
would be exactly the pattern this pack refuses (Mailjet's `/apikey`, Follow Up Boss's `/me`).

**Errors are almost all HTTP 400, not 401/403 — verified live 2026-08-25:**

```
GET  /user                        (no/bad bearer)    -> 400 {"error":"invalid_token","code":1537}
POST /oauth2/token                (no Basic header)   -> 400 {"error":"invalid_client","code":1538}
POST /oauth2/token (bad client id/secret)             -> 400 {"error":"invalid_client"}
GET  /                            (unmapped route)    -> 404 {"404":"Unable to find a route…"}
```

This app classifies every failure from the response body's `error` field, never from the status
code alone.

## `network.allow`

```json
["api.signnow.com", "api-eval.signnow.com"]
```

Both hosts are listed exactly — there is no per-tenant subdomain to wildcard, just the two fixed
environments a Connection can be made against.

## Setup

1. In SignNow, go to **Settings → API Apps** and create an API application to get a **Client ID**
   and **Client Secret**. A free trial account created at
   [signnow.com/developers](https://www.signnow.com/developers) lives on the eval host; a paid
   subscription lives on production — pick the matching **API Environment** at connect time.
2. Connect with the API application's Client ID/Secret plus the SignNow account's own email and
   password. That account is who every action acts as.

## Actions (16)

### Document

| Key | Type | Endpoint |
|---|---|---|
| `document-get` | read | `GET /document/{document_id}` |
| `document-download` | read | `GET /document/{document_id}/download` |
| `document-delete` | perform | `DELETE /document/{document_id}` |
| `document-move` | perform | `POST /document/{document_id}/move` |
| `document-history-get` | read | `GET /document/{document_id}/historyfull` |
| `document-invite-create` | perform | `POST /document/{document_id}/invite` |
| `document-invite-cancel` | perform | `PUT /document/{document_id}/fieldinvitecancel` |
| `document-download-link-create` | perform | `POST /document/{document_id}/download/link` |

### Template

| Key | Type | Endpoint |
|---|---|---|
| `template-create` | perform | `POST /template` (flattens an existing document into a template) |
| `document-create-from-template` | perform | `POST /template/{template_id}/copy` |

### Folder

| Key | Type | Endpoint |
|---|---|---|
| `folder-list` | read | `GET /user/folder` |
| `folder-create` | perform | `POST /user/folder` |

### Signing link · Webhooks · User

| Key | Type | Endpoint |
|---|---|---|
| `signing-link-create` | perform | `POST /link` |
| `event-subscription-create` | perform | `POST /api/v2/events` |
| `event-subscription-update` | perform | `PUT /api/v2/events/{event_subscription_id}` |
| `user-get` | read | `GET /user` |

### Notes that save an afternoon

- **`document-invite-create` covers two payload shapes on one endpoint.** SignNow's own docs
  describe a **free-form invite** (`to` is a single email address, for a document with no fillable
  fields) and a **role-based invite** (`to` is an array of recipient objects — `email`, `role_id`,
  `role`, `order`, plus per-recipient options like `authentication_type`/`password`/
  `expiration_days` — for a document whose fields are bound to roles). This action accepts `to` as
  free text and dispatches on its shape: a value starting with `[` is parsed as the role-based JSON
  array, anything else is sent as a plain email.
- **Webhooks 2.0 has a split auth model.** `POST /api/v2/events` (create) takes the same per-user
  Bearer as everything else, but `GET /api/v2/events` (list) and
  `DELETE /api/v2/events/{id}` are documented **Basic-only** (the API application's own
  `client_id:client_secret`, not a user token); `PUT` (update) accepts either. This app's `sign`
  hook only ever stamps Bearer, and an Action is never handed the raw credential to switch schemes
  — so `event-subscription-list` and `event-subscription-delete` are **not implemented**.
  `event-subscription-create` and `event-subscription-update` are, since both work with Bearer.
- **`entity_id` on an event subscription means different things for different events** — a document
  id for a `document.*` event (`document.open`, `document.update`, `document.complete`, …), a user
  id for a `user.*` event (`user.document.create`, …). SignNow's own docs state this; there is no
  separate field per event family.
- **Download format is required, and the two values mean different responses.** `document-download`
  requires `type`: `collapsed` returns the document as a single PDF, `zip` returns a ZIP of the PDF
  plus attachments. Both come back as bytes, base64-encoded with the transport content type
  alongside — the same shape `docusign`, `pandadoc`, `box` and `dropbox` use in this pack, because
  an Action's return value must survive JSON serialization across the worker boundary.
- **`GET /user` is used twice for two different reasons** — as the auth `test`/`afterConnect` probe
  (credential liveness + connection label) and as a standalone `user-get` action (an account-info
  read a workflow can call directly). Both hit the identical endpoint.

### Deliberately absent

- **Any document-upload action** (`POST /document`, `POST /document/fieldextract`). SignNow's
  contract accepts only a real multipart file upload for these — no `file_url`/`file_urls`
  alternative the way some peers offer. This runtime's `ctx.fetch` stringifies every outbound
  request body (`String(body)`) before it leaves the sandbox worker, so arbitrary binary content
  (a PDF, DOCX, …) cannot survive that trip intact — there is no faithful way to originate a new
  document from inside an Action here. Every action in this app therefore operates on documents that
  already exist in the account (uploaded via SignNow's UI, another integration, or produced
  server-side by `document-create-from-template`, which is a copy operation with no upload
  involved).
- **The `authorization_code` OAuth grant.** See *Auth* above.
- **`event-subscription-list` / `event-subscription-delete`.** See *Notes* above.
- **Document field/tab placement** (`PUT /document/{id}`, "Edit document") — positions fillable
  fields by page x/y coordinates. SignNow's own editor and template designer are for that; this app
  runs documents through a workflow rather than composing their layout, the same reasoning this
  pack's `docusign` app applies to envelope tabs.
- **Document groups, bulk invites, notary, payments, branding/multi-brand, teams and
  administration.** Each is a separate product feature with its own configuration surface, not a
  workflow step.

## Health checks

### `service` — SignNow platform status

Reads `https://status.signnow.com/api/v2/summary.json`. Unauthenticated, unsigned, app-scoped —
reports even before anyone has connected. `status.signnow.com` is widened for this hook only.

**The page is real, and it names an API component directly** — verified live 2026-08-25:

```
GET status.signnow.com/api/v2/summary.json -> 200 application/json, 2122 bytes
  page: { "id": "7z3359qf8bjw", "name": "signNow", "url": "https://status.signnow.com" }
  components: Web, Mobile apps, API, Integrations, Payments, Support
```

Unlike several vendors in this pack whose status pages roll up unrelated products, SignNow's has a
component literally named **API**, so the check reports that component's state rather than the
page-wide rollup — an outage in Payments or Support never marks this app degraded.

### `quota` — declared unavailable

SignNow's API responses carry no rate-limit / quota headers on either a successful or a failed call
(`GET /user`, `POST /oauth2/token`, verified live 2026-08-25), and the OpenAPI contract documents
none. Declared `unavailable` with `severity: "informational"`, so the app does not sit at `unknown`
forever for a signal SignNow never sends.

### `auth:oauth2-password` — credential liveness

Derived by the runtime from the Auth method's `test` hook. No declaration needed.

## Development

```sh
cd apps/signnow
deno task test
deno task check
deno task lint
deno task fmt
deno task validate
```

## Icon

`assets/icon.svg` is SignNow's own mark — copied **verbatim** from
`https://marketing-static.signnow.com/399/favicons/safari-pinned-tab.svg`, which
`https://www.signnow.com/`'s own `<head>` references as `<link rel="mask-icon" …>`. It is a single
monochrome path on a square `viewBox="0 0 700 700"`, exactly the shape a pinned-tab/app icon mark
takes; no color or wordmark was added or removed.

## Links

Every URL below was verified live on 2026-08-25.

- Vendor: <https://www.signnow.com/>
- Developer docs: <https://docs.signnow.com/docs/signnow/welcome>
- API reference: <https://docs.signnow.com/docs/signnow/reference>
- OpenAPI specification (the machine-readable contract this app was built against):
  <https://github.com/signnow/OpenAPI-Specification> (`signNow-oas2.json`)
- Status page: <https://status.signnow.com/>
- GitHub org: <https://github.com/signnow>
