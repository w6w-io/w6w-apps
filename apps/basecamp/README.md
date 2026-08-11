# Basecamp

Projects, people, to-dos, messages, comments and Campfire lines on the **Basecamp 5 API**.

- **Categories** — project-management, productivity
- **Auth methods** — oauth
- **Actions** — 11
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:oauth`
- **Egress allowlist** — `3.basecampapi.com`, `launchpad.37signals.com`
- **Website** — https://basecamp.com/
- **API docs** — https://github.com/basecamp/bc3-api · [OpenAPI](https://github.com/basecamp/basecamp-sdk/blob/main/openapi.json)

> **Everything below was verified against Basecamp's own sources on 2026-08-11** — the REST reference
> at `basecamp/bc3-api` (plain Markdown on GitHub) and the official OpenAPI document the vendor ships
> with its SDK (`basecamp/basecamp-sdk`, `openapi.json`, OpenAPI 3.1.0, "Basecamp 2026-08-05", 167
> paths). Nothing here came from a third-party integration directory.

## The five things most likely to go wrong

### 1. Every URL embeds an account id, and it is discovered rather than typed

All URLs are `https://3.basecampapi.com/{accountId}/…` — and, in the vendor's words, "no `/api/v1` API
prefix. Also, note the different domain!"

One 37signals ID can belong to several accounts, so the token alone does not say which. The account is
read at connect time from `GET launchpad.37signals.com/authorization.json` and published on the
Connection. When a token reaches **several** Basecamp accounts the first is used and the rest are
listed in `display.accounts`, so the choice is visible rather than silent — changing it is a
reconnect, not a hidden setting. Making it an action parameter would let two actions on one Connection
write to two different companies' Basecamps.

### 2. Not every 37signals account is a Basecamp account

`authorization.json` lists every product the identity can reach — HEY, Basecamp 2, Basecamp Classic,
Highrise. **Only entries with `product: "bc3"` speak this API.** A 37signals ID with only HEY on it
authenticates perfectly and then 404s on everything, which is exactly the failure a bare status check
would miss — so `test` reports it, and names what the identity *can* reach.

### 3. Basecamp requires you to identify your application

Every request must carry a `User-Agent` naming the app **and a way to contact whoever runs it**; the
vendor's own example is `MyApp (yourname@example.com)`, and a request without one can be refused. It
is a documented requirement, not a nicety — this app sends it on every call, including the unsigned
health checks, since the requirement is about the caller rather than the credential.

### 4. A message is a draft unless you say otherwise

`status` defaults to a draft on Basecamp's side: **nothing is published and nobody is notified** until
`status: "active"`. A workflow that posts announcements and finds nobody saw them has almost always
left this alone, so `message-create` defaults it to active and offers the draft explicitly.

### 5. Flat routes, and everything is a "recording"

Every resource is addressable by its own id — `GET /todos/67890.json`,
`POST /recordings/123/comments.json` — with the project derived server-side. The older
`/buckets/{project_id}/…` form still works "in perpetuity" but the vendor calls it legacy, so this app
uses the flat form throughout; that is why most actions take one id rather than a project *and* a
resource id.

And because messages, to-dos, documents and uploads are all **recordings** underneath, a single
`comment-create` comments on any of them — one action instead of four.

## Auth

**OAuth 2.0 only.** Basecamp has no API keys and no personal access tokens: "All Basecamp 5 API
requests are authenticated by passing along an OAuth 2 token."

That is workable here because the **host** runs the authorization flow and holds the refresh token;
`sign` only stamps the resulting bearer. This is not the pattern rejected in `apps/metabase` and
`apps/mattermost`, where the credential was a *session token fetched with a password* that `sign`
would have had to refresh from a network-less context.

| | |
| --- | --- |
| Authorize | `https://launchpad.37signals.com/authorization/new` |
| Token | `https://launchpad.37signals.com/authorization/token` |
| Register | `https://launchpad.37signals.com/integrations` |

Launchpad issues a token for everything the identity can reach and has no scope vocabulary to narrow
it with, so none is declared.

### The probe is `GET launchpad.37signals.com/authorization.json`

It is the endpoint the vendor points at for exactly this — "Try making an authorized request to
`authorization.json` to dig in and test it out!" — and the only one callable *before* an account id is
known, which every API URL requires.

Its body is an identity plus the reachable accounts. It carries the user's name and email — their own,
not a secret of this connection — and **no token material**. It also catches the HEY-only case above,
which is the failure that would otherwise surface as every action 404ing.

