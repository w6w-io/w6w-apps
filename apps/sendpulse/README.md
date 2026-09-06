# SendPulse

Manage SendPulse **CRM** deals and contacts, and send **Bulk Email** campaigns, against
SendPulse's own published OpenAPI 3 documents.

- **Categories** — marketing, crm
- **Auth methods** — client-credentials
- **Actions** — 18
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:client-credentials`
- **Egress allowlist** — `api.sendpulse.com` (the `service` check adds `status.sendpulse.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://sendpulse.com/
- **API docs** — `https://api.sendpulse.com/.well-known/openapi/{crm,bulk-email,chatbots,a360}.yaml`
- **Status page** — https://status.sendpulse.com/

> **Everything below was verified against SendPulse's own OpenAPI documents and live probes against
> `api.sendpulse.com` / `status.sendpulse.com` on 2026-09-06.** Nothing here came from a third-party
> integration directory.

## One account, four API modules, two base paths

SendPulse publishes **four** separate OpenAPI documents under one account and one OAuth2
client-credentials token: `crm.yaml` (669 KB), `bulk-email.yaml` (128 KB), `chatbots.yaml` and
`a360.yaml` (Automation 360; both ~15 KB and thin). This app covers the two modules with the widest,
most generally useful action surface — **CRM** and **Bulk Email** — and leaves Chatbots and
Automation 360 out (see "Deliberately not covered").

The two covered modules do **not** share a base path, despite living on the same host:

| Module     | `servers.url`                       |
| ---------- | ------------------------------------ |
| Bulk Email | `https://api.sendpulse.com`          |
| CRM        | `https://api.sendpulse.com/crm/v1`   |

`lib/client.ts`'s `SendPulseClient` exposes this as two methods, `.crm(path)` and
`.bulkEmail(path)`, precisely so an action can't silently target the wrong one — a request built
against the wrong base 404s outright (there is no such path at the other base), which reads as
"wrong id" rather than "wrong URL" if you don't already know the two modules disagree here.

## The three things most likely to cost you a day

### 1. `POST /contacts/create` is a much narrower replacement than the endpoint it deprecates

CRM's `crm.yaml` marks `POST /contacts` `deprecated: true`, pointing at `POST /contacts/create` as
the replacement — this app uses the replacement, per the task's own instruction. But the
replacement is **not** a drop-in: the deprecated endpoint accepted `phones`, `emails`, `tags` and
`attributes` directly in the create body and required nothing; `/contacts/create` accepts only
`responsibleId` (**required**), `firstName`, `lastName` and `externalContactId`. A phone or email
has to be added afterward through its own endpoint (`POST /contacts/{id}/phones`,
`POST /contacts/{id}/emails`) — this app exposes `contact-email-add` for the latter. Build a contact
with an email in one call against the new endpoint and you'll get a 422 or a silently ignored field,
depending on what you send it.

### 2. Three different error envelope shapes, and they don't line up with "which module"

Confirmed live and from the OpenAPI examples:

- the API gateway itself (missing/invalid token, **on both modules**):
  `{"message":"Unauthorized!","error_code":401}`;
- Bulk Email's own validation errors — the *same* flat `{message, error_code}` shape
  (`{"message":"Argument bookName missing","error_code":422}`);
- CRM's own not-found responses — nested one level deeper:
  `{"data":{"code":213,"message":"Book not found"}}`.
- the OAuth token endpoint, separately again:
  `{"error":"invalid_client","error_description":"Client authentication failed","message":"..."}`.

`lib/client.ts`'s `errorMessage()` reads all of these without needing to know which one produced a
given response, so nothing in this app has to special-case it endpoint by endpoint.

### 3. Pagination shape differs between two list endpoints on the *same* API

`deals-list` (`POST /crm/v1/deals/get-list`) returns `{ data: Deal[], meta: { total } }` — the array
directly under `data`, count under `meta.total`, default `limit` **10**. `contacts-list`
(`POST /crm/v1/contacts/get-list`) returns `{ data: { list: Contact[], total } }` — the array nests
one level deeper under `data.list`, count under `data.total` (no `meta`), default `limit` **100**.
Both are CRM POST-shaped "list" endpoints, both accept a JSON filter body rather than query
parameters, and they still disagree with each other. Reading `data.total` on a deals response, or
iterating `data` as an array on a contacts response, gets `undefined`/a type error rather than an
obvious failure.

