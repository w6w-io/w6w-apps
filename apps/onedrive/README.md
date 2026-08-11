# Microsoft OneDrive

Browse, upload, move, share and search files in Microsoft OneDrive through the
**Microsoft Graph v1.0** drive API — `https://graph.microsoft.com/v1.0`.

Eighteen actions covering the drive/driveItem surface: drives, listing, reading,
searching, change tracking, folder creation, simple upload, copy, move, rename,
delete, sharing links and permissions.

Every endpoint below was verified against the Microsoft Graph reference page for
that operation, not inferred from a sibling app. Where the reference and this App
disagree with something you have read elsewhere, the reference link is in the
action's source header.

---

## Which OneDrive is this for?

OneDrive is three products behind one API, and the differences are real:

| | `driveType` | What it is | This App |
|---|---|---|---|
| **OneDrive personal** | `personal` | A consumer Microsoft account's drive | Supported |
| **OneDrive for Business** | `business` | A work/school account's drive | Supported |
| **SharePoint document library** | `documentLibrary` | A site's library, reached by drive id | Supported |

**Every endpoint this App calls is documented for delegated *personal Microsoft
account* access as well as work/school**, which is why the OAuth tenant segment
is `common` rather than the `organizations` its sibling `excel` App must use (the
Excel workbook API genuinely does not serve consumer OneDrive; the drive API
does).

What differs by drive type, all of it surfaced in param hints rather than
discovered at runtime:

- **Sharing link `scope: organization`** exists only on OneDrive for Business and
  SharePoint. **`type: embed`** exists only on OneDrive personal.
- **A sharing link password** is "Optional and OneDrive Personal only".
- **`@microsoft.graph.conflictBehavior` on Copy Item** "isn't supported for
  OneDrive Consumer".
- **`driveItem.description`** is writable on personal OneDrive and is not
  surfaced on business or SharePoint-backed drives.
- **The `quota` facet's `state`** is reported by personal and business drives;
  a SharePoint library on an unlimited plan may omit it, and the health check
  falls back to the byte counts there.
- **`includeDeletedItems=true`** on Get Item is OneDrive-personal only, and is
  therefore not offered as a param.

Reaching a drive **other than the signed-in user's own** — a colleague's, or a
SharePoint library — is what the advanced *Drive ID* param is for. It needs the
broader `Files.ReadWrite.All` consent, which this App requests.

---

## Addressing an item

Everything hangs off one decision, made once in `lib/client.ts#itemPath()`. Graph
documents two ways to point at a driveItem plus a root shorthand, and they
compose with a drive prefix:

```
/me/drive/items/{item-id}{suffix}          ← Item ID
/me/drive/root:/{item-path}:{suffix}       ← Item path (the `:` are structural)
/me/drive/root{suffix}                     ← neither: the drive's root folder
/drives/{drive-id}/…                       ← any of the above, in another drive
```

- **Item ID** survives renames and moves. Get it from List Children, Search
  Items, or Get Item on a path.
- **Item path** is readable and breaks the moment the file moves.
- Setting **both is an error**, not a preference: they can disagree, and
  operating on the wrong file silently is the worst outcome available.
- Setting **neither** means the drive root, and is only offered where that is
  meaningful (List Children, Get Item, Create Folder, Upload File). Delete,
  rename, copy and the sharing actions refuse it with a legible error.

The trap this hides: the path form takes a **closing colon only when something
follows it**. `…/root:/Reports/Q3.pdf:/permissions` is right;
`…/root:/Reports/Q3.pdf:` with nothing after it is rejected by Graph. Path
segments are percent-encoded individually so `/` separators survive.

---

## Actions

### Drive (2)

| Key | Type | Endpoint |
|---|---|---|
| `list-drives` | read | `GET /me/drives` |
| `get-drive` | read | `GET /me/drive` · `GET /drives/{id}` |

`get-drive` returns the `quota` facet the health check reads. Note that
requesting `/me/drive` with delegated auth **provisions** the drive if the user is
licensed but has never opened OneDrive — a first read can be a write.

### Item — read (6)

| Key | Type | Endpoint |
|---|---|---|
| `list-children` | read | `GET {item}/children` |
| `get-item` | read | `GET {item}` |
| `search-items` | search | `GET {drive}/root/search(q='…')` |
| `list-changes` | read | `GET {drive}/root/delta` |
| `list-shared-with-me` | read | `GET /me/drive/sharedWithMe` |
| `get-download-url` | read | `GET {item}` → `@microsoft.graph.downloadUrl` |

### Item — write (6)

