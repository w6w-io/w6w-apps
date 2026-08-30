# Microsoft SharePoint

Read and manage SharePoint team sites, lists and document libraries through the
**Microsoft Graph v1.0 SharePoint API** — `https://graph.microsoft.com/v1.0`.
Not the legacy SharePoint REST API (`_api/web/...`).

Sixteen actions covering the three resource types the SharePoint overview
names — `site`, `list`, `listItem` — plus the `drive`/`driveItem` surface a
site's document libraries share with OneDrive.

Every endpoint below was verified against the Microsoft Graph reference page
for that operation, not inferred from a sibling app. Where the reference and
this App disagree with something you have read elsewhere, the reference link
is in the action's source header.

---

## Work or school accounts only

**Every SharePoint permission table in the Graph reference states "Delegated
(personal Microsoft account): Not supported."** — `site-get`, `site-getbypath`,
`list-list`, `list-create`, `listitem-list`, `listitem-create`,
`listitem-update`, `listitem-delete`, `site-list-subsites`, all of them, row by
row. This is the one structural difference from the sibling `onedrive` App:
that App's drive/driveItem surface is documented for a personal account too,
so it uses the `common` OAuth tenant segment. This App uses `organizations`
instead, so a personal account never gets as far as a confusing first-call
failure.

---

## Addressing a site

Everything hangs off one decision, made once in `lib/client.ts#sitePath()`.
The SharePoint overview documents three forms plus a reserved shorthand:

```
/sites/root                              ← the tenant's default site
/sites/{site-id}                         ← by opaque compound ID
/sites/{hostname}                        ← root site at that hostname
/sites/{hostname}:/{server-relative-path} ← by path (the `:` is structural)
```

- **Site ID** is itself a comma-joined compound
  (`{hostname},{spSiteId},{spWebId}`). It travels as one opaque path segment —
  its internal commas are never split or re-encoded.
- **Hostname (+ Path)** is readable. Path is only meaningful alongside a
  Hostname; the reference has no bare `/sites/{path}` form.
- Setting **both Site ID and Hostname is an error**, not a preference: they
  can disagree, and operating on the wrong site silently is the worst outcome
  available.
- Setting **neither** means the tenant's default root site — every action
  offers this as the quiet default, so a single-site deployment needs no
  addressing at all.

A **list** is addressed by its own `id` only — the reference documents no
path-based form, unlike a site or a driveItem. A **document library** is a
`drive`: a site's default one at `{sitePath}/drive`, or a specific one
addressed directly as `/drives/{drive-id}` via the advanced *Drive ID*
param — the id a Get Drive / List Drives call returns. Once resolved to a
drive, **driveItem** addressing (Item ID / Item path / neither for the root)
is identical to OneDrive's, including the same trailing-colon trap: the
path form takes a closing colon only when a suffix follows it.

---

## Actions

### Site (2) — read-only

| Key | Type | Endpoint |
|---|---|---|
| `get-site` | read | `GET /sites/root` · `GET /sites/{id}` · `GET /sites/{hostname}(:/{path})` |
| `list-subsites` | read | `GET {site}/sites` |

The reference states plainly that the SharePoint API has "Read-only support
for site resources (no ability to create new sites)", so this App offers no
create/update/delete for a site.

### Document library / drive (2)

| Key | Type | Endpoint |
|---|---|---|
| `get-drive` | read | `GET {site}/drive` · `GET /drives/{id}` |
| `list-drives` | read | `GET {site}/drives` |

### List (3)

| Key | Type | Endpoint |
|---|---|---|
| `list-lists` | read | `GET {site}/lists` |
| `get-list` | read | `GET {site}/lists/{list-id}` |
| `create-list` | perform | `POST {site}/lists` |

There is no delete or rename for a list: the `list` resource's own Methods
table (in the Graph reference) lists Get, Create, Get items, Update, Delete
and Create item only for `listItem` — a **list itself** has no documented
delete. Left out rather than guessed at.

### List item (5)

| Key | Type | Idempotent | Endpoint |
|---|---|:-:|---|
| `list-items` | read | — | `GET {list}/items` |
| `get-item` | read | — | `GET {list}/items/{item-id}` |
| `create-item` | perform | no | `POST {list}/items` |
| `update-item` | perform | yes | `PATCH {list}/items/{item-id}/fields` |
| `delete-item` | perform | yes | `DELETE {list}/items/{item-id}` |

