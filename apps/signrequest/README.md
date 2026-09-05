# SignRequest

Create documents and send them out for signature, track/cancel/forward/resend SignRequests,
download the signed PDF, work from templates, search and list documents, and subscribe webhooks to
document/signer events, against **SignRequest's REST API**.

> **Auth:** API Token (`apiKey`) — `Authorization: Token YOUR_TOKEN_HERE`
> **Categories:** legal, documents, productivity
> **API:** `https://signrequest.com/api/v1/` (one host — no per-team subdomain required)

---

## Auth

SignRequest issues a single **API Token** from a team's own **API settings** page inside the
SignRequest UI (Settings → API). It goes on every request as:

```
Authorization: Token YOUR_TOKEN_HERE
```

Verified against `https://signrequest.com/api/v1/schema/swagger.json`
(`securityDefinitions.Token = {in: header, type: apiKey, name: Authorization}`) — note the scheme
name is literally **`Token`**, not `Bearer`.

**A missing or invalid token answers `401`** with a small DRF-shaped envelope — verified live
2026-09-05:

```
GET /documents/ (no token)   -> 401 {"detail":"Authentication credentials were not provided."}
GET /documents/ (bad token)  -> 401 {"detail":"Invalid token"}
```

This app classifies a failure from the body's `detail` field (or, for validation errors on a
`POST`/`PATCH`, Django REST Framework's other shape — `{"<field>": ["<message>"]}`), never from the
status code alone.

**The probe: `GET /teams/`, not `GET /api-tokens/`.** `GET /api-tokens/` looked like an obvious
whoami candidate, but its schema (`AuthToken`) carries a `key` field — a list of existing tokens can
echo token **values** back in the response body, exactly the Mailjet-`/apikey`/Follow-Up-Boss-`/me`
shape this pack refuses to use as a credential probe. `GET /teams/` needs no scope beyond "list this
token's own team(s)" and its response (`name`, `subdomain`, `logo`, `phone`, …) carries no credential
material.

**No OAuth2 flow exists.** SignRequest also documents `POST /api-tokens/`, which mints a *new*
token from an account's own `email`+`password` — a second, different credential shape this app
never collects, since an Action cannot be handed the raw credential to make that call.

## The thing to get right first: one host, not a per-team subdomain

SignRequest's docs describe browsing the API in a logged-in browser tab at
`https://<your_subdomain>.signrequest.com/api/v1/`, which reads as though a Connection needs a
per-team subdomain the way some multi-tenant vendors do. It doesn't — the swagger contract's `host`
is the bare `signrequest.com`, and an API token authenticates against that host directly (verified
live 2026-09-05: `GET https://signrequest.com/api/v1/documents/` is a real, reachable endpoint, not
a redirect to a subdomain). The subdomain form is only a convenience for browsing one team's
endpoints as a logged-in human.

## `network.allow`

```json
["signrequest.com"]
```

## Setup

1. In SignRequest, go to **Settings → API** and create an **API Token**.
2. Connect with that token.

## Actions (26)

### Document

| Key | Type | Endpoint |
|---|---|---|
| `document-create` | perform | `POST /documents/` |
| `document-get` | read | `GET /documents/{uuid}/` |
| `document-list` | read | `GET /documents/` |
| `document-delete` | perform | `DELETE /documents/{uuid}/` |
| `document-search` | search | `GET /documents-search/` |
| `document-attachment-create` | perform | `POST /document-attachments/` |
| `document-attachment-list` | read | `GET /document-attachments/` |

### SignRequest

| Key | Type | Endpoint |
|---|---|---|
| `signrequest-create` | perform | `POST /signrequests/` |
| `signrequest-quick-create` | perform | `POST /signrequest-quick-create/` |
| `signrequest-get` | read | `GET /signrequests/{uuid}/` |
| `signrequest-list` | read | `GET /signrequests/` |
| `signrequest-cancel` | perform | `POST /signrequests/{uuid}/cancel_signrequest/` |
| `signrequest-forward-signer` | perform | `POST /signrequests/{uuid}/forward_signer/` |
| `signrequest-resend-email` | perform | `POST /signrequests/{uuid}/resend_signrequest_email/` |

### Template · Webhook · Team · Events

| Key | Type | Endpoint |
|---|---|---|
| `template-list` | read | `GET /templates/` |
| `template-get` | read | `GET /templates/{uuid}/` |
| `webhook-create` | perform | `POST /webhooks/` |
| `webhook-list` | read | `GET /webhooks/` |
| `webhook-get` | read | `GET /webhooks/{uuid}/` |
| `webhook-update` | perform | `PATCH /webhooks/{uuid}/` |
| `webhook-delete` | perform | `DELETE /webhooks/{uuid}/` |
| `team-list` | read | `GET /teams/` |
| `team-member-list` | read | `GET /team-members/` |
| `event-list` | read | `GET /events/` |
| `event-get` | read | `GET /events/{uuid}/` |
| `audit-event-list` | read | `GET /audit-events/` |

### Notes that save an afternoon

- **Pagination is `page`, not `offset`.** Every list endpoint here takes `page`/`limit` query
  params — a **page number**, not `offset`+`limit` the way most other DRF-built APIs in this pack
  paginate — and answers the standard DRF envelope: `{"count", "next", "previous", "results"}`.