| Key | Type | Idempotent | Endpoint |
|---|---|:-:|---|
| `create-folder` | perform | no | `POST {parent}/children` |
| `upload-file` | perform | yes | `PUT {parent}:/{name}:/content` · `PUT {item}/content` |
| `copy-item` | perform | no | `POST {item}/copy` |
| `move-item` | perform | yes | `PATCH {item}` (`parentReference`) |
| `rename-item` | perform | yes | `PATCH {item}` (`name`) |
| `delete-item` | perform | yes | `DELETE {item}` |

### Sharing and permissions (4)

| Key | Type | Idempotent | Endpoint |
|---|---|:-:|---|
| `create-link` | perform | yes | `POST {item}/createLink` |
| `list-permissions` | read | — | `GET {item}/permissions` |
| `delete-permission` | perform | yes | `DELETE {item}/permissions/{id}` |
| `send-sharing-invite` | perform | no | `POST {item}/invite` |

**Idempotency is claimed only where Graph's own documented behaviour converges.**
`upload-file` because "the default for PUT is `replace`"; `create-link` because
Graph answers `200 OK` with the *existing* link on a repeat; move/rename/delete
because each sets an end state. `create-folder` is not idempotent because
`conflictBehavior: rename` — the value most workflows pick — mints a second
folder; `copy-item` enqueues a second copy; `send-sharing-invite` emails everyone
again.

---

## Things worth knowing before you wire this up

**1. `conflictBehavior` travels in two different places, and Microsoft's docs
contradict each other about it.** The create-children reference puts
`@microsoft.graph.conflictBehavior` in the JSON body (its own example does). The
copy reference documents it as a **query parameter**. The driveItem resource page
says flatly that it "should be included in the URL instead of the body of the
request". This App follows **each endpoint's own page**: body for Create Folder,
query string for Copy Item. Both are asserted in the tests so the split is
deliberate rather than drift.

**2. Copy is asynchronous, and its progress endpoint is on a host we do not
declare.** `POST {item}/copy` answers `202 Accepted` with an empty body and a
`Location` header pointing at
`https://<tenant>.sharepoint.com/_api/v2.0/monitor/…`. Nothing is copied when the
call returns and there is no new item id. Per-tenant hostnames cannot be
enumerated in `w6w.network.allow`, so **this App returns the monitor URL and never
polls it**. A workflow that must wait should poll with List Children or Get Item.

**3. Download returns a URL, not bytes — deliberately.**
`GET {item}/content` answers `302 Found` and redirects to a pre-authenticated URL
on a tenant storage host (`*.sharepoint.com`, `*.files.1drv.com`). Following it
would mean widening this App's egress to a wildcard for every download. The
reference offers the alternative in the same sentence: the redirect target "is
the same URL available through the `@microsoft.graph.downloadUrl` property on the
driveItem". So `get-download-url` reads that property off an ordinary metadata
`GET` to `graph.microsoft.com`, the only host this App declares. Two consequences:

- The URL is **short-lived** (the reference says roughly an hour), so it is
  fetched per run and never cached.
- It needs **no `Authorization` header** — it is a bearer capability in its own
  right. Treat it like a secret; hand it to the next step rather than logging it.
  Note also that revoking a permission "might not immediately invalidate the URL".

**4. Upload is text-only here, and that is a sandbox limit, not a Graph limit.**
Graph's simple upload takes any bytes up to **250 MB** (the widely-repeated 4 MB
figure is from an older revision of that page). But a w6w action runs in a
sandboxed worker whose `ctx.fetch` request body is stringified on the way to the
host (`core/packages/runtime/src/sandbox/worker.ts` does `String(init.body)`), so
bytes above U+007F cannot survive the crossing. Offering a base64 param would
upload the *base64 text* as the file's contents, which is worse than refusing —
so binary upload is not offered. Response bodies cross back as bytes, so the
asymmetry affects uploads only.

**5. `$filter` is not supported on any collection this App touches.** The
children, search and delta references each enumerate their query options
(`$select`, `$expand`, `$top`, `$orderby`, `$skipToken`) and `$filter` is on none
of them. No action declares a filter param, and a test enforces that.

**6. You cannot move an item to the drive root by name.** The move reference:
"your app can't use the `id: root` syntax. Your app needs to provide the actual ID
of the root folder". Run Get Item with nothing addressed to obtain it.

**7. `sharedWithMe` results live in someone else's drive.** Each entry carries a
`remoteItem` facet holding the real `parentReference.driveId` and item id — those
are the values to feed downstream. The top-level `id` is a shortcut in your own
drive. It is also the one call `Files.ReadWrite` alone cannot make (it needs
`Files.Read.All` at minimum), and the one with no `/drives/{id}` form in v1.0,
which is why it takes no *Drive ID* param.

**8. Delta pages differently from everything else.** `@odata.nextLink` and
`@odata.deltaLink` are mutually exclusive: while pages remain you get the former,
and the delta link appears only when the round closes. That is why *Fetch all
pages* defaults **on** for List Changes and off everywhere else — a single page
usually returns no delta link at all. Delta is also the cheapest way to scan a
drive: SharePoint prices a delta request *with* a token at 1 resource unit, half
the cost of the equivalent listing.

