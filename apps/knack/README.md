# Knack

Read, create, update and delete records in a Knack application's own tables, on Knack's
**object-based REST API v1**.

- **Categories** — databases, productivity
- **Auth methods** — application-key
- **Actions** — 5
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:application-key`
- **Egress allowlist** — `api.knack.com` (the `service` check adds `status.knack.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.knack.com/
- **API docs** — https://docs.knack.com/reference
- **Status page** — https://status.knack.com

Knack is a no-code database and app builder: every customer designs their own schema of **Objects**
(tables) and **Fields** inside their own Knack application, and Knack generates a REST API over
exactly that schema. There is no fixed set of resources this app can enumerate in advance — the whole
of Knack's documented API is "read/write records against an Object (or a View) whose key you already
know" — so this app is built around exactly that one surface, and every action takes the target
Object's key as a parameter.

> **Everything below was verified against Knack's own reference docs on 2026-09-05** —
> [`docs.knack.com/reference`](https://docs.knack.com/reference) (ReadMe-hosted; the older
> `www.knack.com/developer-documentation/` link the original candidate cited is dead, 301s to a
> marketing redirect page) — plus live probes against `api.knack.com` and `status.knack.com`. Nothing
> here came from a third-party integration directory.

## The three things most likely to cost someone real time

### 1. There is no schema-discovery endpoint of any kind

Every single documented route — `retrieving-records`, `retrieving-one-record`, `creating-records`,
`updating-records`, `deleting-records` — is scoped to `/objects/{object_key}/records[...]` or a
page/view's own route. There is **no `GET /v1/objects`** to list an app's tables, no whoami, no ping.
Reaching *anything* authenticated requires already knowing a real Object key that exists in that
specific Knack app.

That single fact shaped this app's whole design:

- every Action takes an `objectKey` param — one Connection's credential can reach every Object in the
  Knack app, not just one, so the choice belongs at the Action, not the Connection;
- the Auth method (`auth/application-key.ts`) cannot verify a credential is live without also being
  handed one real Object key, so it collects a dedicated **`testObject`** field for exactly that
  purpose — it is never touched by an Action, which each choose their own Object;
