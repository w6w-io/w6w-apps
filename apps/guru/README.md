# Guru

Search, read and manage **Cards** (individual pieces of verified knowledge), **Collections**
(top-level knowledge bases) and **Folders** ("Boards" in Guru's own UI) on the **Guru API v1**.

- **Categories** — productivity, search, ai
- **Auth methods** — basic
- **Actions** — 16
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:basic`
- **Egress allowlist** — `api.getguru.com` (the `service` check adds `status.getguru.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.getguru.com/
- **Developer docs** — https://developer.getguru.com/
- **OpenAPI** — `https://dash.readme.com/api/v1/api-registry/3gy914ims4w0woi` (the uuid is read out of
  `developer.getguru.com`'s own embedded page data — Guru does not publish a stable, guessable
  OpenAPI URL of its own)
- **Status page** — https://status.getguru.com/

> **Everything below was verified against Guru's own sources on 2026-09-05** — its machine-readable
> OpenAPI 3 document (411,583 bytes, `info.title` "Guru API", `info.version` "v1"), the
> `developer.getguru.com` reference pages it is generated from, and live probes against
> `api.getguru.com` and `status.getguru.com`. Nothing here came from a third-party integration
> directory.

## The three things most likely to cost you time

### 1. The authentication doc's own worked example is stale

`developer.getguru.com/reference/authentication` (page `updatedAt` 2025-05-21) tells you to test a
new credential with:

```
curl -u USER:TOKEN https://api.getguru.com/api/v1/teams
```

`GET /api/v1/teams` **does not exist** anywhere in the *current* OpenAPI document (fetched from the
same ReadMe project the doc itself lives in — 175 paths, none of them `/teams`), and it was
confirmed live on 2026-09-05: both an unauthenticated request and one signed with a syntactically
plausible but fake `user:token` pair answer a bare `401`, indistinguishable from "this URL doesn't
exist." Following the doc's own example on this API version would read as "my credentials are
wrong" when the real problem is a five-month-stale reference page.

This app's Auth `test` hook probes `GET /api/v1/whoami` instead — a path that **is** in the current
document, requires a credential (confirmed: unauthenticated and fake-credential requests both 401),
and works identically whether the credential is a User or a Collection token (its own summary:
"Get basic information about the authenticated user **or collection**").

### 2. Two credential shapes share one wire format, and only one can write

Guru issues two kinds of token, both sent as HTTP Basic with the token as the password — only the
**username** half differs:

| Token type       | Username is…            | Permissions   | Looked up via                          |
| ---------------- | ------------------------ | ------------- | --------------------------------------- |
| **User token**   | the user's email          | Read/write    | Guru account settings                   |
| **Collection token** | the target Collection's ID | **Read-only** (GET only) | `GET /api/v1/collections` (needs a User token first) |

Because the wire shape is identical either way (`base64(username:token)`), this app declares one
`username` field with a label explaining both cases, rather than a token-type selector. It cannot
tell in advance which kind of token a Connection holds — a mutating action (Create/Update/Delete
Card, Create Collection, Create/Update Folder, Verify Card) against a Collection-token Connection
surfaces Guru's own `403`, and `formatGuruError` in [`lib/client.ts`](lib/client.ts) names the
Collection-token trap explicitly in that message.

### 3. Ordinary reads can carry a live Collection token

Guru's `CollectionModel` schema — embedded as `.collection` on **every** `Card` and `Folder`
response, and returned directly by every Collection endpoint — declares a bare, undocumented
`token: string` property. `TeamUser` (what `GET /api/v1/members` returns) declares the same. Neither
field's schema description rules out that it is the Collection's own read-only API token from the
table above.

This app has no live Collection-token credential to confirm the field's actual contents one way or
the other — and a workflow step's result is persisted and re-rendered downstream, so treating this
as a real risk rather than waiting for proof is the same discipline Apify's `proxy.password` gets
elsewhere in this pack. **Every action strips `token` from the top level of its result and from an
embedded `.collection`** (`stripTokens` in [`lib/client.ts`](lib/client.ts)) before returning. The
strip is deliberately narrow — exactly those two documented paths, never a scan for anything
"looking secret" — because a heuristic that ate any field named `token` would also eat a Card's own
content mentioning the word.

This app also declares **no "whoami" action at all**: `GET /api/v1/whoami`'s response embeds the
same `CollectionModel` (as `WhoAmI.collection`), and there is no other reason to surface that
endpoint's body to a workflow. The invariant is enforced by
[`tests/index.test.ts`](tests/index.test.ts), which derives, from every action's own source, that
every body-reading action calls `stripTokens` — adding a new action that reads a `Card`, `Folder`,
`CollectionModel` or `TeamUser` without stripping fails the suite.

## Pagination is a `Link` header, not a body cursor

Every list/search endpoint's own OpenAPI description says the same thing: "A maximum of N results
will be returned. If more exist, a link to the next page of results will be included in the Link
header." That is RFC 5988 form (`Link: <...&token=xyz>; rel="next"`), and `extractNextToken` in
[`lib/client.ts`](lib/client.ts) pulls the `token` out of it. Every list/search action here returns
that value as `nextToken`; feed it back into the same action's `token` param to continue.

## No response envelope

Unlike several other apps in this pack, Guru wraps nothing: list/search endpoints return a **bare
JSON array**, and single-resource endpoints return the entity itself. There is no `{"data": ...}` or
`{"items": ...}` to unwrap.

## What "Card", "Collection" and "Folder" actually mean here

- **Card** — one piece of verified knowledge: a title (`preferredPhrase`), HTML/Markdown content, a
  verification state (`TRUSTED` / `STALE` / `NEEDS_VERIFICATION`), a verifier, tags, and the
  Folder(s) it's filed into. Covered here: search, get, create, two flavours of update (full
  replace vs. content-only), delete, and verify.
