# Bubble

Read, write and trigger workflows against a Bubble app's own Data API and
Workflow API.

- **Categories** — developer-tools, databases
- **Auth methods** — admin-token
- **Actions** — 8
- **Egress allowlist** — `*` (every Bubble app is its own host — see below)
- **Website** — https://bubble.io
- **API docs** — https://manual.bubble.io/help-guides/integrations/api/the-bubble-api
  (long-form guide) · https://manual.bubble.io/core-resources/api/the-bubble-api/the-data-api/data-api-requests
  (short-form technical reference — the source for the exact request/response
  shapes below). Both read 2026-09-01. Where the docs were silent or
  disagreed with their own generated Swagger example, behaviour was confirmed
  against a real, publicly reachable Bubble app (`app.bubbleapps.io`) the same
  day — see "Two things the docs don't say" below.

## Setup

### Admin API Token

1. In the Bubble app you want to connect, go to **Settings → API** and check
   **This app exposes a Data API** and/or **Enable Workflow API and backend
   workflows**, depending on which actions you need.
2. Scroll to **Generate a new API token**. Create one token per system
   connecting to this app, so it can be revoked on its own.
3. Copy the app's own root URL, also shown on that page — it already includes
   `/version-test` for the app's development version (Main branch), a branch
   id for a custom development branch, or neither for Live.
4. Paste both into the connection as **App URL** and **Admin API Token**.

This grants "the same privileges as an admin would get in the Bubble editor":
every Data Type exposed to the Data API, and every API Workflow whose
authentication is set to Admin-only or looser.

### Every Data Type needs its own opt-in

Checking "This app exposes a Data API" is not enough on its own — each
individual Data Type must also be checked on in **Settings → API → Data API
Settings**, and its Privacy Rule needs `Find this in searches` / `Create via
API` / `Modify via API` / `Delete via API` enabled for the corresponding
action to work, even with a valid admin token. A `404`/`401` from this app
usually traces back to one of those switches rather than the token.

### Why the allowlist is `*`

Bubble is a no-code **app builder**, not a single hosted API: every Bubble
application is its own deployment at its own root
(`https://<appname>.bubbleapps.io`, or a connected custom domain). There is no
shared vendor host to allowlist, so — like `gitea`, `mautic` and `tableau` in
this pack — the app's URL is a connection field and egress is `*`.

## Actions

| Key | Type | Description |
|---|---|---|
| `data-list` | search | Search a Data Type with constraints, sorting and pagination |
| `data-get` | read | Retrieve one record by its Unique ID |
| `data-create` | perform | Create one record |
| `data-update` | perform | Change only the given fields of a record (PATCH) |
| `data-replace` | perform | Overwrite every editable field of a record (PUT) — clears anything left out |
| `data-delete` | perform | Permanently delete one record — gated behind confirmation |
| `data-bulk-create` | perform | Create up to 1,000 records in one call |
| `workflow-trigger` | perform | Call one of the app's own named API Workflows |

`data-list`/`data-get`/`data-create`/`data-update`/`data-replace`/`data-delete`
cover the Data API's documented surface exactly — Bubble does not offer a bulk
update or bulk delete, only bulk create, so there is no `data-bulk-update`
action to be missing.

### Constraints

`data-list`'s `constraints` param is Bubble's own JSON array of
`{"key", "constraint_type", "value"}`. Constraint types, exactly as documented:
`equals` / `not equal` / `is_empty` / `is_not_empty` (any field), `text
contains` / `not text contains` (text fields — matches whole words after
stemming, not raw substrings), `greater than` / `less than` (text/number/date),
`in` / `not in` (any field), `contains` / `not contains` / `empty` / `not
empty` (list fields only), and `geographic_search` (needs an address and a
range). Sorting only works on single-value fields, never a list field — the
same restriction Bubble's own "Do a search for" has.

### Data Type names

Every action's `type` param is formatted for you — `formatTypeName` lowercases
and strips spaces the way Bubble's Data API requires (its own example: "Rental
Unit" → `rentalunit`), so you can type the name as it appears in the Bubble
editor.

## Two things the docs don't say

Bubble's docs describe the request/response shapes but not the exact error
bodies, and its generated Swagger example (`/api/1.1/meta/swagger.json`)
claims a flat `{"message": "…"}` for every error that neither shape below
matches. Confirmed live against `app.bubbleapps.io` 2026-09-01:

1. **A bad token is checked before Bubble even looks at Data API settings.**
   Sending an invalid token to an app with the Data API *disabled entirely*
   still answers `401`, not the `404` a disabled Data API otherwise gives —
   so this app's connection test can tell "your token is wrong" apart from
   "that Data Type isn't exposed" reliably. The `401` body is an undocumented
   shape that **echoes the token it just rejected**
   (`{"error_class":"Unauthorized","translation":"Invalid or expired token:
   <token>"}`) — this app never reads that field into a message it displays,
   only the HTTP status.
2. **The Swagger meta endpoint needs no token at all.** `/api/1.1/meta/swagger.json`
   answered identically with no `Authorization` header, a garbage one, and (per
   the docs' own framing — "obfuscation is not security") presumably a real
   one too. That rules it out as a credential probe, which is why the
   connection test instead probes a real Data Type (see below) rather than
   this endpoint.

## Auth: there is no whoami

Bubble publishes no admin/account endpoint of any kind — the Data API only
answers for Data Types the app builder has explicitly exposed, and the
Workflow API only for API Workflows they have named, so nothing about a fresh
connection is guessable across every Bubble app the way Gitea's `/user` or
GitHub's `/user` is. The connection test instead calls `GET /obj/{type}?limit=1`
against a **Data Type To Verify With** field (default: Bubble's built-in `user`
type, present in every app, though not necessarily exposed to the Data API) —
change it if `User` is not one of the types you have checked on.

A `404` from that probe is genuinely ambiguous (wrong URL, Data API disabled,
or just that one type not exposed) and is reported as a failure with the
ambiguity spelled out, rather than guessed at either way.

## What is deliberately left out

- **User-level authentication.** Bubble's other client identity — logging a
  specific end-user in — runs through whichever API Workflow the app builder
  designed for it (there is no fixed endpoint), so it cannot be implemented
  generically. A workflow that needs a user token can call that login workflow
  directly via `workflow-trigger` and reconnect this app with the returned
  token as the Admin API Token field (Bubble sends both the same way —
  `Authorization: Bearer <token>`).
- **Bulk update/delete.** Not documented, and not found — only bulk create
  exists.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `app` | dependency | Is **this connection's** own Bubble app reachable? |
| `service` | service | Is Bubble's own shared platform up? |

`app` sends an **unsigned** request for a Data Type name chosen not to exist
(`__w6w_health_check__`). A real, deployed Bubble app still answers `404 JSON`
for an unrecognised type — Bubble's router identified the app before it looked
at the type — so that is treated as "reachable". A `*.bubbleapps.io` subdomain
with nothing behind it answers a distinct `400 text/plain` ("Error: OwnerError
… invalid appname hosted on bubbleapps.io"), which is "down". A connected
custom domain that resolves to something other than a Bubble app matches
neither shape and is reported `unknown` rather than guessed at.

`service` reads `status.bubble.io` (a real Statuspage instance, confirmed via
`page.name: "Bubble"`, not the unclaimed-page decoy shape seen elsewhere in
this pack) — specifically its **Main Bubble Environment** component, the
shared runtime every Bubble app's own API depends on. The page also lists the
Bubble Editor, the community forum, imgix, Intercom and the AWS/Cloudflare
infrastructure Bubble itself depends on; none of those say anything about
whether *your* app's API is reachable, so this check does not use the page's
overall worst indicator.

## Errors

Two error shapes exist depending on the layer that rejected the request (see
"Two things the docs don't say" above): Data API errors nest under `body`
(`{"statusCode":404,"body":{"status":"…","message":"…"}}`), auth-layer errors
use the `error_class`/`translation` shape. `readErrorMessage` (`lib/client.ts`)
and `safeErrorMessage` normalise both — and deliberately refuse to surface
`translation`, since it can echo the credential that produced it.

## Icon

`assets/icon.svg` embeds Bubble's own icon
(`meta-q.cdn.bubble.io/f1534423790492x745180500205606300/icon_512x512@2x.png`,
1024×1024, the source behind bubble.io's own `<link rel="apple-touch-icon">`
tag) as a `data:image/png;base64` `<image>` inside an SVG wrapper — the same
approach `apollo`, `bannerbear`, `blandai`, `chatwork`, `dialpad` and others in
this pack use, because Bubble publishes no SVG mark: no `favicon.svg` (404),
no simple-icons entry (`title: "Bubble"` does not exist in `simple-icons.json`
— only `"Redbubble"` does), and no n8n `nodes-base` node. The artwork already
sits on an opaque white plate, so no separate dark-mode variant is needed.
