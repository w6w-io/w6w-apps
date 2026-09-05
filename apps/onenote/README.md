# Microsoft OneNote

Read and manage OneNote notebooks, sections, section groups and pages through
the **Microsoft Graph v1.0 OneNote API** — `https://graph.microsoft.com/v1.0`.

Fifteen actions covering the four resource types the OneNote API overview
names — `notebook`, `onenoteSection`, `sectionGroup`, `onenotePage` — at any of
the four `{location}` roots the reference documents (`me`, another `user`, a
`group`, or a SharePoint `site`).

Every endpoint below was verified against the Microsoft Graph reference page
for that operation, not inferred from a sibling app. Where the reference and
this App disagree with something you have read elsewhere, the reference link
is in the action's source header.

---

## Personal accounts ARE supported — unlike the sibling `sharepoint`/`excel` apps

This is the one fact most likely to cost a day if assumed rather than checked.
The sibling `sharepoint` and `excel` Apps in this pack are work-or-school only
— every one of their permission tables states "Delegated (personal Microsoft
account): Not supported." **OneNote is the opposite.** Its own API overview
opens with:

> "Microsoft Graph lets your app get authorized access to a user's OneNote
> notebooks, sections, and pages in a **personal or organization account**."

and every single permission table for every endpoint in this App — Get
Notebook, List Notebooks, Create Page, Update Page content, Delete Page, all
of them — carries a non-empty "Delegated (personal Microsoft account)" row.
That is why this App's OAuth flow uses the `common` tenant segment, the same
choice the sibling `onedrive` App makes and for the identical reason —
matching what "OneNote" means to a user with a personal Microsoft account.

The one thing OneNote does **not** support at all, on either account type, is
**app-only (client-credentials) authentication** — the overview says so in a
dedicated note — so this App offers only the delegated `oauth2` method.

---

## Addressing: four locations, three nestable containers

Every call is rooted at `{version}/{location}/onenote/...`. `lib/client.ts`
picks the location once, in `onenoteBase()`:

```
/me/onenote                          ← the signed-in user
/users/{id | userPrincipalName}/onenote  ← another user who shared with them
/groups/{id}/onenote                 ← a Microsoft 365 group's notebooks
/sites/{id}/onenote                  ← a SharePoint site's notebooks
```

Unlike the sibling `sharepoint` App's site addressing, a site here takes only
the opaque `id` form — the OneNote reference's HTTP request lines never show a
hostname/path alternative.

Inside a location, a `notebook` holds `sections` and `sectionGroups`; a
`sectionGroup` holds more `sections` and `sectionGroups`; a `section` holds
`pages`. Every one of those collections is ALSO reachable flat — `GET
/onenote/sections` returns every section in the location regardless of which
notebook owns it. `containerBase()` in `lib/client.ts` picks between "under
this notebook", "under this section group" and "flat" from whichever id the
caller supplied, and refuses both container ids at once: they can name
different parents, and silently preferring one is worse than asking.

**On a SharePoint site, a `sectionGroup` really is a folder object.** The
`onenote-list-sectiongroups` reference calls this out explicitly: the flat,
site-rooted listing returns every subfolder in the site's pages folder,
OneNote-owned or not, unless you add `$filter=parentNotebook ne null`. List
Section Groups exposes this as the **OneNote section groups only** toggle
rather than always appending the filter, since the flat form doubles as the
`me`/`users`/`groups` listing too, where the filter is a no-op.

---

## Actions

### Notebook (3) — create-only past creation

- **List Notebooks**, **Get Notebook**, **Create Notebook**.
- The `notebook` resource's own Methods table lists Get / Get recent notebooks
  / Get from web / Create section(s) / List section(s) / Copy — **no update,
  no delete** — so none is offered here.

### Section (3)

- **List Sections** (flat, under a notebook, or under a section group), **Get
  Section**, **Create Section** (under a notebook OR a section group — exactly
  one parent, never both, never neither).
- Same story as notebooks: the `onenoteSection` resource documents Get /
  Create page / List pages / Copy to notebook / Copy to section group — no
  rename, no delete.

### Section group (3)

- **List Section Groups**, **Get Section Group**, **Create Section Group**
  (nested one level deeper when Section Group ID is the parent).
- Same again: Get / Create section group / List section groups / Create
  section / List sections — no rename, no delete.

### Page (6) — the one resource with a full write surface

- **List Pages** (flat, most-recently-modified first, default 20/page,
  max 100; or scoped to a Section ID), **Get Page** (metadata only), **Get
  Page Content** (the actual HTML — a separate call, see below), **Create
  Page**, **Update Page Content**, **Delete Page**.

---

## Things worth knowing before you wire this up

