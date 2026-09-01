# Tableau

Sites, projects, workbooks, views and data sources on Tableau — either Tableau
Cloud or a self-hosted Tableau Server — through Tableau's REST API.

Every path, request/response field and permission note in this app was
verified against the vendor's own reference
(`help.tableau.com/current/api/rest_api`, fetched 2026-09-01). Each action and
auth file's header cites the specific reference page it was checked against.

## There is no vendor host

Tableau Cloud is **pod-hosted** — a site lives on one of many pods
(`10ax.online.tableau.com`, `us-east-1.online.tableau.com`, …) chosen when the
account was created — and Tableau Server is whatever address a customer gave
their own install. Neither is a fixed hostname this app can allowlist. So the
server address is a **connection field**, the same posture this pack already
uses for `gitea` and `mautic`, and `w6w.network.allow` is `["*"]`.

## Auth: a Personal Access Token is not a bearer credential here

Most API-key apps in this pack stamp the stored secret straight onto a
request. Tableau's PAT cannot: it has to be traded first, via
`POST /auth/signin`, for a short-lived **session** — a `token` sent back as
the `X-Tableau-Auth` header, plus the LUID of the site signed into. That
session is what every other call actually authenticates with, and it
**expires**: 240 minutes on Tableau Server, 120 on Tableau Cloud (both
configurable server/site-side). After that, Tableau answers `401` until a
fresh sign-in happens.

So the stored credential carries both halves:

- the durable PAT (`patName` / `patSecret`) — needed to sign in again;
- the live session (`token` / `siteId` / `userId` / `expiresAt`) — needed for
  every other request.

`sign` only ever stamps the session half onto outbound requests, and it never
reaches the network (the sandbox invariant every Auth method in this spec
follows). `refresh` re-runs the exact same sign-in `exchange` did — Tableau has
no separate "refresh token" grant for a PAT session, so signing in again *is*
the refresh. `revoke` calls `POST /auth/signout` on disconnect, best-effort.

A session is also scoped to **one site**: "you cannot sign in to one site and
then use the credentials token you get back to send requests to a different
site" (the vendor's own wording — it answers `403`). So the site's `contentUrl`
is asked for at connect time, and every action reads the resulting `siteId`
off the connection rather than taking one as a parameter a workflow could get
wrong.

### Connecting

1. In Tableau, go to **Settings → Personal Access Tokens** and create a token.
   Copy its name and secret (the secret is shown once).
2. In this app's connect form, give:
   - **Server URL** — Tableau Cloud: your pod's address (e.g.
     `10ax.online.tableau.com`, from the browser URL after signing in).
     Tableau Server: your organization's own address.
   - **Site** — the site's `contentUrl` segment (the part of the URL after
     `/#/site/`). Leave blank for Tableau Server's default site; Tableau Cloud
     always requires one.
   - **Personal Access Token Name** and **Secret** — from step 1.

## Two things Tableau's REST API does that are easy to miss

- **XML is the default response format; JSON is opt-in.** Every request this
  app makes sets `Accept: application/json`, confirmed against the "Query Data
  Sources" reference page, which publishes both shapes of the same response
  side by side.
- **A list of exactly one item is not a 1-element array.** Tableau's
  XML-to-JSON conversion mirrors the XML structure literally: `{ projects: {
  project: [...] } }` when there are several, but `{ projects: { project: {...}
  } }` — a bare object — when there is exactly one. `unwrapList` in
  `lib/client.ts` normalizes this once; every list action and `workbook-get`'s
  nested `views`/`tags` go through it. Pagination's own `pageNumber` /
  `pageSize` / `totalAvailable` attributes are also strings on the wire, not
  numbers — `readPagination` does that coercion.

## Health checks

| Check | Kind | What it answers |
|---|---|---|
| `instance` | `dependency` | Is **this connection's own server** reachable? `GET /serverinfo`, unauthenticated, pinned to API 2.4 (available since — every server this app can point at supports it) rather than the connection's negotiated `apiVersion`, and sent with no session header. This is deliberate: an idled-out session and a dead server must be distinguishable, and an unsigned probe against a fixed old version means neither an expired token nor a version mismatch can make a healthy server look down. |
| `service` | `service` | Declared absent. Tableau Server is self-hosted — there is no vendor platform behind it, `instance` already asks the only meaningful question. Tableau Cloud publishes no machine-readable status either: `status.tableau.com` does not resolve and `trust.tableau.com` redirects to the generic `trust.salesforce.com` hub (verified 2026-09-01, an HTML shell with no JSON/RSS/Atom found), which is also pod-hosted rather than behind one fixed feed anyway. |
| `auth:personal-access-token` | `credential` (derived) | Is the stored session (or the PAT that can renew it) still live? Projected automatically from the Auth `test` hook, which probes `GET /projects?pageSize=1` — the narrowest call every signed-in user can make without a server/site-administrator role. |

## Actions

- **Site** — `site-get` (admin-only; reads the connection's own site, never a
  parameter, since a session cannot cross sites).
- **Projects** — `project-list`, `project-create`, `project-delete`
  (confirmation-gated: deleting a project deletes everything published inside
  it).
- **Workbooks** — `workbook-list`, `workbook-get`, `workbook-delete`
  (confirmation-gated).
- **Views** — `view-list-for-site`, `view-list-for-workbook`,
  `view-image-get` (renders a view to PNG, returned as base64 — the sandbox
  has no filesystem to write an image to).
- **Data sources** — `datasource-list`, `datasource-get`,
  `datasource-refresh` (starts an immediate extract refresh job; does not wait
  for it to finish).
- **Users** — `user-list`, `user-get` (both admin-gated by Tableau itself for
  most accounts).

## Deliberately out of scope

- **Publishing workbooks or data sources.** Tableau's publish endpoints are
  multipart uploads with their own chunking rules for large files — a big
  enough surface to earn its own version rather than a partial
  implementation here.
- **Users, groups, schedules and permissions management.** The user actions
  here are read-only; creating/removing users, group membership, content
  permissions and refresh schedules are all admin surfaces this version does
  not touch.
- **The Metadata API (GraphQL).** A separate surface from the REST API this
  app implements.
- **Username/password and connected-app JWT sign-in.** Tableau documents both
  in addition to the PAT flow. A PAT is scoped, named and revocable without
  handing a workflow an account password, and a JWT sign-in needs a Tableau
  Connected App configured server-side — out of scope for a first version.
