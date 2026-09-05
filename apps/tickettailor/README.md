# Ticket Tailor

Manage event series and occurrences, ticket types, orders, holds, check-ins, discounts, vouchers,
and issued tickets, on the **Ticket Tailor API v1**.

- **Categories** — commerce
- **Auth methods** — api-key (HTTP Basic)
- **Actions** — 41
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.tickettailor.com`, `status.tickettailor.com`
- **Website** — https://www.tickettailor.com/
- **API docs** — https://developers.tickettailor.com/
- **OpenAPI** — `https://app.tickettailor-stitching.com/openapi.yml` (the source the public
  reference site compiles its pages from — see below)
- **Status page** — https://status.tickettailor.com/

> **Everything below was verified against Ticket Tailor's own sources on 2026-09-05.** The public
> reference site (`developers.tickettailor.com`) is a Docusaurus SPA whose per-operation pages render
> client-side from a live OpenAPI 3.1.1 document; that document was fetched directly
> (`https://app.tickettailor-stitching.com/openapi.yml`, 311,543 bytes) and used as the source of
> truth for every path, verb, field and error shape, cross-checked with live probes against
> `api.tickettailor.com` and `status.tickettailor.com`. Nothing here came from a third-party
> integration directory.

## The three things most likely to cost you an afternoon

### 1. The public docs show two different auth recipes on one page

The reference page's **"Header"** tab says: "ensure it is Base64 encoded in the format:
`Authorization: Basic Base64Encode(api_key)`" — the key alone, no colon. Its own **"Username"** tab,
one click away, shows `curl -u 'API_KEY:'` — the RFC 7617 form, `base64(username ":" password)`, with
the key as username and an empty password. Those are different bytes on the wire, and the page never
says the first is a simplification of the second.

The OpenAPI document breaks the tie: `components.securitySchemes.BasicAuth` declares
`type: http, scheme: basic`, which by definition (RFC 7617) is `base64(username ":" password)`. This
app sends `base64(apiKey + ":")` — matching the "Username" tab and the OAS scheme, not the "Header"
tab's prose (`lib/client.ts`, `basicAuthHeader`).