`afterConnect` publishes the account **id** (every URL needs it) and **name** ("which Basecamp is
this?" is the question a list of Connections has to answer). The identity's email is deliberately not
published: a display block is shown wherever the Connection is, and the organisation's name answers
the question without naming an individual.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `project-list` | search | `GET /projects.json` |
| `project-get` | read | `GET /projects/{id}.json` |
| `people-list` | search | `GET /people.json` |
| `todo-list` | search | `GET /todolists/{id}/todos.json` |
| `todo-get` | read | `GET /todos/{id}.json` |
| `todo-create` | perform | `POST /todolists/{id}/todos.json` |
| `todo-complete` | perform | `POST` / `DELETE /todos/{id}/completion.json` |
| `message-list` | search | `GET /message_boards/{id}/messages.json` |
| `message-create` | perform | `POST /message_boards/{id}/messages.json` |
| `comment-create` | perform | `POST /recordings/{id}/comments.json` |
| `campfire-line-create` | perform | `POST /chats/{id}/lines.json` |

### Notes on individual actions

**Start at `project-list` and read the `dock`.** A project's dock lists its tools and their ids — the
message board, the to-do set, the Campfire — and that is where the ids the other actions take come
from. Basecamp has no "list message boards" endpoint; you read the dock.

**`todo-complete` is one action with a direction** because Basecamp models completion as a
sub-resource: `POST` creates it (done), `DELETE` removes it (reopened). There is no `completed` field
to update.

**`todo-list` excludes completed to-dos by default**, and `completed=true` *replaces* the set rather
than adding to it — there is no "both", so reconciling a list takes two calls.

**Assignees are numeric person ids** from `people-list`. There is no assign-by-email anywhere in this
API, so a stray address is rejected locally rather than sent.

**`content` and `description` are rich text** — Basecamp stores and returns HTML — so markup is
preserved rather than escaped. `due_on` and `starts_on` are dates (`YYYY-MM-DD`), not timestamps.

**`campfire-line-create` is the closest thing to a chat webhook**, and is what most workflows actually
want: a build finished, a form came in, say so in the room.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | (default `degraded`) | Reads `37signals.statuspage.io`, verdict from the `Basecamp 5` component |
| `quota` | quota | app | informational | Declared `unavailable` — no remaining count |
| `auth:oauth` | — | connection | — | Derived from `Auth.test` automatically |

### Three traps and one real page

This is the sharpest example in the pack of why the obvious status host must be verified:

| Candidate | Result |
| --- | --- |
| `status.basecamp.com` | A real page — titled **"37signals Status"** — but it serves the identical **264,473-byte** HTML for every path. A catch-all; no readable API. |
| `basecamp.statuspage.io` | **200, 127,697 bytes** — the unclaimed-Statuspage shell. |
| `basecamphq.statuspage.io` | **200, 127,697 bytes** — the same shell. |
| `bc3.statuspage.io` | **200, 127,697 bytes** — the same shell again. |
| **`37signals.statuspage.io`** | **200 with 2,636 bytes of real JSON**, and **404 with 0 bytes** on a bogus sibling path. |

Three plausible subdomains all answer `200` with the generic "create your own status page" page that
Atlassian serves for any *unregistered* name. Any of them would look configured and parse as nothing,
forever. `tests/index.test.ts` bans a fetchable URL to all three.

The real page self-identifies as `page.name: "37signals"`, `page.url: "https://www.37status.com"`, and
its eight components are the company's products: **`Basecamp 5`**, `HEY`, `Basecamp 2`, `Basecamp
Classic`, `Highrise`, `Campfire`, `Backpack`, `Fizzy`.

**The verdict comes from the `Basecamp 5` component specifically**, not from the page-level indicator.
HEY having an incident says nothing about whether this app works — so the other products are still
*reported* as components, and deliberately do not change the answer. That is why this check keeps full
`degraded` weight rather than dropping to `informational` like `apps/formstack`'s: there, the
portfolio page has no single component meaning "this product"; here there is one, and Basecamp is
SaaS-only, so when it is down every Connection really is affected.

If the vendor ever renames that component, the check reports `unknown` rather than silently
substituting another product's health.

### Why `quota` is unavailable

Basecamp's limit is **50 requests per 10 seconds per token**, and a `429` carries `Retry-After`. That
makes it unlike the daily allowances elsewhere in this pack: a 429 here genuinely clears in moments,
and the client's error says so rather than implying the caller is finished for the day.

What it does not carry is a *remaining* count on a successful response — `Retry-After` appears only
once you have already hit the limit. A ten-second window is also not a meaningful thing to report as
health: by the time a check ran and a human looked, it would have cleared several times over.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Card tables** (cards, columns, steps) | Basecamp's kanban surface — a substantial model of its own. |
| **Schedules, check-ins (Automatic Check-ins), questionnaires** | Each is a distinct tool with its own entry types. |
| **Documents, uploads, vaults** | Uploads are a two-step binary flow (attachment then reference) needing its own design. Commenting on them already works, since they are recordings. |
| **Webhooks** | A trigger surface, not an action surface — and one of the few endpoints still needing the legacy project-scoped route. |
| **Message types (categories)** | Also project-scoped-only. `message-create` accepts a `category_id` when you have one. |
| **Project create / update / archive, people management** | Account administration rather than workflow steps. |
| **Boosts, bookmarks, pins, client visibility, subscriptions** | Small engagement surfaces; worth adding, left out to keep this first pass reviewable. |
| **Reports** (assigned/overdue to-dos) | Reporting rather than integration, and shaped as its own query surface. |

## Icon

`assets/icon.svg` is **Basecamp's own mark**, not a drawing, taken verbatim from
[simple-icons](https://simpleicons.org/):

```
https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/basecamp.svg
```

The path data is unmodified. Run `deno task fmt`, never bare `deno fmt` — the latter reformats
`assets/` and would rewrite the vendor path.

## Layout

```
basecamp/
├── index.ts                  # AppDefinition: 11 actions, 1 auth, 2 health checks
├── lib/client.ts             # account id from the connection, required User-Agent, error taxonomy
├── auth/oauth.ts             # Launchpad OAuth, bc3 account discovery, identity probe
├── actions/                  # one file per action
├── health/                   # service (37signals, Basecamp 5 component) + quota (unavailable)
└── tests/                    # 54 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 54 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/icon.svg
```