## Auth

One method: `client-credentials`, `type: "custom"` (SendPulse's client-credentials grant has no
browser redirect step, so it isn't the `oauth2` type's authorization-code flow).

`POST https://api.sendpulse.com/oauth/access_token` — the token endpoint named as every one of
SendPulse's four OpenAPI documents' `clientCredentials.tokenUrl`, confirmed identical across all
four (one token authenticates the whole account, not one per module). SendPulse's own text
describes the mint as "temporary tokens (valid for 1 hour)"; there is no refresh token in the
response, so `refresh` just re-runs the exchange, same pattern as the sibling `paypal`/`mautic`
apps' `client-credentials` auth.

The credential probe is `GET /balance` (Bulk Email), chosen by reading its response body —
`{"currency":"USD","balance_currency":0.02}`, no credential material — and because it needs no
module-specific scope: a CRM-only or Email-only plan is never reported unhealthy for lacking the
other module's permission. `GET /crm/v1/users` was considered and rejected for exactly that reason.

## Actions

18 actions across the two modules. `resource` groups them in the editor.

| Key                       | Type    | Module     | Endpoint                                  |
| ------------------------- | ------- | ---------- | ------------------------------------------ |
| `users-list`               | search  | CRM        | `GET /crm/v1/users`                       |
| `pipelines-list`            | search  | CRM        | `GET /crm/v1/pipelines`                   |
| `pipeline-steps-list`       | search  | CRM        | `GET /crm/v1/pipelines/{id}/steps`        |
| `deals-list`                | search  | CRM        | `POST /crm/v1/deals/get-list`             |
| `deal-create`               | perform | CRM        | `POST /crm/v1/deals`                      |
| `deal-get`                  | read    | CRM        | `GET /crm/v1/deals/{id}`                  |
| `contacts-list`             | search  | CRM        | `POST /crm/v1/contacts/get-list`          |
| `contact-create`            | perform | CRM        | `POST /crm/v1/contacts/create`            |
| `contact-get`               | read    | CRM        | `GET /crm/v1/contacts/{id}`               |
| `contact-email-add`         | perform | CRM        | `POST /crm/v1/contacts/{id}/emails`       |
| `contact-tags-list`         | search  | CRM        | `GET /crm/v1/contact-tags`                |
| `mailing-list-create`       | perform | Bulk Email | `POST /addressbooks`                      |
| `mailing-lists-list`        | search  | Bulk Email | `GET /addressbooks`                       |
| `mailing-list-emails-add`   | perform | Bulk Email | `POST /addressbooks/{id}/emails`          |
| `campaign-create`           | perform | Bulk Email | `POST /campaigns`                         |
| `campaigns-list`            | search  | Bulk Email | `GET /campaigns`                          |
| `senders-list`              | search  | Bulk Email | `GET /senders`                            |
| `balance-get`               | read    | Bulk Email | `GET /balance`                            |

### Notes on individual actions

- **`deal-create`** wraps a single `contactId` in the one-element array SendPulse's `contact` field
  expects; `currency` accepts only `UAH`, `USD` or `EUR` per the vendor's own schema.
- **`contact-email-add`** exists specifically because `contact-create` can't set an email itself —
  see finding 1.