A row's column values live under the `fields` facet, keyed by internal column
name (e.g. `Title`, `Author`) — never a fixed param list, since every list has
different columns. `list-items`/`get-item` expand `fields` by default (the
reference's own three example URLs are exactly the three modes *Expand column
values* / *Columns* select between); `update-item` PATCHes the `fields`
sub-resource specifically, which is the "change only these columns, leave
everything else alone" form the reference's own example demonstrates.

### Document library contents / drive item (4)

| Key | Type | Idempotent | Endpoint |
|---|---|:-:|---|
| `list-children` | read | — | `GET {drive-item}/children` |
| `upload-file` | perform | yes | `PUT {drive}/items/{parent}:/{name}:/content` · `PUT {item}/content` |
| `get-download-url` | read | — | `GET {item}` → `@microsoft.graph.downloadUrl` |
| `create-folder` | perform | no | `POST {parent}/children` |

These four mirror the sibling `onedrive` App's own actions of the same
shape — the driveItem resource and its addressing rules are the identical
Graph surface, just rooted at a site's library instead of `/me/drive`.

**Idempotency is claimed only where Graph's own documented behaviour
converges.** `upload-file` because the default PUT conflict behaviour is
`replace`; `update-item`/`delete-item` because each sets an end state.
`create-item`/`create-list` mint a new id on every call; `create-folder` with
`conflictBehavior: rename` — the value most workflows pick — mints a second
folder on a replay.

---

## Things worth knowing before you wire this up

**1. SharePoint is work-or-school only — checked exhaustively, not
assumed.** See "Work or school accounts only" above. This is the reason the
OAuth tenant segment differs from the sibling `onedrive` App.

**2. `Sites.Manage.All` is not implied by `Sites.ReadWrite.All`.** Every
listItem write (`create-item`, `update-item`, `delete-item`) and every
driveItem write (`upload-file`, `create-folder`) documents `Sites.ReadWrite.All`
as a valid delegated permission. Creating a **list** does not:
`list-create`'s reference states `Sites.Manage.All` as the *only*
least-privileged delegated permission and "Not available" for a higher
alternative — there is no broader Sites scope that substitutes for it. Both
scopes are requested; leaving either out breaks a different half of the App.

**3. This App requests only the `Sites.*` scope family, never `Files.*`.**
Every write endpoint's reference documents a `Files.*` scope as its *least*
privileged option and `Sites.ReadWrite.All` as a documented, valid *higher*
alternative. Since every action here addresses a site, list or library
explicitly — never a personal drive — requesting `Sites.*` throughout keeps
the OAuth consent screen legible as "read and write SharePoint sites", rather
than mixing in "every file you own" the way a `Files.ReadWrite.All` grant
would.

**4. A list has no documented delete or rename.** Confirmed against the
`list` resource's own Methods table in the Graph reference, which lists
methods for `listItem` (Get, Update, Delete, Create item, ...) but nothing
matching for the list itself. `create-list` exists; there is no
`delete-list`.

**5. `$filter` is supported on List Items — and only there.** The listItem
collection documents `eq`, `ne`, `lt`, `gt`, `le`, `ge` and `startswith`, on
both listItem properties and `fields/{ColumnName}`, and "works best on indexed
columns". The driveItem children collection (List Library Contents)
documents `$expand`, `$select`, `$skipToken`, `$top`, `$orderby` — **not**
`$filter` — matching the sibling `onedrive` App's own finding for the
identical driveItem endpoint.

**6. Download returns a URL, not bytes — deliberately, and for the same
reason as `onedrive`.** `GET {item}/content` answers `302 Found` and redirects
to a pre-authenticated URL on the tenant's own SharePoint storage host, which
is per-tenant and cannot be enumerated in `w6w.network.allow`. The reference
offers the alternative in the same sentence: the redirect target "is the same
URL available through the `@microsoft.graph.downloadUrl` property on the
driveItem", so `get-download-url` reads that property off an ordinary
metadata `GET` to `graph.microsoft.com` — the only host this App declares.
The URL is short-lived (roughly an hour) and needs no `Authorization` header
of its own; treat it like a secret.