- **`document`/`template` reference fields are full resource URLs, not bare uuids.** SignRequest's
  contract declares `SignRequest.document`, `Document.template` and `DocumentAttachment.document`
  as `type: string, format: uri` — e.g. sending a SignRequest expects
  `"document": "https://signrequest.com/api/v1/documents/<uuid>/"`, not a bare uuid. Every action
  here still takes a plain uuid as its own param (consistent with the rest of this pack) and builds
  the full URL before it goes on the wire (see `lib/client.ts`'s `resourceUrl`) — sending a bare
  uuid where SignRequest's own docs show it verbatim in a curl example is the mistake this saves.
- **`document-create` covers three, mutually exclusive content sources** — `templateId` (copies an
  existing template), `fileFromUrl` (a publicly reachable URL, including a Google Drive shareable
  link, that SignRequest downloads), or `fileFromContent`+`fileFromContentName` (base64-encoded
  content plus its filename, so SignRequest can infer the content type). Give exactly one.
- **`signrequest-quick-create` takes the combined fields of `document-create` and
  `signrequest-create`** and does both in one call — useful when a workflow doesn't need the
  document's own uuid before sending. Chaining multiple documents (SignRequest's own
  `after_document` feature) still works across quick-create calls, per SignRequest's docs.
- **Signers are a JSON array, not repeated params.** `signrequest-create` and
  `signrequest-quick-create` both take a `signers` text param parsed as JSON — only `email` is
  required per signer; SignRequest's `Signer` object documents many optional fields (`order`,
  `language`, `needs_to_sign`, `approve_only`, `notify_only`, `in_person`, `redirect_url`,
  `after_document`, `password`, …) this app passes through verbatim rather than re-declaring as
  30-odd flat params.
- **Downloading the signed PDF is not a separate action.** Once signed, `document-get` (or
  `document-list`) returns a `pdf` field — a temporary URL (5-minute expiry) to the signed PDF —
  directly on the document resource; there is no separate `/download` endpoint to call.
- **Webhook update uses `PATCH`, not `PUT`.** SignRequest documents both on
  `/webhooks/{uuid}/` — `PUT` requires resending `event_type`+`callback_url` in full; this app uses
  `PATCH` so a single field (e.g. just the callback URL) can change without resending the rest.

### Deliberately absent

- **`POST /api-tokens/` (mint a new API token).** Requires the account's own `email`+`password` —
  a second, different credential shape this app never collects, since an Action cannot be handed
  the raw credential to make that call.
- **`GET /api-tokens/` (list tokens).** See *Auth* above — its schema can echo token values.
- **Team creation, settings updates, deletion, and member invitation**
  (`POST`/`PATCH`/`DELETE /teams/{subdomain}/`, `POST /teams/{subdomain}/invite_member/`). Account
  administration, not a workflow step — SignRequest's own UI is for that.
- **The Frontend "prefill" API and the SignRequest-js client.** Both are for a vendor's own hosted
  signup page / embedded widget, not a server-side workflow action.
- **HMAC event-hash verification.** SignRequest's push-callback payload (`events_callback_url`)
  carries an `event_hash` a *receiver* verifies with the API token as an HMAC-SHA256 key — that is
  the receiving webhook endpoint's own responsibility, not something this app (which only calls
  out, never receives) can implement.

## Health checks

### `service` — SignRequest platform status

Reads `https://signrequest.statuspage.io/api/v2/summary.json`. Unauthenticated, unsigned,
app-scoped — reports even before anyone has connected.

**The page is real, and that was checked rather than assumed.** `signrequest.com`'s own `<head>`
embeds a Content-Security-Policy allowlisting `https://62vqqh6qv58h.statuspage.io` as a script
source — the exact page id below, the way a vendor's own site typically embeds its status widget.
Verified live 2026-09-05:

```
GET signrequest.statuspage.io/api/v2/summary.json -> 200 application/json
  page: { "id": "62vqqh6qv58h", "name": "SignRequest", "url": "https://signrequest.statuspage.io" }
  components (13): API, Web app, Workers, AWS cloudFront, AWS ec2-eu-west-1, …
```

A component literally named **API** exists. `Web app`/`Workers` (the browser UI and background
processing) are read but capped at `degraded`, never allowed to report a full outage on their own;
the AWS infrastructure components are ignored. `signrequest.statuspage.io` is widened for this hook
only — it is not on the app's own `network.allow`.

### `quota` — declared unavailable

SignRequest's API responses carry no rate-limit / quota headers on either a successful or a failed
call (`GET /documents/`, verified live 2026-09-05), and the OpenAPI contract documents none.
Declared `unavailable` with `severity: "informational"`, so the app does not sit at `unknown`
forever for a signal SignRequest never sends.

### `auth:api-key` — credential liveness

Derived by the runtime from the Auth method's `test` hook. No declaration needed.

## Development

```sh
cd apps/signrequest
deno task test
deno task check
deno task lint
deno task fmt
deno task validate
```

## Icon

`assets/icon.svg` wraps SignRequest's own mark, embedded as base64 PNG — the mark itself was
downloaded verbatim from `https://signrequest.com/images/favicons/apple-touch-icon-152x152-precomposed.png`
(linked from `signrequest.com`'s own `<head>` as `<link rel="apple-touch-icon" …>`), 152×152, no
color or shape added or removed. SignRequest publishes no standalone SVG mark reachable from its own
site (`favicon.svg` 404s; the `<link rel="mask-icon">` target also 404s), so the PNG is embedded in
an SVG wrapper — the same pattern this pack uses for every other vendor without a native SVG.

## Links

Every URL below was verified live on 2026-09-05.

- Vendor: <https://signrequest.com/>
- API reference (Redoc-rendered): <https://signrequest.com/api/v1/docs/>
- OpenAPI specification (the machine-readable contract this app was built against):
  <https://signrequest.com/api/v1/schema/swagger.json>
- Status page: <https://signrequest.statuspage.io/>
