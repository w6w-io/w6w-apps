# Cognito Forms

Read Cognito Forms' forms and schemas, and create, read, update and delete form entries via the
Cognito Forms REST API.

- **Categories** — forms, productivity
- **Auth methods** — bearer-token
- **Actions** — 12
- **Egress allowlist** — `www.cognitoforms.com`

## Links

- **Website** — https://www.cognitoforms.com
- **API docs** — https://www.cognitoforms.com/support/476/data-integration/cognito-forms-api/rest-api-reference
  — the page itself is a client-rendered shell that loads and renders an OpenAPI document,
  `https://static.cognitoforms.com/api-reference/CognitoFormsOpenAPI.json`, on the fly. That JSON —
  not the HTML around it — is what this app was built against; every path, parameter, response shape
  and error `Type` below was read off it directly, fetched and verified live on 2026-08-30.
- **Getting Started Guide** — https://www.cognitoforms.com/support/475/data-integration/cognito-forms-api
  (API key creation, scopes, the `?access_token=` query-string fallback)
- **Status page** — https://status.cognitoforms.com

## Actions

| Resource | Action                          | Endpoint                                                       |
| -------- | -------------------------------- | --------------------------------------------------------------- |
| form     | Get Many Forms                   | `GET /forms`                                                     |
| form     | Get Form Schema                  | `GET /forms/{formId}/schema`                                     |
| form     | Set Public Link Availability     | `POST /forms/{formId}/public-link-availability`                  |
| entry    | Create Entry                     | `POST /forms/{formId}/entries`                                   |
| entry    | Get Entry                        | `GET /forms/{formId}/entries/{entryId}`                          |
| entry    | Update Entry                     | `PATCH /forms/{formId}/entries/{entryId}`                        |
| entry    | Delete Entry                     | `DELETE /forms/{formId}/entries/{entryId}`                       |
| entry    | Import Entries                   | `POST /forms/{formId}/import-entries`                            |
| entry    | Get Import Status                | `GET /forms/{formId}/import-status/{importId}`                   |
| document | Get Document                     | `GET /forms/{formId}/entries/{entryId}/documents/{templateId}`   |
| file     | Upload File                      | `POST /files`                                                    |
| file     | Get File                         | `GET /forms/{formId}/entries/{entryId}/files/{fileId}`           |

**Deliberately absent:**

- **A "list/query entries" action.** The REST API has no such operation — only *Get Entry* by a
  known `entryId`. Cognito Forms' own OData API (`CognitoFormsODataAPI`, a separate spec published
  alongside this one) is the vendor's answer for bulk querying entry data; this app does not
  implement it. In practice an entry ID here comes from a webhook payload, an import result, or
  another system that recorded it at submission time.
- **Webhooks** — that is a Trigger, not an Action, and outside this build's scope.
- **Form authoring** — there is no `POST /forms` or `PUT /forms/{formId}` in the spec at all.
  Creating, cloning, disabling or editing a form's fields stays in Cognito Forms' own designer;
  nothing was left out here, the endpoint simply doesn't exist.

### Working with entries

The normal sequence is *Get Form Schema* → build a data map keyed by the schema's own top-level
property names → *Create Entry* / *Update Entry*. Both bodies are plain JSON merged with a fixed
`Entry` metadata object: Create fixes `Entry.Action` to `"Submit"`, Update to `"Update"` — the app
splits create/update into separate Actions instead of exposing `Action` as a param that could
contradict which endpoint you called. `Role` (`Public` / `Internal` / `Reviewer`) is included on both.
Calculation fields update automatically and cannot be set directly; file-upload fields cannot be set
via Create/Update at all — use *Upload File* to mint a File ID first (expires in 48 hours if unused),
or read one back with *Get File*.

*Import Entries* is the bulk path: upload an `.xlsx`/`.csv` and a mode (`CreateNew` /
`UpdateExisting` / `SyncEntries`, the last of which can also delete), then poll *Get Import Status*
with the returned import ID.

## Auth

