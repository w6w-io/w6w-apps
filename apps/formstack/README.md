# Formstack

Forms, fields, folders and submissions on the **Formstack V2025 API**.

- **Categories** — forms, productivity
- **Auth methods** — access-token
- **Actions** — 9
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:access-token`
- **Egress allowlist** — `www.formstack.com`
- **Website** — https://www.formstack.com/
- **API docs** — https://developers.formstack.com/ · [llms.txt](https://developers.formstack.com/llms.txt)

> **Everything below was verified against Formstack's own documentation on 2026-08-11** —
> `developers.formstack.com/llms.txt` and the per-endpoint `.md` pages it indexes, each of which
> embeds that endpoint's OpenAPI fragment — plus live probes against `www.formstack.com`. Nothing
> here came from a third-party integration directory.

## The four things most likely to go wrong

### 1. This is V2025, not the older v2

Formstack runs two generations side by side:

| Generation | Base | Auth |
| --- | --- | --- |
| v2 (older) | `https://www.formstack.com/api/v2` | OAuth2 / app tokens |
| **V2025** | `https://www.formstack.com/api/v2025` | **Personal Access Token** |

Both are live and **both answer `401` rather than `404`** to an unauthenticated call, so a
credential for the wrong one presents as a rejected token rather than a wrong URL. `test` names that
possibility explicitly, because it is the likeliest cause of a connection that "should work".

### 2. Pagination parameter names differ between endpoints

| Endpoint | Page | Size |
| --- | --- | --- |
| `GET /forms` | `pageNumber` | `pageSize` |
| `GET /forms/{id}/submissions` | `pageNumber` | `pageSize` |
| `GET /folders` | **`page`** | **`perPage`** |

The inconsistency is the vendor's. Sending the wrong pair is **not an error** — it is ignored, and
you get page one forever. Each action spells its own names rather than sharing a helper that would
hide the difference, and `tests/actions/actions.test.ts` pins each against the vendor's OpenAPI
fragment.

### 3. Submission answers are opt-in

`GET /forms/{id}/submissions` returns a submission's metadata unconditionally, but the **answers**
only appear with `data=true`. A workflow that reads submissions and finds no field values has almost
always left this off — so this app defaults it **on**.