1. **Page content is HTML, not JSON — reading AND writing.** `GET
   .../pages/{id}/content` answers `text/html` directly; `POST` to create a
   page expects the request body to itself BE the HTML
   (`Content-Type: text/html`), not a JSON envelope. `GraphClient.html()` and
   `GraphClient.postHtml()` in `lib/client.ts` exist specifically because the
   generic `request()` helper's `res.json()` would silently return
   `undefined` for either shape.

2. **A page's title is not a field you set — it's parsed out of your HTML.**
   There is no `title` param on Create Page. The reference's own examples wrap
   the page in a full `<html><head><title>…</title></head><body>…</body></html>`
   document and Graph reads the title from `<title>`.

3. **Binary/multipart uploads are out of scope, on purpose.** The reference
   documents a `multipart/form-data` form for embedding image/file bytes
   directly in a Create Page request. This App does not offer it: a w6w
   Action's sandboxed `ctx.fetch` carries its request body to the host as
   text (`core/packages/runtime/src/sandbox/worker.ts`), so bytes above
   U+007F do not survive that crossing intact — the identical limitation the
   sibling `sharepoint` App's Upload File action documents for the same
   reason. A remote `<img src="https://...">` still works fine when
   *creating* a page.

4. **That same remote-image trick does NOT work for an UPDATE.** Microsoft's
   own "Update OneNote pages" guide states plainly: "When updating an image on
   a OneNote page, you can't use www links. The service won't try to download
   random resources." An update's `<img>` content must be a data URL or a
   multipart part-name — neither of which this App's HTML-only PATCH body can
   carry — so image-adding *updates* are unsupported even though image-adding
   *creates* are fine. This asymmetry is easy to miss and easy to lose an
   afternoon to.

5. **The Graph permission tables' "least privileged" column is, for OneNote,
   actively misleading if read literally.** Nearly every read/create
   endpoint's least-privileged delegated scope is `Notes.Create` — which reads
   backwards until you notice what it actually grants: access restricted to
   content **the connecting app itself created**, not the notebooks the user
   already had. A credential connected with only `Notes.Create` lists zero
   pre-existing notebooks. This App requests `Notes.ReadWrite` instead — the
   narrowest scope that also reaches content that predates the connection, and
   the *only* scope Update Page Content and Delete Page's own tables offer at
   all (neither lists a `Notes.Create` row). See `auth/oauth2.ts` for the full
   citation trail.

6. **`GET /onenote/pages` (flat) defaults to `$top=20`, sorted by
   `lastModifiedDateTime desc`, and `$top` maxes out at 100 per request** — a
   naive "list all pages" call silently returns only the 20 most recent unless
   the workflow paginates or sets a larger `$top`. `List Pages` exposes both.

7. **`sectionName` on the flat Create Page endpoint auto-creates a section if
   none by that name exists**, rather than failing — and it only ever targets
   the *current user's default notebook*, regardless of what else is set. To
   create a page in an arbitrary notebook, address the section by **Section
   ID** instead (`POST .../sections/{id}/pages`), which reaches any section
   the credential can reach.

---

## Authentication

**OAuth (Sign in with Microsoft)** — the delegated authorization-code flow
against the Microsoft identity platform v2.0 endpoints, `common` tenant
segment (see above). Scopes: `offline_access` (refresh token), `User.Read`
(the `test`/`afterConnect` probe — cheap, needs no OneNote-specific scope, the
same choice the sibling `onedrive`/`excel`/`sharepoint` Apps make),
`Notes.ReadWrite` (every notebook/section/sectionGroup/page read, create,
update and delete in this App).

`test` probes `GET /me` rather than `GET /me/onenote/notebooks`, deliberately:
a brand-new OneNote account with zero notebooks would otherwise look
indistinguishable from a dead credential. `/me`'s response carries directory
profile fields only (id, displayName, mail, userPrincipalName) — no token, key
or secret of any kind, satisfying the "don't echo the credential" rule.

---

## Health checks

Two declared checks, both **absent**, plus one derived.

### Is the vendor up? — `service`, declared **absent**

Microsoft publishes no documented, unauthenticated, machine-readable status
surface for OneNote — the same conclusion the sibling
`onedrive`/`outlook`/`excel`/`sharepoint` Apps reached for the underlying
Microsoft 365 platform (re-probed 2026-09-05: `status.cloud.microsoft` still
returns the identical 2,058-byte HTML shell for its root and for an invented
path; `status.office365.com/api/v2/status.json` still 301s back to it;
`portal.office.com/servicestatus` and `admin.microsoft.com/servicestatus`
still 302 into it; the Graph service-health API still needs tenant-admin
consent and is unsupported for personal accounts; the RSS feed is still
retired). OneNote adds its own wrinkle on top: a personal account's notebooks
live on consumer OneDrive while a work-or-school account's live on
Exchange/SharePoint infrastructure, so even a hypothetical single feed
couldn't speak for every connection. `severity: "informational"`.