**Bearer Token** (branded "API Key" in the product UI, but transmitted as a standard OAuth bearer
token per the spec's own `securitySchemes`).

```
Authorization: Bearer {token}
```

Mint one at **Organization → Settings → Integrations → + New API Key** — it cannot be retrieved
after creation, so copy it immediately. The spec's `info.description` also documents an
`?access_token=` query-string fallback for systems that can't set custom headers, but the header form
is used here: it's what the vendor's own setup guide tells integrators to do ("Use this bearer token
in the Authorization header when making API requests"), and it keeps the token out of URLs and
request logs.

### Scopes are per-integration, not per-token-type

Each integration is independently scoped along two axes:

- **Form Scope** — No Scopes / **Read** (Get Forms, Get Form Schema) / **Read-Write** (+ Set Public
  Link Availability)
- **Entry Scope** — No Scopes / **Read** (Get Entry, Get Document) / **Read-Write** (+ Create Entry,
  Update Entry) / **Read-Write-Delete** (+ Delete Entry)

— plus a "Can Access" allowlist of specific forms/folders. A working, correctly-scoped token can
therefore legitimately 401 on an action that needs a scope it wasn't granted; the response body's
`Type` (`MissingScope`, with the missing scope named in `Data.MissingScope`) is what tells that apart
from a genuinely dead token (`AccessTokenInvalid` / `AccessTokenNotProvided`, both confirmed live).
The `test` hook and every action classify failures from this `Type`, never from the HTTP status
alone.

### Response shape

A success response is the bare resource — no envelope. A failure response (any non-2xx) is always:

```json
{ "Type": "EntryNotFound", "Message": "Entry not found.", "SupportCode": "ABC-123-DEF", "Data": null }
```

`429` additionally carries a `Retry-After` header (a datetime, not a delay). The file/document
endpoints (`Get Document`, `Get File`, `Upload File`) are `application/json` too, per the spec's
top-level `produces` — the binary content rides inside the JSON body as a base64 `Content` field,
never a raw byte stream.

## Health check

Two of the pack's three usual questions are covered; the third has nothing real to read.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.cognitoforms.com/api/v2/summary.json
```

Confirmed live 2026-08-30: a real, populated page (id `252qfz030rt5`), not an unclaimed/decoy
instance, with components including *Website and Forms* and *Email*. Unauthenticated and unsigned —
`status.cognitoforms.com` is widened onto this one hook's own allowlist and is deliberately absent
from the app's egress list, so no Action can reach it.

### Is this credential live?

The Auth `test` hook — `GET /forms`, the cheapest read available and the one call every integration
with any Form access at all can reach (`Form Scope: Read` covers *Get Forms* per the vendor's own
setup guide). A `MissingScope` response is treated as a **live** credential (the token authenticated;
it's just not scoped for `Form:Read`, a legitimate configuration for an entries-only integration) —
only `AccessTokenInvalid`/`AccessTokenNotProvided` and everything else fail the check.

### Do we have quota left?

**Not implemented.** Checked live 2026-08-30 against both a success (`GET /forms` with a valid token)
and an error response (`GET /forms` unsigned and with a garbage token): Cognito Forms sets no
`X-RateLimit-*`/`RateLimit-*` header of any kind. There is nothing real to surface, so no `quota`
check is declared, rather than faking one.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope | Credential | Severity | Min interval | Probe                                                |
| ---------------------- | ---------- | ----- | ---------- | -------- | ------------- | ------------------------------------------------------ |
| `service`               | service    | app   | none       | degraded | 60s           | `health/service.ts`                                     |
| `auth:bearer-token`     | credential | connection | signed | fatal | —          | derived from the `bearer-token` auth method's `test` hook |

The host `status.cognitoforms.com` (for `service`) is reachable **only inside that hook's worker** —
not from any Action, and not from the auth check.

---

Researched and endpoint-verified 2026-08-30 against Cognito Forms' own OpenAPI document
(`CognitoFormsOpenAPI.json`, `openapi: 3.0.0`) — the servers array, security scheme, every path/
parameter/response schema and every error `Type` above were read off that document — and confirmed
live against `www.cognitoforms.com/api/forms` (both the `AccessTokenNotProvided` and
`AccessTokenInvalid` error shapes) and `status.cognitoforms.com/api/v2/summary.json` (a real,
populated Statuspage). The icon is Cognito Forms' own favicon artwork, fetched directly from
`static.cognitoforms.com` (the vendor's asset CDN — the apex domain's `favicon.ico`/`.svg` are
non-functional redirects and were not used).