- **`mailing-list-emails-add`** adds one address per call (single opt-in only — see "Deliberately
  not covered"), and is marked `idempotent: true`: re-adding an existing address to a list upserts
  rather than duplicating.
- **`campaign-create`** base64-encodes the HTML `body` for you (`lib/client.ts`'s `toBase64`, which
  is UTF-8-safe — a bare `btoa` throws on anything outside Latin-1, which a real HTML email is
  likely to contain). One of `body` or `templateId` is required, checked before the request goes
  out; `list_id`/`segment_id` are mutually exclusive in the vendor's schema and this action only
  exposes the `list_id` form, since this app has no segment actions to produce a `segment_id`.
  There is no idempotency key on this endpoint — a retried call sends the campaign again to every
  recipient, so it is `idempotent: false`.
- **`deals-list`/`deal-create`** are not idempotent — SendPulse documents no idempotency key for
  either endpoint.

## Health checks

Two declared checks plus the derived `auth:client-credentials`.

### `service` — a real Instatus-hosted status page, scoped to the modules this app covers

`status.sendpulse.com/api/v2/summary.json` answers genuine minimal JSON
(`{"page":{"name":"SendPulse","status":"UP"}}`), and `/api/v2/components.json` lists real
SendPulse components: `REST API`, `Authorisation Service`, `Email Service`, `Transactional Emails`,
`CRM`, plus others (`Web Push`, `Chatbots`, `Landing Pages`, `Courses`) this app has no actions
against. The check reads `history.atom` (a genuine Atom feed) rather than the summary JSON, since
only the feed carries incident detail, and scopes to entries whose "Affected Components" line names
one of the components this app actually touches.

**The ordering trap**: every other Atom-backed check in this pack reads a Statuspage feed, which
writes updates *newest first* within one `<entry>` — so "first status word wins". SendPulse's
Instatus feed writes them **oldest first** (confirmed live: an entry's `<published>` timestamp
matched its *first* update, not its last), so this check reads the **last** status word instead.
Reusing the Statuspage rule here would report every resolved incident as still open.

### `quota` — signed, reading `GET /user/balance/detail`

Two dimensions: a subscription plan's subscriber-count ceiling (`degraded` ≥90%, `down` at 100%; a
zero/missing ceiling — a pay-as-you-go account has none — is reported as unmetered, not exhausted),
and the pay-as-you-go email-send balance (a bare reading with no ceiling to compute a percentage
against, `down` only at exactly zero, where sending genuinely stops).

## Deliberately not covered

- **Chatbots and Automation 360 modules** — thin OpenAPI documents (~15 KB each, mostly schemas)
  compared to CRM's 669 KB and Bulk Email's 128 KB; left out to ship a solid subset rather than a
  shallow pass over everything. Worth a follow-up app or an extension of this one.
- **Double opt-in email adds** (`AddEmailsDoubleOptIn` — sends a confirmation email instead of
  subscribing outright) — needs a `confirmation` template configured in the SendPulse dashboard
  first, a setup story this app doesn't yet model. `mailing-list-emails-add` covers single opt-in
  only.
- **Batch contact/email adds** — SendPulse's schemas accept arrays for both `contacts/create`-style
  creates-adjacent-endpoints and `addressbooks/{id}/emails`; this app adds one record per call,
  matching a workflow step's actual shape (one record in, one record out).
- **Campaign send via `segment_id`** — `campaign-create` only exposes the `list_id` targeting form;
  this app has no segment actions to produce a `segment_id` in the first place.
- **CRM's Companies, Products, Tasks, Boards, Payments, Telephony, Custom Tab and Manager Settings
  resources** — `crm.yaml` documents roughly 90 operations in total; this app covers the
  pipeline/deal/contact core a general-purpose automation needs, not the whole surface.
- **Bulk Email's Templates, Webhooks and Blacklist resources** — templates would need
  `template-list`/`template-get` actions to make `campaign-create`'s `templateId` field
  self-service; left out for the same "solid subset" reason as the modules above.
- **The `?token=` query-string auth form some SendPulse docs mention informally** — this app only
  ever uses the `Authorization: Bearer` header.

## Layout

```
sendpulse/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/client.ts                 # SendPulseClient (.crm/.bulkEmail), error parsing, toBase64
├── auth/client-credentials.ts    # OAuth2 client-credentials: exchange, refresh, sign, test
├── actions/                      # one file per action (18)
├── health/
│   ├── service.ts                # status.sendpulse.com, scoped + oldest-first aware
│   └── quota.ts                  # /user/balance/detail, signed
├── assets/icon.svg                # vendor mark, verbatim
└── tests/                        # 88 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