A live probe with a syntactically bogus key sent both ways came back byte-identical
(`403 FORBIDDEN`, see #3), so this could not be settled by probing alone — the security scheme's
declared type is what decided it.

### 2. Every write is a form post, never JSON; updates are POST, never PATCH; deletes answer 200, never 204

Every `requestBody` in the OpenAPI document is `content: application/x-www-form-urlencoded` — there
is no JSON request body anywhere in this API. This app's `lib/client.ts` always sends
`Content-Type: application/x-www-form-urlencoded` on a write.

There is also no `PATCH` or `PUT` anywhere: "updating" a resource is a plain `POST` to the resource's
own URL (`POST /v1/discounts/{id}`, not `PATCH`). And every documented `DELETE` succeeds with `200`
and a small JSON body (`{id, object, deleted}`), never a bare `204 No Content` — code that checks
`res.status === 204` to detect a successful delete will never see it fire.

One more form-encoding wrinkle: several "update" endpoints (`updateDiscountById`, `updateHold`,
`updateVoucherById`) take an **association map** rather than a plain array —
`ticket_types: {"tt_123": "1", "tt_456": "0"}` to add/remove/no-op an association. This app sends
those bracket-keyed (`ticket_types[tt_123]=1`) and plain arrays repeated with `[]`
(`discounts[]=di_1&discounts[]=di_2`) — the standard PHP/Laravel form-encoding convention, and the
only way to express what the vendor's own schema describes. **This convention was not reachable in a
live probe** — every authenticated write needs a real API key this app was not given one to test
with — so it is stated here rather than silently assumed; see the docstring on `toFormBody` in
[`lib/client.ts`](lib/client.ts).

### 3. `/v1/ping` needs no credential, and every auth failure looks the same

`GET /v1/ping` is the obvious guess for a health/credential probe. Live probes on 2026-09-05 rule it
out on one fact: it answers `200 {"version":"1.0"}` with **no** `Authorization` header at all, and
again with a syntactically-plausible but fake one. The OpenAPI document confirms this by omission —
every other operation declares `security: [{BasicAuth: []}]`; `ping`'s operation object has none.
(It also answers `{"version":"1.0"}`, not the `{"version":"pong"}` its own OpenAPI `example` shows.)

Worse for building a `test` hook: **every** kind of auth failure — no `Authorization` header, a
malformed one, a well-formed but wrong/deleted key, and a valid key correctly scoped away from a
resource — collapses to the exact same response, confirmed byte-identical live against both
`GET /v1/overview` and `GET /v1/orders`:

```json
{
  "status": 403,
  "error_code": "FORBIDDEN",
  "message": "You do not have permission to perform the request.",
  "hint": "Check if API key is not deleted, is in correct format, is included in the request headers as base64 encoded string, the object you are trying to access is not restricted by api key permissions, and you can see the object in the Ticket Tailor dashboard."
}
```

There is no `401` anywhere in this API. `auth/api-key.ts`'s `test` hook therefore reports the
vendor's own `hint` string verbatim rather than inventing a "wrong key" vs. "under-scoped key"
distinction the API itself does not make.

## Auth

**API Key** (`auth/api-key.ts`, `type: "basic"`) — one field, `apiKey`, from
**Box Office Settings > API** in the Ticket Tailor dashboard. Sent as HTTP Basic with the key as
username and an empty password (see #1 above).

The credential-liveness probe is `GET /v1/overview` — chosen because it (a) is declared
`security: [{BasicAuth: []}]` and confirmed live to need it, and (b) is box-office-wide aggregate
statistics, not a resource a narrowly-scoped key could be legitimately refused, and returns no
credential material. `afterConnect` reads the same endpoint once more to publish `box_office_name`
onto the Connection label.

## Actions (41)

**Event series** — list, get, create, update, delete, change status.
**Event occurrences** (within a series) — list, get, create.
**Events** (box-office-wide, flattened) — list, get.
**Ticket types** — create, update, delete. (There is no standalone list/get; ticket types are
embedded in an event series' own read.)
**Orders** — list, get, confirm offline payment received.
**Holds** — list, get, create, update, delete.
**Check-ins** — list, create (idempotent — see below).
**Discounts** — list, get, create, update, delete.
**Vouchers** — list, get, create, delete; voucher codes — list, void.
**Issued tickets** — list, get, create (direct issuance from inventory or a hold — costs one credit
per ticket, even if free), void.
**Box office** — overview (revenue/ticket/order counts), ping (no credential required).

`check-in-create` sends `ctx.invocation.invocationId` as the vendor's own `local_unique_id` field —
documented as existing specifically so "a check in without creating it multiple times" is safe to
retry — and is declared `idempotent: true` to match.

## Health checks

- **`service`** (`kind: "service"`, app-scoped) — `status.tickettailor.com`, an incident.io page
  exposing a Statuspage v2-compatible JSON API at `/api/v2/summary.json`. Verified real and specific
  to this product: a bogus sibling path 404s, the page names itself "Ticket Tailor", and one of its
  four components is literally `"API"` (alongside Check-in app, Checkout, Dashboard). No redirect.
- **`quota`** (`kind: "quota"`, connection-scoped) — reads `X-Rate-Limit-Limit` /
  `X-Rate-Limit-Remaining` / `X-Rate-Limit-Reset` off `GET /v1/overview`. Unlike some vendors in this
  pack (Apify exposes only a ceiling, never a remaining count), Ticket Tailor's OpenAPI document
  names all three headers and a live probe confirmed they are actually sent and decrement
  (`x-rate-limit-limit: 10000`, `x-rate-limit-remaining: 9995` → `9994` on the next call). Reports
  `unknown`, not a fabricated number, if a response ever omits them.
- **`auth:api-key`** — derived automatically from the Auth `test` hook.

## Development

```bash
deno task test       # unit tests (77)
deno task check      # typecheck
deno task lint       # deno lint
deno task fmt         # format — use this, never bare `deno fmt`
deno task validate   # manifest + coverage audit
```