- finding an Object or Field key is a **Builder task** (open the table, or enable "Show System
  Fields" to see keys in the grid), never something this app can look up for you.

### 2. Error bodies are plain text, not JSON — even though success bodies are JSON

Measured live on 2026-09-05: `GET /v1/objects/object_1/records` with no headers at all answers
`401` with the body `Invalid API Request` and `content-type: text/html` — no envelope, no
`{"error": …}`. A malformed Application ID answers `400 Malformed App ID.` (sometimes prefixed
`ValidationError: `). Knack's own [response-format reference](https://docs.knack.com/reference/response-format)
names two more exact strings the same way: `401 Invalid API key` and, for view-based requests only,
`403 Invalid or Expired Token`. A client that tries `JSON.parse` on any of these throws instead of
producing a useful error — `lib/client.ts` and `auth/application-key.ts` both read error bodies as
text and match on substrings, never JSON.

### 3. Whether the rate-limit headers ride an ordinary response is genuinely unconfirmed

[`api-limits`](https://docs.knack.com/reference/api-limits) documents `X-PlanLimit-Limit/Remaining/Reset`
(the plan's daily cap — 1,000/5,000/10,000/25,000 requests/day by plan) and
`X-RateLimit-Limit/Remaining/Reset` (10 requests/second, every plan) side by side with a worked `429`
example. A separate section on the same page — "Checking the Remaining API Request Limit" — frames
`X-PlanLimit-Remaining` as something read at any time to monitor usage, which reads as "present on
ordinary responses too", but this could not be confirmed against a live account (no credentials to
test with). `health/quota.ts` reads whichever headers are actually present on the wire and reports
`state: "unknown"` — never a guessed number — when neither pair shows up.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `record-list` | search | `GET /v1/objects/{object_key}/records` — filters, sort, pagination |
| `record-get` | read | `GET /v1/objects/{object_key}/records/{record_id}` |
| `record-create` | perform (not idempotent) | `POST /v1/objects/{object_key}/records` |
| `record-update` | perform (idempotent) | `PUT /v1/objects/{object_key}/records/{record_id}` |
| `record-delete` | perform (idempotent) | `DELETE /v1/objects/{object_key}/records/{record_id}` |

**Object-based only.** Knack also documents a parallel *view-based* route for every one of these
(`/v1/pages/{scene_key}/views/{view_key}/records[...]`), scoped to whatever fields/permissions a
specific page's view exposes. It is not implemented here: it needs a page/view key pair in addition
to the object key, and a login-gated view further needs a live per-user token this app has no way to
obtain (the credential this app holds is the app-wide API key, which the docs describe as bypassing
view permissions entirely). Object-based requests already have "full access to every field and
record in your app", so nothing in this app's surface needs the view-based form.

**Filtering** takes Knack's own filter-tree JSON (`{"match": "and"|"or", "rules": [...]}`, built
either by hand or copied from a filtered table's URL in the Builder/a Live App) rather than a
generated form — the set of valid `operator` values is per field *type*
([`filters-field-types`](https://docs.knack.com/reference/filters-field-types)), which this app has
no way to know for an arbitrary Object.

## Auth

**`application-key`** — two headers, `X-Knack-Application-Id` and `X-Knack-REST-API-Key`
(`docs.knack.com/reference/api-key-app-id`, `object-based-requests`). The Application ID is a plain
`string` field, not `secret`: Knack's own docs warn the API key is server-side only, implying the
Application ID is expected to appear in client-side code. The API key is the entire authentication
story and is masked.

A third field, **`testObject`**, exists purely because there is no credential-only probe (see finding
1 above) — give any Object key that already exists in the app. `test` reads `GET
/v1/objects/{testObject}/records?rows_per_page=1` and classifies the plain-text response against the
vendor's own documented strings; a failure that matches none of them (most likely: `testObject` names
no real Object) is reported with the raw status and body rather than guessed at.

## Health checks

### `service` — Knack platform status

[status.knack.com](https://status.knack.com) is a real Atlassian Statuspage — confirmed by its own
"Powered by Atlassian Statuspage" footer link, by a bogus sibling path (`/api/v2/zzz-not-real.json`)
answering `404` with 0 bytes against `/api/v2/summary.json`'s ~9,600 bytes, and by the page
self-identifying (`"page": {"id": "w2mf2swvx7sh", "name": "Knack", ...}`). Its components are Knack's
own — `API`, `Builder`, `Live App`, `Flows`, `Account Dashboard` under "Knack Features"; `Marketing
Site`, `Support Ticket Portal`, `Knowledge Base`, `Community Forum`, `Product Requests & Changelog`
under "Knack Services" — all reported, each keyed by the vendor's own component id so a reader never
mistakes, say, `Community Forum` for the REST API this app actually calls (`API`, id
`39z0356ftqyz`). Left at the `degraded` default: Knack is SaaS-only, so every Connection runs on
exactly the infrastructure this page describes.

### `quota` — API plan & rate limit headroom

Reads `X-PlanLimit-*` / `X-RateLimit-*` from a minimal `rows_per_page=1` read against the
Connection's `testObject` (see finding 3 above). Reports `unknown` — never a guessed number — when
neither header pair is present on the response. `credential: "signed"`, `scope: "connection"`: this
reuses the same request shape the credential probe does, for the same reason — it is the one
authenticated request this app can make without already knowing which Object a workflow will
actually use.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **View-based reads/writes** | Needs a page/view key pair and, for a login-gated view, a live user token this app has no way to obtain. See "Actions" above. |
| **Schema management** (creating/editing Objects, Fields, Pages, Views) | Not part of the REST API at all — it is a Builder-only surface. |
| **Bulk/CSV import-export** | Not part of the documented REST API — Knack's own import/export tooling lives in the Builder. |

## Icon

`assets/icon.svg` is the icon-only glyph half of Knack's own header lockup
(`knack-header-logo.svg`, taken from `https://www.knack.com/uploads/2023/06/knack-header-logo.svg`
on 2026-09-05), cropped to its own bounding box — the vendor's path data is untouched; only the
"knack" wordmark beside it is gone, following the same convention `apps/bamboohr` uses for a
lockup-only vendor asset. Run `deno task fmt`, never bare `deno fmt` — the latter reformats `assets/`
and would rewrite the vendor path.

## Layout

```
knack/
├── index.ts                    # AppDefinition: 5 actions, 1 auth, 2 health checks
├── lib/client.ts                # KnackClient, error formatting, plain-text error handling
├── lib/params.ts                # shared Param fragments (objectKey, recordId, filters, ...)
├── auth/application-key.ts      # two-header credential, testObject probe, error classification
├── actions/                     # one file per action (record-list/get/create/update/delete)
├── health/                      # service (status.knack.com) + quota (X-PlanLimit-*/X-RateLimit-*)
└── tests/                       # 60 unit tests against a mocked HookContext
```

## Development

```bash
deno task test      # 60 unit tests
deno task check     # typecheck
deno task lint
deno task fmt        # NEVER bare `deno fmt` — it rewrites assets/icon.svg
deno task validate   # @w6w/validator manifest audit
```