### Is this credential live? — derived `auth:oauth2`

The Auth `test` hook probes `GET /me` — see Authentication above.

### Do we have request-rate headroom? — `quota`, declared **absent**

More conclusively absent than the sibling Graph Apps' own declared-absent
quota checks. Graph's throttling reference lists OneNote's ceilings
explicitly — 120 requests/minute and 400/hour per app per user (delegated) —
but states in the same breath that the OneNote resources "don't return a
Retry-After header on 429 Too Many Requests responses." The sibling
`sharepoint`/`outlook` Apps' absent quota checks at least get a `Retry-After`
hint once actually throttled; OneNote gives neither a proactive signal nor
that reactive one. See `health/quota.ts` for the full citation, including the
[OneNote API throttling blog post](https://developer.microsoft.com/en-us/office/blogs/onenote-api-throttling-and-how-to-avoid-it/)
Microsoft's own reference links for mitigation advice. `severity:
"informational"`.

### Declared checks

| Key | Kind | Probe | Severity |
|---|---|---|---|
| `service` | service | *declared absent* | informational |
| `quota` | quota | *declared absent* | informational |
| `auth:oauth2` | credential *(derived)* | `GET /me` | fatal (default) |

Both declared absences widen no egress; the App's only host is
`graph.microsoft.com`.

---

## Not implemented

Left out deliberately, each with a reason:

- **Copy notebook / Copy section (to notebook or section group) / Copy page
  (to section)** — all three are documented as ASYNCHRONOUS operations (`202
  Accepted` + an `Operation-Location` header to poll), a pattern no other App
  in this pack implements; adding a bespoke poll-loop for OneNote alone was
  judged out of scope for this pass rather than invented ad hoc.
- **`getRecentNotebooks`** — a real, documented function
  (`notebooks/getRecentNotebooks(includePersonalNotebooks=...)`), left out to
  keep the notebook surface to the core CRUD-shaped operations; List Notebooks
  already covers "what notebooks exist".
- **Renaming or deleting a notebook, section or section group** — none is
  documented; see "Actions" above.
- **The `onenoteResource` (image/file) binary-content endpoint**
  (`GET /onenote/resources/{id}/content`) — real, but only reachable by
  parsing a page's own HTML for a resource URL first, and this App's
  `get-page-content` already returns that HTML for a caller to parse
  themselves if they need to walk it.
- **Multipart/binary upload on Create Page** — see "Things worth knowing" #3.
  Not a Graph limitation.
- **`groups`/`sites` location support beyond addressing** — this App lets any
  action target a group or site location (`Location` / `Location ID` params),
  but does not add group- or site-specific conveniences (e.g. resolving a
  SharePoint site by hostname) beyond the `id` form the OneNote reference
  itself documents.

---

## Verification

Run from this directory (Deno lives in the `api` compose service):

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/onenote && \
         deno task validate && deno task check && \
         deno task lint && deno task fmt && deno task test'
```

- `deno task test` — unit tests, all against a mocked `HookContext` (fake
  `ctx.fetch`, no-op `ctx.log`). No network, no server.
- The icon is `simple-icons`' `microsoftonenote.svg`, **verbatim** — 574
  bytes, md5 `97a5cab01e95c0912017eabd6911a3dd`,
  `<title>Microsoft OneNote</title>`. `deno task fmt` is scoped to the source
  directories and does not touch `assets/`; a bare `deno fmt` would rewrite
  the SVG and falsify that claim.

`w6w.network.allow` is exactly `["graph.microsoft.com"]` — the one host any
hook calls. No loopback, no status host.

---

## Links

- [OneNote API overview (Microsoft Graph)](https://learn.microsoft.com/en-us/graph/api/resources/onenote-api-overview)
- [onenote resource](https://learn.microsoft.com/en-us/graph/api/resources/onenote)
- [notebook resource](https://learn.microsoft.com/en-us/graph/api/resources/notebook)
- [onenoteSection resource](https://learn.microsoft.com/en-us/graph/api/resources/onenotesection)
- [sectionGroup resource](https://learn.microsoft.com/en-us/graph/api/resources/sectiongroup)
- [onenotePage resource](https://learn.microsoft.com/en-us/graph/api/resources/onenotepage)
- [Update OneNote pages](https://learn.microsoft.com/en-us/graph/onenote-update-page)
- [Graph throttling limits (OneNote section)](https://learn.microsoft.com/en-us/graph/throttling-limits)
- [OneNote API throttling and how to avoid it](https://developer.microsoft.com/en-us/office/blogs/onenote-api-throttling-and-how-to-avoid-it/)