**9. Search is not a filename filter.** It matches "across several fields
including filename, metadata, and file content", and there is no documented way to
restrict it to names. Apostrophes in the term are doubled for you, per OData.

**10. Permission calls are the most expensive things here.** SharePoint's
throttling model prices all permission operations — including `$expand=permissions`
— at **5 resource units**, against 2 for a folder listing and 1 for a single-item
read.

---

## Authentication

**OAuth 2.0 authorization code flow** against the Microsoft identity platform
(Entra ID) v2.0 endpoints, tenant segment `common`:

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize
https://login.microsoftonline.com/common/oauth2/v2.0/token
```

Register an application in the Entra admin center, add a Web redirect URI, and
store `client_id` / `client_secret` / `redirect_uri` on the w6w server via
`PUT /apps/io.w6w.onedrive/oauth-config/oauth2`.

Scopes, each taken from the "Least privileged permissions / Delegated" row of the
endpoint's own reference page:

| Scope | Why |
|---|---|
| `Files.ReadWrite` | The signed-in user's own drive — every read and write here |
| `Files.ReadWrite.All` | `sharedWithMe` (needs `Files.Read.All` minimum) and any drive addressed by id |
| `User.Read` | The `test` / `afterConnect` probe |
| `offline_access` | Microsoft issues a refresh token by *scope*, not by an `access_type` parameter |

`Files.ReadWrite.All`'s **delegated** form requires no admin consent and is
available on personal Microsoft accounts, so requesting it does not narrow who can
connect. `Sites.ReadWrite.All` is listed by the reference as a further alternative
for SharePoint-backed drives and is deliberately **not** requested —
`Files.ReadWrite.All` already covers "all files the signed-in user can access", and
a tenant that has restricted that adds the site permission to its own app
registration.

PKCE stays on (`S256`); the docs recommend it "for all application types".

---

## Health checks

Three declared checks plus one derived, answering four different questions.

### Is the vendor up? — `service`, declared **absent**

Microsoft publishes no documented, unauthenticated, machine-readable status
surface for OneDrive or SharePoint Online. This is the conclusion the sibling
`outlook`, `excel`, `teams` and `microsoft-todo` Apps reached; it was **re-probed
on 2026-08-11** rather than copied, and every candidate still fails:

| Surface | Measured | Why it is not usable |
|---|---|---|
| `GET /admin/serviceAnnouncement/healthOverviews` | — | Needs `ServiceHealth.Read.All` with tenant-admin consent; unsupported for personal accounts |
| `https://status.cloud.microsoft/` | `200 text/html`, 2,058 bytes | Client-rendered shell |
| `https://status.cloud.microsoft/api/v1/status` (invented path) | `200 text/html`, **2,058 bytes** | The *same* shell — proof that a 200 here is not an endpoint |
| `https://status.cloud.microsoft/api/v2/status.json` | `401` | Not public |
| `https://status.office365.com/api/v2/status.json` | `301` | Redirects to the shell above |
| `https://portal.office.com/servicestatus` | `302`, 183 bytes | Redirects into the shell |
| `https://admin.microsoft.com/servicestatus` | `302`, 183 bytes | Same |
| Service Health Dashboard RSS | — | Retired |

Declared with `severity: "informational"`, because an `unavailable` entry always
reports `unknown`, and `unknown` outranks `ok` in the roll-up — at any other
severity this App's verdict would be pinned at `unknown` forever. Outages surface
to this App as 5xx from `graph.microsoft.com`.

### Is this credential live? — derived `auth:oauth2`

The Auth `test` hook probes `GET /me`, the cheapest authenticated Graph call,
needing only `User.Read` — so a credential that legitimately lacks a files scope
reports as live rather than broken.

It is also the right probe on the *don't echo the credential* test: the `user`
resource carries directory profile fields (id, displayName, mail,
userPrincipalName) and no token, key or secret of any kind. `GET /me/drive` would
need a files scope, and `/me/drive/root` would fail for a licensed user whose
OneDrive has never been provisioned.

### Do we have room left? — `quota`, a **live probe**

`GET /me/drive` returns the drive's `quota` facet, which is a real, documented
headroom reading:

| `state` | Meaning | Reported as |
|---|---|---|
| `normal` | Plenty remaining | `ok` |
| `nearing` | Remaining < 10% of total | `degraded` |
| `critical` | Remaining < 1% of total | `degraded` |
| `exceeded` | Used exceeds total; nothing new can be added | `down` |