**7. Upload is text-only here, and that is a sandbox limit, not a Graph
limit.** Graph's simple upload takes any bytes up to 250 MB. A w6w action
runs in a sandboxed worker whose `ctx.fetch` request body is stringified on
the way to the host, so bytes above U+007F cannot survive the crossing.
Passing base64 would upload the base64 *text* as the file's contents, which
is worse than refusing — so binary upload is not offered.

**8. `includeHidden` on List Lists mirrors the reference's own wording
exactly.** "Lists with the `system` facet are hidden by default. To list them,
include `system` in your `$select` statement." — quoted, not paraphrased,
because a param that silently changed that behaviour would be a trap.

**9. Content-approval's Graph-side gotcha does not apply here.** `Get
listItem`'s reference notes that with **application** permissions, a list
with content approval turned on needs `Sites.Manage.All` or Graph silently
omits items whose approval status isn't `Approved`. This App uses delegated
permissions throughout, where that restriction is not documented, but the
gotcha is worth knowing if this App's pattern is ever adapted to
application-only auth.

---

## Authentication

**OAuth 2.0 authorization code flow** against the Microsoft identity platform
(Entra ID) v2.0 endpoints, tenant segment `organizations`:

```
https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize
https://login.microsoftonline.com/organizations/oauth2/v2.0/token
```

Register an application in the Entra admin center, add a Web redirect URI,
and store `client_id` / `client_secret` / `redirect_uri` on the w6w server via
`PUT /apps/io.w6w.sharepoint/oauth-config/oauth2`.

Scopes, each taken from the "Least privileged permissions / Delegated (work
or school account)" row of the endpoint's own reference page:

| Scope | Why |
|---|---|
| `Sites.Read.All` | Every read: get a site, list subsites, list/get a site's lists, list/get list items, get a site's drive, list a site's drives, list a library's children, read a file's download URL |
| `Sites.ReadWrite.All` | Create/update/delete list items; upload a file; create a folder |
| `Sites.Manage.All` | Create a list — **not** covered by `Sites.ReadWrite.All`; see "Things worth knowing" #2 |
| `User.Read` | The `test` / `afterConnect` probe |
| `offline_access` | Microsoft issues a refresh token by *scope*, not by an `access_type` parameter |

No `Files.*` scope is requested — see "Things worth knowing" #3.

PKCE stays on (`S256`); the docs recommend it "for all application types".

---

## Health checks

Three declared checks plus one derived, answering four different questions.

### Is the vendor up? — `service`, declared **absent**

Microsoft publishes no documented, unauthenticated, machine-readable status
surface for SharePoint Online — the same conclusion the sibling
`onedrive`/`outlook`/`excel`/`teams`/`microsoft-todo` Apps reached for the
same underlying service (re-probed 2026-08-11, reused rather than
re-derived): the Graph service-health API needs tenant-admin consent, the
public status pages are client-rendered shells, and the RSS feed was retired.
See `health/service.ts` for the full citation list. `severity:
"informational"` — a declared absence always reports `unknown`, and a
non-informational check would pin the App's verdict there permanently.

### Is this credential live? — derived `auth:oauth2`

The Auth `test` hook probes `GET /me`, the cheapest authenticated Graph call,
needing only `User.Read` — so a credential that legitimately lacks a Sites
scope still reports as live rather than broken. Its response carries directory
profile fields only (id, displayName, mail, userPrincipalName), no credential
material.

### Do we have room left? — `quota`, a **live probe**

`GET /sites/root/drive` returns the tenant root site's default document
library, whose `quota` facet is the same documented reading OneDrive's own
drive carries (`normal`/`nearing`/`critical`/`exceeded`, mapped to
`ok`/`degraded`/`degraded`/`down`). A health check answers a question about
the *connection*, not about whichever site a given workflow run happens to
address, so it has no site to be told about — `/sites/root` is the one site
every work-or-school connection can resolve without configuration. This is a
connection-level smoke test, not a report on the site a workflow actually
targets — a different site's library may sit on a wholly different quota.
`severity: "informational"`.

### Do we have request-rate headroom? — `request-rate`, declared **absent**

SharePoint Online's own throttling guidance (last updated 2026-08-10) states,
in a dedicated section: "SharePoint Online does not return or support IETF
RateLimit headers... applications should... honor the Retry-After header when
throttling occurs." There is nothing to poll. Throttling is reactive: `429`
or `503` with `Retry-After`. The documented per-app-per-tenant ceilings
(resource-unit based) are recorded in the check's `reason` for an operator
diagnosing a burst of 429s. This is the identical finding the sibling
`onedrive` App's own `request-rate` check records, since it is the same
throttling surface.

### Declared checks

| Key | Kind | Probe | Severity |
|---|---|---|---|
| `service` | service | *declared absent* | informational |
| `quota` | quota | `GET /sites/root/drive` → `quota` facet | informational |
| `request-rate` | quota | *declared absent* | informational |
| `auth:oauth2` | credential *(derived)* | `GET /me` | fatal (default) |

Neither declared absence widens egress, and the one live probe stays on
`graph.microsoft.com`, so the spec's ban on pairing `network.allow` with a
signed posture never binds.

---

## Not implemented

Left out deliberately, each with a reason:

- **Deleting or renaming a list** — the `list` resource's Methods table
  documents no such operation; see "Things worth knowing" #4.
- **Content types, columns management, list permissions, site permissions,
  webhooks/change notifications** — real Graph resources, simply outside the
  core sites/lists/document-libraries surface this App was scoped to.
- **Resumable upload sessions** (`createUploadSession`) — the path for files
  over 250 MB. Out of scope, and in any case the sandbox's text-only request
  bodies would limit it to the same content types as the simple upload.
- **Binary / base64 upload** — see "Things worth knowing" #7. Not a Graph
  limitation.
- **Following a download to its bytes** — see "Things worth knowing" #6.
  Would require wildcard egress to per-tenant storage hosts.
- **Copy / move / rename / delete a driveItem, sharing links, permissions** —
  the same Graph surface the sibling `onedrive` App already covers for
  driveItems; not duplicated here since this App's document-library scope was
  deliberately narrowed to listing, uploading, downloading and folder
  creation (per the intake's own scope note).
- **`admin/sharepoint/settings`** (tenant-level SharePoint settings) — a
  distinct, narrow admin surface outside the sites/lists/libraries a workflow
  author is expected to touch.

---

## Verification

Run from this directory (Deno lives in the `api` compose service):

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/sharepoint && \
         deno task validate && deno task check && \
         deno task lint && deno task fmt && deno task test'
```