- **Collection** — a top-level knowledge base, usually one per team. Covered here: list, get,
  create.
- **Folder** — Guru's API name for what its own UI calls a "**Board**": a grouping of related Cards
  within a Collection. Covered here: list, get, create, update (title/description only — Guru's
  update schema carries no `parentFolderId`, so moving a Folder is not exposed), and listing a
  Folder's direct items (Cards and sub-Folders).
- **Members** — team member lookup, useful for finding a verifier or owner by name before assigning
  one on a Card.

## Deliberately out of scope

Guru's OpenAPI document has 175 paths; this app covers 16 actions across the four groups above.
Left out, and worth naming explicitly rather than leaving as a silent gap:

- **Tag management on Card update.** `PUT /cards/{cardId}/extended`'s own description says omitting
  `tags` removes every existing tag — but the `Tag` objects it expects come from a separate
  `teams/{teamId}/tagcategories` lookup this app doesn't otherwise cover, and guessing at a partial
  shape risks silently clearing a Card's tags. `card-update` never sends the field.
- **Card verifier assignment at create/update time.** `NewCard.verifiers` is a `oneOf` between a user
  verifier and a group verifier; a dedicated `POST /cards/{cardId}/verifiers` endpoint exists for
  this and is not covered here either.
- **The AI Agent / Knowledge Agent / Chat / Quality subsystem** — roughly 80 of the 175 documented
  paths (`knowledgeagents/*`, `chat/*`, `quality/*`, `aievaluations/*`). This is a separate, much
  larger product surface (agents, skills, guardrails, MCP configuration, quality runs) built on top
  of the Card/Collection/Folder model this app covers, not an extension of it — a good candidate for
  its own app rather than folding into this one.
- **Announcements, drafts, comments, navigation pins, KCS, templates, widgets, sources.** All real,
  documented parts of the OpenAPI surface; none of them are core to the search/read/manage-a-Card
  path this app centers on.

## Health checks

- **`service`** (`kind: "service"`) — Guru's Statuspage
  (`status.getguru.com/api/v2/summary.json`), confirmed to self-identify as "Guru" (`page.name`) and
  to carry 13 named components (API, Databases, Web App, Servers, Extension, Slack bot, File
  Service API/Conversions, Analytics, Message Delivery, plus Stripe/Zuora billing infrastructure
  nested under an `Infrastructure` group). One row (`Infrastructure`, `group: true`) is skipped to
  avoid double-counting its six children; the page-level `status.indicator` drives the verdict.
- **`quota`** (`kind: "quota"`) — **declared unavailable**. Guru's OpenAPI document declares no
  response headers anywhere in its 175 paths, and a live probe on 2026-09-05 carried no
  `X-RateLimit-*`/`RateLimit-*` header of any kind. `severity: "informational"` so this entry never
  pins the app's roll-up at `unknown`.
- **`auth:basic`** — derived automatically from the `test` hook above.

## Icon

Downloaded verbatim from Guru's own marketing site
(`cdn.prod.website-files.com/.../Guru%20logo.svg`, `alt="Guru Logo"`) on 2026-09-05 — the "G" mark,
162.31×162.01 viewBox, unmodified.
