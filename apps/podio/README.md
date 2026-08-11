# Podio

Read and write Podio items, apps, workspaces, tasks, comments and webhooks over the Podio API
(`api.podio.com`).

Podio's object model is four levels deep and the third level is the interesting one:

```
organization ──► workspace ──► app ──► item
   (org)          (space)   record type  record
```

An **app** is a *user-defined record type* — "Leads", "Invoices", "Bug Reports" — built by whoever
set up the workspace, with fields they chose at the time. An **item** is one record of that type.
Nothing in this package knows what those fields are, and the [section below](#the-cost-the-schema-is-not-ours-to-know)
says exactly what that costs you.

> Podio's API says **space** where the Podio UI says **workspace**. This package's paths use
> Podio's word and its labels use both.

---

## Verification

Every path, verb, query parameter, body field and enum here was checked on **2026-08-11** against
three primary sources, in this order of authority where they disagree:

1. **Live probes** of `api.podio.com` and `status.podio.com`.
2. **Podio's own PHP client** — `github.com/podio/podio-php`, `lib/PodioClient.php`,
   `VERSION = '7.0.0'`. Executable, and therefore right about the wire where the prose is not.
3. **The reference** at `developers.podio.com/doc` — a 19,167-byte index linking one page per
   resource area, followed to each operation used here.

Nothing came from a third-party integration directory. Where a detail could not be confirmed, the
action is [left out](#what-is-deliberately-absent) and said so.

---

## Four findings worth an afternoon each

### 1. Two token endpoints, exact mirror images, each rejecting the other's encoding

Podio publishes `/oauth/token/v2` (documented) and `/oauth/token` (used by its own client). All
four combinations, measured live with the same bogus body:

| Endpoint | Body | Status | `error` | `error_description` |
|---|---|---|---|---|
| `/oauth/token/v2` | `application/json` | 400 | `invalid_client` | "you've supplied an invalid client id" |
| `/oauth/token/v2` | form-encoded | 400 | `invalid_value` | "Invalid value null (null): must be object" |
| `/oauth/token` | form-encoded | 400 | `invalid_client` | "you've supplied an invalid client id" |
| `/oauth/token` | `application/json` | 400 | `invalid_client` | "Missing parameter client_id" |

Rows 1 and 3 parsed the body and got as far as validating the client id. Rows 2 and 4 never parsed
it — **and neither says so.** "must be object" and "Missing parameter client_id" both read like
*your credentials are wrong*.

The written documentation shows only `/oauth/token/v2` with a JSON body. RFC 6749 §4.1.3 specifies
form encoding for a token request, so a standards-compliant OAuth2 client — including the w6w
host's generic exchange — sends a form and lands squarely on row 2. **This package uses
`/oauth/token`.**

### 2. The scheme is `OAuth2`, not `Bearer`, and everything around it says otherwise

Podio's authentication page: `Authorization: OAuth2 ACCESS_TOKEN`. Its own PHP client:
`withHeader('Authorization', "OAuth2 {$token}")`.

Yet the token response's own `token_type` is `"bearer"`, and a 401 from `api.podio.com` comes back
with `WWW-Authenticate: Bearer realm="podio"`. Both schemes are in fact accepted today (`OAuth2
bogus` and `Bearer bogus` produced byte-identical 401 bodies), but only one has a compatibility
promise behind it.

### 3. `GET /app/{app_id}` returns a live write credential

Podio documents the response field, in its own words:

> `"token"`: The app token to use when logging in as an app

That is the `app_token` half of the App Authentication grant. Paired with a client id and secret —
which any Podio user can mint for free at `podio.com/settings/api` — it mints access tokens for
that app indefinitely, and regenerating it is the only revocation. A workflow step's result is
persisted in the run record and routinely echoed into logs and previews, so returning it would turn
one `read` into a durable, unrevoked write credential.

It is **deleted before any action returns**, along with the `push` channel signature Podio attaches
to every item, task and file (`{channel, signature, timestamp}` — a signed subscription grant for
that object's event stream). See `lib/client.ts#REDACTED_FIELDS`. The strip is deliberately narrow
— two exactly-named top-level keys — because a Podio app can legitimately have a *field* named
`token`, and that is customer data.

The same reasoning rules out the obvious credential probe. `GET /user/status` returns
`calendar_code`, "The code to use when getting iCal feeds" — a bearer secret embedded in a URL —
and is unreachable under App Authentication besides.

### 4. A 401 does not tell you what went wrong

Podio answers **401 for both** "no credential arrived" and "credential rejected". Measured on
`GET /user/status`:

| Request | Status | `error` | `error_description` |
|---|---|---|---|
| no `Authorization` header | 401 | `unauthorized` | `invalid_request` |
| `Authorization: OAuth2 bogus` | 401 | `unauthorized` | `expired_token` |
| `Authorization: OAuth2 ` (empty) | 400 | `Invalid authorization header` | — |

The status decides nothing; `error_description` decides everything. And **`expired_token` does not
mean expired** — a token that was never valid and a token that was revoked both report it. Podio's
own PHP client keys its automatic refresh-and-retry off exactly that string, which is how a client
that trusts it refreshes, retries, gets `expired_token` again, and loops.

This package classifies from the body (`lib/client.ts#classifyAuthFailure`) and never reports
`expired_token` as "just needs a refresh".

**A fifth, smaller one:** Podio throttles with **HTTP 420**, not 429 (from its client's status
switch: `case 420: throw new PodioRateLimitError`), and publishes headroom as
`X-Rate-Limit-Limit` / `X-Rate-Limit-Remaining` — note the hyphen after `Rate`, which is not the
`X-RateLimit-*` spelling nearly every other vendor uses. Neither fact appears anywhere in
`developers.podio.com`; both come from the client source.

---

## The cost: the schema is not ours to know

A Podio app's fields are defined at runtime, in the Podio UI, by whoever built the app. This
package therefore **cannot** render them as form controls, and **does not** flatten their values.
Concretely:

**On write**, `fields` is a `json` parameter carrying Podio's own documented structure — an object
keyed by each field's `external_id` or numeric `field_id`. Podio accepts four equivalent value
forms per field, and all four pass through untouched:

```jsonc
{
  "title":   "Acme Ltd",                                  // scalar
  "amount":  { "value": "500.00", "currency": "USD" },    // object of sub_ids
  "related": [12345, 67890],                              // array of scalars
  "status":  [{ "value": 11 }, { "value": 12 }]           // array of sub_id objects
}
```

**On read**, an item's `fields` comes back as Podio shapes it — an array of field descriptors,
each with a `values` list of `{sub_id: value}` objects.

**What that costs you.** You have to type JSON instead of filling in a form, and you have to know
each field's sub_ids. That is a real cost, and it is paid deliberately: flattening each field to
one scalar — which most Podio integrations do — silently drops an end date, a currency, a phone
type, a text format, a latitude. The workflow author finds out downstream, when the value is
missing and nothing said so.

**What makes it workable.** `app-fields-list` (Get App Fields) turns `GET /app/{app_id}` into
exactly the answer: every field's id, external id, type, label, requiredness, type-specific
`settings`, and the sub_id vocabulary its values use. Run it once against the app and you have the
keys.

Two mismatches it resolves for you, both of which cost people time:

- **A `category` value is the option _id_, not the option text.** `app-fields-list` returns the
  option list with ids. This is the single most common silent write failure against Podio.
- **The field-type names and the value-shape names are two vocabularies on two different doc
  pages.** A field of type `contact` takes values documented under `member`; type `image` under
  `video`; type `tel` under `phone`. `lib/fields.ts#VALUE_SHAPES` keys by what
  `GET /app/{app_id}` actually returns and names the other spelling.

Three of the eighteen field types have **no** documented value shape — `calculation` (computed by
Podio, not writable), `separator` (holds no value) and `media`. Those report
"not documented by Podio" rather than a guess.

---

## Authentication

Two methods. Pick by whether the workflow should act as *an app* or as *a person*.

### `app-auth` — App Authentication (primary)

`grant_type: "app"`. No browser, so it keeps working in scheduled and background runs. Every value
is minted by the user in Podio, with nothing to register on the w6w host.

| Field | Where to get it |
|---|---|
| Client ID / Client Secret | `podio.com/settings/api` — any Podio user can create an API key |
| App ID / App Token | The app in Podio → app menu → **Developer** |

Its limit is the point of it: the token "can only access that specific app", and content it creates
"will appear as having been created by the app itself rather than a specific user".

### `oauth2` — server-side flow

Browser sign-in via `podio.com/oauth/authorize`. Acts as the authorising person, across every org,
workspace and app they can reach. Needs a Podio API key registered against this w6w installation's
redirect domain.

- **`pkce: false`.** Podio's own OAuth page: "Currently supported is draft-10" — that is
  `draft-ietf-oauth-v2-10` (2010). PKCE is RFC 7636 (2015). There is no `code_challenge` support to
  negotiate.
- **No scope requested.** Podio documents an omitted scope as equivalent to `global:all`, and the
  user picks the specific orgs, workspaces and apps on Podio's consent screen regardless. Narrowing
  it here would break whole action groups to protect nothing the consent screen does not already
  gate. What was actually granted is readable afterwards from the `scope-get` action.

### The password grant is deliberately not offered

Podio documents a username-and-password flow. It is a resource-owner-password grant — the pattern
OAuth 2.1 removes — and offering it would mean storing a person's actual Podio password in a
Connection, where an app token that can be regenerated already exists. Podio itself says App
Authentication is "the preferred way of authentication over Username and Password flow".

### App Authentication reaches only part of this surface, and Podio says which

Podio's reference badges each operation that works under an app token with **"Can be used with App
Authentication"**. Transcribed, not inferred:

| | Actions |
|---|---|
| **Badged** | `item-get` · `item-values-get` · `item-get-by-external-id` · `item-count` · `item-create` · `item-update` · `item-delete` · `app-get` · `app-fields-list` · `comment-list` · `comment-add` · `task-create` (with a reference) · `task-complete` · `search-app` · `hook-list` · `hook-create` · `hook-verify-request` · `file-get` · `file-attach` · `scope-get` |
| **Not badged** | `org-list` · `space-list` · `space-get` · `app-list` · `item-filter` · `search-space` · `task-list` · `task-get` · `task-create` (without a reference) · `hook-delete` |

The oddities are Podio's, not transcription errors — creating and listing hooks is badged while
deleting one is not, and `item-filter` is not badged while `search-app` is. The unbadged actions
need an OAuth connection.

---

## Actions (29)

### Organizations and workspaces

| Action | Endpoint | Notes |
|---|---|---|
| `org-list` | `GET /org/` | Orgs **you are a member of**, each with its spaces inline — usually removes the need for `space-list` |
| `space-list` | `GET /org/{org_id}/space/` | *All* of an org's spaces, not only your memberships |
| `space-get` | `GET /space/{space_id}` | Adds `privacy`, `auto_join` and `rights` |

### Apps — the user-defined record types

| Action | Endpoint | Notes |
|---|---|---|
| `app-list` | `GET /app/space/{space_id}/` | Ids and short config; no field schema |
| `app-get` | `GET /app/{app_id}` | Full definition. **The app token is stripped** |
| `app-fields-list` | `GET /app/{app_id}` | The writable field schema + sub_id vocabulary + category option ids |

### Items

| Action | Endpoint | Notes |
|---|---|---|
| `item-get` | `GET /item/{item_id}` | `mark_as_viewed` **defaults to true** on Podio's side — a read clears someone's unread notifications unless you turn it off |
| `item-values-get` | `GET /item/{item_id}/value` | Values only, no envelope, no comments |
| `item-get-by-external-id` | `GET /item/app/{app_id}/external_id/{external_id}` | The upsert primitive; 404s on a miss |
| `item-count` | `GET /item/app/{app_id}/count` | Filters are **query-string style** here, unlike `item-filter` |
| `item-filter` | `POST /item/app/{app_id}/filter/` | The list call. **Cannot filter text fields** — see below |
| `item-create` | `POST /item/app/{app_id}/` | Not idempotent — no idempotency key exists |
| `item-update` | `PUT /item/{item_id}` | Partial; `[]` clears a field; pass `revision` for a 409 instead of an overwrite |
| `item-delete` | `DELETE /item/{item_id}` | **Permanent** — Podio publishes no restore endpoint |

> **Text fields cannot be filtered.** Podio's Views area, verbatim: "Beware that not all field
> types can be used for filtering. Most notably text fields cannot be used for filtering. You can
> use the Search interface when working with text filtering." A text filter is *not rejected* — it
> simply does not constrain, so the workflow gets every item and believes it matched. Use
> `search-app`.

> **`item-filter` never sends Podio's `remember` flag.** It would overwrite the connected user's
> "last used view" in the Podio UI; a workflow's filter is not a human's browsing state.

### Search — the only text-capable read

| Action | Endpoint | Notes |
|---|---|---|
| `search-app` | `POST /search/app/{app_id}/` | Items and tasks in one app. **Max 20 results per call**, a hard ceiling |
| `search-space` | `POST /search/space/{space_id}/` | A whole workspace. **Non-private tasks only**, and the omission is not reported |

Results are hits (`{type, id, rank, title, link, …}`), not field values. Feed `id` into `item-get`.

### Comments

| Action | Endpoint | Notes |
|---|---|---|
| `comment-list` | `GET /comment/{type}/{id}/` | **Ascending** — the newest comment is the *last* element |
| `comment-add` | `POST /comment/{type}/{id}/` | `alert_invite` (off by default) lets an @-mention grant workspace access |

### Tasks

| Action | Endpoint | Notes |
|---|---|---|
| `task-list` | `GET /task/` | `completed` is **tri-state** — unset returns both. Set `view: full` for descriptions, files and labels, which the default projection omits without saying so |
| `task-get` | `GET /task/{task_id}` | |
| `task-create` | `POST /task/` or `POST /task/{ref_type}/{ref_id}/` | `responsible` accepts five shapes; the `mail` identifier type assigns by email address with no user-id lookup |
| `task-complete` | `POST /task/{task_id}/complete` | Returns `recurring_task_id` — completing a **recurring** task creates the next one, so a completion loop never terminates unless you read it |

### Webhooks

| Action | Endpoint | Notes |
|---|---|---|
| `hook-list` | `GET /hook/{ref_type}/{ref_id}/` | Watch `status`: `inactive` means unverified and delivering nothing |
| `hook-create` | `POST /hook/{ref_type}/{ref_id}/` | Succeeds, and the hook still does nothing — see below |
| `hook-verify-request` | `POST /hook/{hook_id}/verify/request` | Makes Podio call *your* URL with the code |
| `hook-delete` | `DELETE /hook/{hook_id}` | |

**A new hook is inactive.** Activation is a three-step handshake: create → `hook-verify-request`
(Podio POSTs `type=hook.verify` and a `code` to the hook's own URL) → your endpoint POSTs that code
to `/hook/{hook_id}/verify/validate`. Only the first two are actions here; the third needs a value
that arrives at *your* endpoint and that nothing in a workflow can see.

### Files and grant

| Action | Endpoint | Notes |
|---|---|---|
| `file-get` | `GET /file/{file_id}` | Metadata and links, not bytes; the links are authenticated |
| `file-attach` | `POST /file/{file_id}/attach` | For file ids that already exist — this package does not upload |
| `scope-get` | `GET /oauth/scope` | What this connection may reach and with what permissions |

### Write switches

Every mutating action exposes Podio's two documented switches, under **Additional parameters**,
with no default (omitting them and sending Podio's own default are the same request):

- **`hook`** (Podio default `true`) — fire the app's webhooks. Set `false` when this write would
  trigger the very webhook that started this workflow.
- **`silent`** (Podio default `false`) — keep the change out of the activity stream and suppress
  notifications. Worth setting for bulk writes.

---

## Health checks

| Check | Kind | Posture | What it answers |
|---|---|---|---|
| `service` | `service` | unsigned, `network.allow: ["status.podio.com"]` | Podio's own Statuspage roll-up + five components |
| `api` | `dependency` | unsigned, no extra egress | Is `api.podio.com` answering, in Podio's own error shape? |
| `quota` | `quota` | signed, app's own host | `X-Rate-Limit-Limit` / `X-Rate-Limit-Remaining` off a scope read |
| `auth:app-auth`, `auth:oauth2` | derived | signed | Is this credential live? (`GET /oauth/scope`) |

**The status page is real**, checked four ways: a bogus sibling path 404s with 0 bytes where
`summary.json` returns 1,861 bytes of JSON; there is no redirect; it self-identifies as
`"name": "Podio Status Page"`; and — the part usually missing — it carries a component literally
named **`API`** (`xclqkr4s5kyn`) alongside `Web`, `Email` and the two Advanced Workflow Automation
components. The page-level `status.indicator` is the verdict and the components are the detail, so
the failover queue cannot report Podio as down.

**The `api` check treats a 401 as a PASS.** It is unsigned by design, so it *expects* to be
refused; being refused correctly proves DNS, TLS, HTTP and that the responder is Podio's own error
handler. It requires the status to be 401 **and** the body to parse **and** carry an `error`
string **and** echo the requested path in `request.url` — that last condition is what a captive
portal or proxy cannot fake. An unauthenticated **200** is a *failure*, because this endpoint
requires a credential.

**The `quota` check reports `unknown`, never `ok`, when the headers are absent.** Their names come
from Podio's PHP client, not from a measurement — this build had no Podio credential to make an
authenticated response with. A quota check that reads "fine" because it found nothing is worse than
one that admits it found nothing.

**No declared absence.** Podio publishes enough for all three checks to be live probes. If a future
one becomes an absence it must carry `severity: "informational"`, or the permanent `unknown` it
reports pins the app's verdict there forever; `tests/index.test.ts` enforces that over whatever the
set contains.

---

## What is deliberately absent

- **File upload.** `POST /file/v2/` is `multipart/form-data` carrying file bytes. An Action's input
  is a JSON document and its result is persisted in the run record; there is no honest way to move
  an arbitrary binary through one. `file-attach` handles ids that already exist.
- **Validate webhook verification** (`POST /hook/{hook_id}/verify/validate`). It needs a code Podio
  delivers to the hook's own endpoint, which nothing in a workflow can see. An action for it would
  be a form field nobody can fill in.
- **The `/v2`-suffixed item and search variants** (`/item/{id}/value/v2`, `/search/…/v2`). They
  exist but carry no App Authentication badge where their v1 siblings do, and the reference does
  not document what differs. Shipping an endpoint whose contract cannot be read would be a guess.
- **Everything else the reference lists** — the Flows, Importer, Integrations, Grants, Widgets,
  Layout, Recurrence, Contacts, Stream, Notifications and Views areas among them. Each is a genuine
  surface; none was verified for this build, and an unverified action is worse than a missing one.

---

## Layout

```
podio/
├── package.json          # w6w identity — network.allow is exactly ["api.podio.com"]
├── index.ts              # { actions, auth, healthChecks }
├── lib/
│   ├── client.ts         # base URL, error envelope, auth-failure classification, redaction
│   ├── fields.ts         # the field-type / sub_id model and its one honest projection
│   └── params.ts         # shared params: the hierarchy ids, write switches, `fields`
├── actions/              # 29 files, one per action
├── auth/                 # app-auth.ts (primary) · oauth2.ts
├── health/               # service.ts · api.ts · quota.ts
├── assets/icon.svg       # podio.com/favicon.svg, 566 bytes, verbatim
└── tests/                # 273 assertions: entry module, every action, auth, health, lib
```

`status.podio.com` is **not** in `w6w.network.allow` — it belongs to the `service` check's own
allowlist. `podio.com` is not there either; an OAuth endpoint's host is allowlisted implicitly.
Neither is `127.0.0.1`, which has no place in a shipped manifest.

## Development

```bash
deno task validate   # manifest + spec conformance (the pack auditor)
deno task check      # typecheck
deno task lint
deno task fmt
deno task test
```