`expandData` goes further and returns parsed values rather than raw ones, which matters for select
and matrix fields where the raw form is an encoded string. `dataFormat` decides the shape: `legacy`
(the vendor's default) keys `data` by field id, which is what List Form Fields publishes.

### 4. Submissions are addressed globally, forms are not

`GET /submissions/{id}` and `DELETE /submissions/{id}` take the submission's own id with **no form id
in the path**. Only the *list* and *create* endpoints are form-scoped. It reads like an oversight the
first time and is simply the shape.

## Auth

One method: a **Personal Access Token**.

The vendor's note is worth repeating because it explains a whole class of surprise: "Personal Access
Tokens are tied to a Formstack user and **follow Formstack (in-app) user permissions**." The token is
only as narrow as the person it belongs to, so a connection made with a limited user's token sees
fewer forms than an admin expects — and that is correct behaviour, not a bug. A dedicated integration
user is the way to scope one down.

### The probe is `GET /forms?pageSize=1`

Formstack's V2025 surface has **no whoami endpoint**, so the choice is among ordinary resource reads.
The forms list is the right one: it is the account's own top-level resource, any token that can do
anything can read it, and its response contains no credential material — the concern that
disqualifies `/me`-shaped probes elsewhere in this pack. `pageSize=1` keeps it cheap on an account
with thousands of forms.

An **empty account is deliberately treated as valid**. A token that authenticates against an account
with no forms yet is fine, and calling it broken would block a first-run setup. That is the opposite
call from `apps/baserow`, whose database token *is* scoped to tables — so one that reaches none is
genuinely useless. This token is not scoped to forms.

`afterConnect` publishes a **form count**. Form names are the customer's own content and a display
block is shown wherever the Connection is, so a count is the whole label.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `form-list` | search | `GET /forms` |
| `form-get` | read | `GET /forms/{id}` |
| `form-fields` | search | `GET /forms/{id}/fields` |
| `folder-list` | search | `GET /folders` |
| `submission-list` | search | `GET /forms/{id}/submissions` |
| `submission-count` | read | `GET /forms/{id}/submissions/count` |
| `submission-get` | read | `GET /submissions/{id}` |
| `submission-create` | perform | `POST /forms/{id}/submissions` |
| `submission-delete` | perform | `DELETE /submissions/{id}` |

### Notes on individual actions

**Start at `form-list`**, then `form-fields`. A submission is keyed by field **id**, and that action
is the only place the ids, types and `required` flags are published — both for writing a submission
and for reading one back, since `dataFormat: legacy` keys `data` by the same ids.

**`submission-list`'s field search is a dynamically-named parameter** — `search[12345]=value` — which
no form field can express, so it is taken as a JSON object of field id → value and expanded. Same
approach `apps/baserow` uses for its filters.

**`submission-create` sends JSON.** Formstack defaults to url-encoded input and only accepts JSON
when the `Content-Type` says so; structured field values (matrix, checkbox groups) do not survive
url-encoding intact, so this app always asks for the JSON path.

**`submission-delete` is permanent** — the vendor's own words are "permanently delete a submission and
all associated data", including uploaded files. There is no trash.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | informational | Reads `www.intellistackstatus.com/api/v2/summary.json` |
| `quota` | quota | app | informational | Declared `unavailable` — no readable headroom |
| `auth:access-token` | — | connection | — | Derived from `Auth.test` automatically |

### Finding the status page meant following a rebrand

| Candidate | What it actually is |
| --- | --- |
| `status.formstack.com` | A real Atlassian-branded page, but it serves the **identical 130,429-byte HTML for every path** — `/api/v2/summary.json` and a nonsense path alike. A catch-all; no readable API. |
| `formstack.statuspage.io` | **200 with 34,835 bytes of real JSON** — self-identifying as `page.name: "Intellistack"`. |
| **`www.intellistackstatus.com`** | The canonical host that page names. Same JSON, and **404 with 0 bytes** on a bogus sibling path. |

**Formstack is now part of Intellistack**, and the status page belongs to the parent brand — which is
why searching for "Formstack status" lands on a page that cannot be read programmatically. The check
accepts either brand in the page's identity, since it has already followed one rename.

**Why `informational`:** the page carries **87 components across the whole portfolio** — `Main
Application`, `Formstack ID (FSID)`, `Salesforce`, `HawkSoft`, `Google Drive`, `Collaboration` and
more. An incident in HawkSoft, an insurance-agency system the parent owns, says nothing about whether
this app's endpoints work, and the page-level indicator moves for any of them. At the `degraded`
default that would drag every Formstack Connection down for an unrelated product's outage.

Same call `apps/metabase` and `apps/baserow` make, reached differently: there the page covers only the
vendor's *hosted* offering while many installs are self-hosted; here it covers a whole *portfolio*
while this app touches one product in it. (Contrast `apps/basecamp`, whose portfolio page *does* have
a single component meaning "this product" — so that check keeps full weight.)

Components are keyed by the vendor's **id** rather than a name slug, because the portfolio page
repeats display names across product groups — several components are called `Main Application`.

### Why `quota` is unavailable

The vendor's words: "the Formstack V2025 API implements **daily rate limiting per access token**. The
specific limits vary based on your account plan type." A live response carries no `RateLimit-*`,
`X-RateLimit-*` or `Retry-After` header, and the plan-specific allowance is a pricing fact rather than
an API-readable one.

Two consequences the client encodes: the allowance is **per token** (two connections with two tokens
do not share one, but every workflow using the same token does), and the window is a **day** — so a
429 means this token is finished until it rolls, which the error says rather than inviting a retry.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Form create / update / copy / delete** | Building forms is design-time work done in the UI, and `POST /forms` takes a whole field model. |
| **Field create / update / delete** | Schema editing rather than data integration. The read side *is* shipped, because every submission action needs it. |
| **Confirmation and notification emails** | Real CRUD surfaces, left out to keep this first pass reviewable. |
| **Smart Lists** | Reusable option sets — schema-shaped, and only useful alongside field editing. |
| **Partial submissions** | Save-&-resume entries. Worth adding; a distinct enough concept to deserve its own pass. |
| **File download and presigned upload URLs** | A two-step binary flow that needs its own design. |
| **Prefill URLs, embed JS, rendered HTML** | Front-end delivery concerns rather than workflow steps. |
| **SCIM user management** | A separate API with a separate audience. |

## Icon

`assets/icon.svg` is **Formstack's own mark**, not a drawing, taken verbatim from
[simple-icons](https://simpleicons.org/), which sources marks from vendors' own brand assets:

```
https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/formstack.svg
```

The path data is unmodified. Run `deno task fmt`, never bare `deno fmt` — the latter reformats
`assets/` and would rewrite the vendor path.

## Layout

```
formstack/
├── index.ts                  # AppDefinition: 9 actions, 1 auth, 2 health checks
├── lib/client.ts             # V2025 base, JSON encoding, the daily-quota error
├── auth/access-token.ts      # bearer PAT, /forms probe, form count on connect
├── actions/                  # one file per action
├── health/                   # service (Intellistack) + quota (unavailable)
└── tests/                    # 45 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 45 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/icon.svg
```