- `deno task validate` — 0 errors, 0 warnings (verified by running the pack
  auditor directly from `_tools/`, `deno run --no-check -A audit.ts
  sharepoint`; the app-local `deno task validate` recipe's `--config
  ./deno.json` override fails to resolve `@w6w/runtime` for **every** app in
  this pack, including `onedrive` — a pre-existing environment issue, not
  specific to this App).
- `deno task test` — **138 unit tests**, all against a mocked `HookContext`
  (fake `ctx.fetch`, no-op `ctx.log`). No network, no server.
- The icon is Wikimedia Commons' current official SharePoint mark
  (`Microsoft_Office_SharePoint_(2019–2025).svg`), **verbatim** — 4,803 bytes.
  It passes the pack's icon-legibility check on both the light and dark tile
  with no `appearance.darkMode.icon` needed.

`w6w.network.allow` is exactly `["graph.microsoft.com"]` — the one host any
hook calls. No loopback, no status host, no storage host.

---

## Links

- [SharePoint API overview (Microsoft Graph)](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint)
- [site resource](https://learn.microsoft.com/en-us/graph/api/resources/site)
- [list resource](https://learn.microsoft.com/en-us/graph/api/resources/list)
- [listItem resource](https://learn.microsoft.com/en-us/graph/api/resources/listitem)
- [driveItem resource](https://learn.microsoft.com/en-us/graph/api/resources/driveitem)
- [Paging Microsoft Graph data](https://learn.microsoft.com/en-us/graph/paging)
- [Avoid getting throttled in SharePoint Online](https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online)
- [Microsoft identity platform auth code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