The check reads **the vendor's own `state`** rather than re-deriving one from the
byte counts, and falls back to the counts only when a drive omits it. The counts
are reported alongside as a `HealthQuota` so a UI can show the numbers.
`severity: "informational"` — a full drive is worth showing and is not the App
being broken, and every read action still works.

### Do we have request-rate headroom? — `request-rate`, declared **absent**

**This is where the sibling `excel` App is now out of date, and it is worth
stating plainly.** That App reads the IETF `RateLimit-Limit` / `-Remaining` /
`-Reset` headers off `GET /me/drive` and treats their absence as "below 80% of the
one-minute limit". Microsoft's SharePoint Online throttling guidance — the page
that claim came from, **last updated 2026-08-10** — now carries a section titled
"RateLimit headers" saying, in full:

> SharePoint Online does not return or support IETF RateLimit headers. Although
> these headers may be used by other services, applications should not depend on
> them for SharePoint Online and should instead honor the Retry-After header when
> throttling occurs.

(The page contradicts itself — its best-practice summary and "See also" list still
recommend those headers — but the dedicated section is the specific, current
statement, and a check built on headers the vendor says it does not send would
report `ok` forever.)

So there is nothing to poll. Throttling here is reactive: `429` or `503` with a
`Retry-After` header, and no proactive signal on success. The published per-app,
per-tenant ceilings are recorded in the check's `reason` so an operator diagnosing
a burst of 429s has them to hand: 1,250 RU/min and 1,200,000 RU/24h at 0–1,000
licenses, scaling to 6,250 RU/min and 6,000,000 RU/24h above 50,000, where a
single-item read costs 1 RU, a listing or write 2, and any permission operation 5.

### Declared checks

| Key | Kind | Probe | Severity |
|---|---|---|---|
| `service` | service | *declared absent* | informational |
| `quota` | quota | `GET /me/drive` → `quota` facet | informational |
| `request-rate` | quota | *declared absent* | informational |
| `auth:oauth2` | credential *(derived)* | `GET /me` | fatal (default) |

Neither declared absence widens egress, and the one live probe stays on
`graph.microsoft.com`, so the spec's ban on pairing `network.allow` with a signed
posture never binds.

---

## Not implemented

Left out deliberately, each with a reason:

- **Resumable upload sessions** (`createUploadSession`) — the path for files over
  250 MB. Out of scope, and in any case the sandbox's text-only request bodies
  (see point 4 above) would limit it to the same content types as simple upload.
- **Binary / base64 upload** — see point 4. Not a Graph limitation.
- **Following a download to its bytes** — see point 3. Would require wildcard
  egress to per-tenant storage hosts.
- **Polling a copy to completion** — same reason; the monitor URL is on a
  per-tenant SharePoint host. The URL is returned instead.
- **Triggers / webhooks** (Graph change notifications) — a separate subsystem
  needing a publicly reachable notification URL and subscription lifecycle. List
  Changes covers polled change tracking today.
- **Versions, thumbnails, checkin/checkout, recycle-bin restore, `follow`,
  `preview`, `analytics`** — real endpoints, simply outside the drive/file surface
  this App was scoped to.
- **`includeDeletedItems=true` on Get Item** — documented as OneDrive-personal
  only and only when targeting by id, so it would be a param that silently does
  nothing for most connections.
- **Site- and group-relative addressing** (`/sites/{id}/drive`,
  `/groups/{id}/drive`) — reachable already by passing that library's *Drive ID*,
  which is what List Drives returns.

---

## Verification

Run from this directory (Deno lives in the `api` compose service):

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/onedrive && \
         deno task validate && deno task check && \
         deno task lint && deno task fmt && deno task test'
```

- `deno task validate` — 0 errors, 0 warnings.
- `deno task test` — **202 unit tests**, all against a mocked `HookContext`
  (fake `ctx.fetch`, no-op `ctx.log`). No network, no server.
- The icon is `simple-icons`' `microsoftonedrive.svg`, **verbatim** — 1,331 bytes,
  md5 `b2575ded6a12b578893bd1418e15e4cf`, `<title>Microsoft OneDrive</title>`.
  `deno task fmt` is scoped to the source directories and does not touch
  `assets/`; a bare `deno fmt` would rewrite the SVG and falsify that claim.

`w6w.network.allow` is exactly `["graph.microsoft.com"]` — the one host any hook
calls. No loopback, no status host, no storage host.

---

## Links

- [OneDrive REST API overview](https://learn.microsoft.com/en-us/onedrive/developer/rest-api/)
- [driveItem resource](https://learn.microsoft.com/en-us/graph/api/resources/driveitem)
- [quota facet](https://learn.microsoft.com/en-us/graph/api/resources/quota)
- [Paging Microsoft Graph data](https://learn.microsoft.com/en-us/graph/paging)
- [Avoid getting throttled in SharePoint Online](https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online)
- [Microsoft identity platform auth code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
