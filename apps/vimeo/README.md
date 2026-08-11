# Vimeo

Videos, folders, showcases, comments and likes on the Vimeo REST API.

- **Categories** — video, social-media
- **Auth methods** — access-token
- **Actions** — 36
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:access-token`
- **Egress allowlist** — `api.vimeo.com` (the `service` check adds `www.vimeostatus.com` on its own
  hook only)
- **Website** — https://vimeo.com/
- **API docs** — https://developer.vimeo.com/api/reference
- **Status page** — https://www.vimeostatus.com/

> **Everything below was verified against Vimeo's own sources on 2026-08-11** — the per-resource
> OpenAPI documents that `developer.vimeo.com/api/reference/<group>` embeds inline (so it is the
> vendor's machine-readable spec, not scraped prose), the response schemas under
> `/api/reference/response/<name>`, and the guides
> [`/api/authentication`](https://developer.vimeo.com/api/authentication),
> [`/api/common-formats`](https://developer.vimeo.com/api/common-formats),
> [`/api/upload/videos`](https://developer.vimeo.com/api/upload/videos) and
> [`/guidelines/rate-limiting`](https://developer.vimeo.com/guidelines/rate-limiting) — plus live
> probes against `api.vimeo.com` and `www.vimeostatus.com`. Nothing here came from a third-party
> integration directory or from a sibling app in this pack.

## The five things most likely to go wrong

### 1. The API version lives in the `Accept` header, not the path

`api.vimeo.com` has no `/v3/` prefix. Every request must carry:

```
Accept: application/vnd.vimeo.*+json;version=3.4
```

The reference reports `apiVersions: ["3.0","3.1","3.2","3.3","3.4"]` and `version: "3.4.9"`, and
`/api/common-formats#using-the-accept-header` says to set the header explicitly on every call.
Omitting it does not fail — it silently pins you to whatever Vimeo currently treats as default, which
is the whole failure the header exists to prevent. `lib/client.ts` sends it on every request, and both
health probes send it too.

The `*` is a wildcard for the resource type. A concrete type (`application/vnd.vimeo.video+json`) is
legal but must match the endpoint exactly or the API errors, so the wildcard is what this app uses.

### 2. `fields` is the rate limit, not an optimisation — and the header lies without it

`/guidelines/rate-limiting` states two things that only make sense together:

1. Vimeo **doubles** the per-minute request quota for any request that uses the `fields` query
   parameter.
2. "`X-RateLimit-Limit` and `X-RateLimit-Remaining` assume that you're using field filtering to
   double the normal request quota. **If you aren't using field filtering, divide these values by
   2.**"

So the headers are reported as the already-doubled figure *unconditionally*. Read
`X-RateLimit-Remaining` without sending `fields` and you are over-reading your own headroom by 100% —
you will hit `429` (Vimeo error code `9000`) at what the header calls half-full.

Every read action here exposes a `Fields` parameter, and both health probes use one. `fields` is a
comma-separated list with dot notation for nested paths, supported on every method **except**
`DELETE`, and always a query parameter — never a body field.

### 3. Video, showcase and user representations return cleartext passwords

Three default-returned fields, straight from the response schemas:

| Representation | Field | Vimeo's own description |
| --- | --- | --- |
| `video` | `password` (top level) | "The privacy-enabled password to watch the video… requires a bearer token with the `private` scope." |
| `album` (showcase) | `privacy.password` | "The showcase's password. This field appears only when **privacy.view** is `password`." |
| `user` | `preferences.videos.password` | "The password for viewing the authenticated user's videos." |
| `user` | `preferences.videos.privacy.password` | "The default password for the video." |

None of these is *this connection's* credential — `/me` is not a Mailjet `/apikey`-style self-echo,
and no Vimeo endpoint returns your access token. But they are secrets, and a workflow that fetches a
video and logs the result has just written a password into a log.

Two consequences, both deliberate:

- **The credential probe and the quota probe are filtered.** `auth/access-token.ts` calls
  `GET /me?fields=uri,name` and `health/quota.ts` calls `GET /me?fields=uri`, so neither response can
  contain a password even in a debug line. A test asserts that every `ctx.fetch` in the auth module
  is one of those filtered probes.
- **Nothing is stripped from an action's response.** Silently deleting a field the vendor returned
  would be a worse surprise than the one being avoided, and `fields` is the vendor's own supported way
  to not ask for it. Set it.

Every param named for a password in this app is `type: "secret"` (masked and encrypted), including
the showcase password that travels as a *query* parameter on `showcase-video-list`.

### 4. Folders are `projects`, showcases are `albums` — and a showcase URI is neither

Vimeo renamed both features in the product and kept the old words in the API, in different places:

| Product word | Path segment | Response schema | The entity's own URI |
| --- | --- | --- | --- |
| Folder | `/me/projects/{id}` | `Project` | `/users/152184/projects/12345` |
| Showcase | `/me/albums/{id}` | `Album` | **`/showcases/3706071`** |

That last cell is the trap: a showcase's URI is not a valid path, and the path is not the URI —
Vimeo's own `album_uris` parameter documents `/showcases/258684873` as its example while the endpoint
is `/users/{user_id}/albums/{album_id}`. Every id param in this app accepts a bare id or any of the
URI forms and reduces it to the trailing id, so the distinction stops mattering at the boundary.

Related: `folder-item-list` (`/items`) returns videos **and subfolders and live events**;
`folder-video-list` (`/videos`) returns only videos. If a subfolder seems to have vanished, that is
which of the two you called. And `folder-video-list`'s `include_subfolders` is off by default, so a
folder whose videos all live one level down looks empty.

### 5. Vimeo's plural showcase endpoint is a *replace*, and pull uploads succeed for non-videos

Two separate ways to destroy something you did not mean to:

**`PUT /me/albums/{id}/videos` is `replace_videos_in_showcase`** — "This method **replaces all the
videos** in the specified showcase with a new set of one or more videos." Wiring "add these three" to
it silently deletes everything else. This app therefore splits them: `showcase-video-add` loops the
single-video endpoint (one request per video, additive), and `showcase-video-replace` is a separate
action that says `replace` in its name and its description. A unit test asserts that `add` never
issues a request to the collection path.

**A pull upload returns `201` for a file that is not a video.** Vimeo's own words: "Since our uploader
accepts a wide range of video codecs and file types, we can't analyze the file until it's on our
server. Therefore, links to invalid or non-video files (like MP3 or PDF) still return HTTP 201 and
generate a video URI." The failure appears later as `status` of `uploading_error` or
`transcoding_error`. Check `status` and `upload.status` after `video-upload-pull`; they are declared
outputs for that reason.

Two smaller ones in the same family: `folder-delete` and `folder-video-remove` can delete the videos
as well as the folder, and both flags default to **off** here. `send_to_recently_deleted` is defined
by Vimeo only in combination with `should_delete_clips`, so this app never sends it alone. And only
the *bulk* remove endpoint accepts the delete flag — the single-video one "doesn't delete the video
itself" — so `folder-video-remove` routes through the bulk endpoint even for one video when a delete
was asked for, rather than dropping the flag silently.

## Authentication

`Authorization: Bearer {access_token}` against `https://api.vimeo.com`. One auth method,
`access-token`, with a single `type: "secret"` field.

Vimeo supports four OAuth 2.0 grants (client credentials, authorization code, implicit, device code)
plus a *personal access token* generated on the developer site. All five produce the same artefact —
an opaque bearer string — so this app takes the token directly. **The authorization-code redirect flow
is deliberately not modelled**: it needs a Vimeo app registration whose client id, secret and redirect
URI are per-installation, and inventing one would be worse than leaving it out. Generate a personal
access token, or paste one you exchanged elsewhere.

### Scopes

A token carries scopes chosen at creation: `public`, `private`, `purchased`, `create`, `edit`,
`delete`, `interact`, `upload`, `promo_codes`, `stats`, `video_files`. Vimeo denies a request whose
token lacks the scope its endpoint needs. Roughly:

| To use | You need |
| --- | --- |
| `video-list`, `video-get`, `user-get`, folder and showcase reads | `private` |
| `video-update`, `user-update`, folder/showcase edits | `edit` |
| `video-delete`, `folder-delete`, `showcase-delete` | `delete` |
| `folder-create`, `showcase-create` | `create` |
| `video-upload-pull` | `upload` |
| `like-add`, `like-remove`, the comment actions | `interact` |

### Why the probe is `GET /me?fields=uri,name`

The authentication guide settles it in one sentence: "An authenticated access token with the `public`
scope is identical to an unauthenticated access token, **except that you can use the `/me` endpoint**
to refer to the currently logged-in user. Accessing `/me` with an unauthenticated access token
generates an error."

So `/me` is the only call that both (a) needs no scope beyond the minimum every token has, and
(b) *cannot* succeed without a real user-bound credential. Both halves matter. Probing `GET /me/videos`
would report a perfectly good `public`-scope token as broken; probing a public endpoint like
`GET /videos?query=x` would pass for a connection whose token never got attached at all.

The `fields=uri,name` is what makes it safe to log — see §3.

Three failures are distinguished, because they need three different fixes:

| Response | Meaning | Fix |
| --- | --- | --- |
| `401`, error code `8003` | No credential arrived, the `bearer` keyword was missing, or the token is not recognised | Re-paste the token |
| `401`, error code `8002` | The token is valid but **not bound to a user** — a client-credentials token | Replace it; re-pasting cannot help |
| `403` | Real token, insufficient scopes | Reissue with the scope the action needs |

Confirmed live on 2026-08-11: an unauthenticated `GET https://api.vimeo.com/` answers `401` with
`content-type: application/vnd.vimeo.error+json`, `www-authenticate: Bearer error="invalid_token"`,
and a body of exactly `{error, link, developer_message, error_code}` carrying `error_code: 8003`.

## Health checks

| Check | Kind | Credential | What it answers |
| --- | --- | --- | --- |
| `service` | service | none | Is Vimeo up? — all 16 components from the Statuspage |
| `quota` | quota | signed | How many requests are left this minute for this connection? |
| `auth:access-token` | credential | signed | Derived from the `test` hook above |

### The status host is not the one you would guess

`status.vimeo.com` answers **`301 Moved Permanently`** to
`https://www.vimeostatus.com/api/v2/status.json` (measured 2026-08-11, served by Cloudflare with an
HTML body). A health check's egress is restricted to the hosts it declares, and a redirect crosses to
a *different* host — so declaring `status.vimeo.com` would either be blocked outright or, worse, parse
the interstitial as a status document. This app calls `www.vimeostatus.com` directly and allowlists
exactly that. A unit test fails if anyone "tidies" it back.

Verified three ways. **Is it a catch-all?** No — `/api/v2/summary.json` returns 200 with 5,670
bytes, `/api/v2/status.json` returns 200 with 227 bytes, and
`/api/v2/definitely-not-real-zzz.json` is refused outright with **404 and an empty body** (all
measured 2026-08-11). **Does it describe this product?** The page self-identifies as
`{"id":"sccqh0pnqrh8","name":"Vimeo","url":"https://www.vimeostatus.com"}`; and its 16 components are
Vimeo's own — Website, Billing, On-Site Player, Embedded Player, Upload, Create, Conversion, **API**,
Mobile/TV Apps, Live Analytics, Support Systems, Live streaming features, VOD Analytics, Record,
Editor, Interactive. `summary.json` is read rather than `status.json` because it costs the same
request and carries the per-component breakdown — the difference between "Vimeo is up" and "the API is
fine, Upload is degraded".

The status host is declared on that hook's own `network.allow`, **not** in `w6w.network.allow`: the
app-level list widens egress for every hook including the signed ones, which is how a status page ends
up seeing a credential.

### The quota check is `informational`, on purpose

It reads `X-RateLimit-Limit` / `-Remaining` / `-Reset` from a filtered `GET /me`. But a live
unauthenticated request to `api.vimeo.com` on 2026-08-11 returned 22 headers and **none of the three**
— consistent with Vimeo's rule that the quota belongs to the end user the token identifies. So the
check reports `unknown` with the reason rather than inventing a number, and `unknown` outranks `ok` in
the roll-up: at the default `degraded` severity a missing header would pin this App's verdict at
`unknown` forever. Running low on request budget is also not a reason to call the App broken.

No absence is *declared* here — Vimeo publishes both a machine-readable status page and quota headers
— but the "an `unavailable` entry must be `informational`" rule is enforced by a test anyway, for the
day someone adds one.

## Actions

### Videos (6)

| Key | Type | Endpoint |
| --- | --- | --- |
| `video-list` | search | `GET /me/videos` |
| `video-get` | read | `GET /videos/{id}` |
| `video-update` | perform | `PATCH /videos/{id}` |
| `video-delete` | perform | `DELETE /videos/{id}` |
| `video-search` | search | `GET /videos` (public search) |
| `video-upload-pull` | perform | `POST /me/videos` with `upload.approach: "pull"` |

### Account (2)

| Key | Type | Endpoint |
| --- | --- | --- |
| `user-get` | read | `GET /me` or `GET /users/{id}` |
| `user-update` | perform | `PATCH /me` |

### Folders (9) — `projects` on the wire

| Key | Type | Endpoint |
| --- | --- | --- |
| `folder-list` | search | `GET /me/projects` |
| `folder-get` | read | `GET /me/projects/{id}` |
| `folder-create` | perform | `POST /me/projects` |
| `folder-update` | perform | `PATCH /me/projects/{id}` (rename only) |
| `folder-delete` | perform | `DELETE /me/projects/{id}` |
| `folder-item-list` | search | `GET /me/projects/{id}/items` |
| `folder-video-list` | search | `GET /me/projects/{id}/videos` |
| `folder-video-add` | perform | `PUT /me/projects/{id}/videos[/{videoId}]` |
| `folder-video-remove` | perform | `DELETE /me/projects/{id}/videos[/{videoId}]` |

### Showcases (9) — `albums` on the wire

| Key | Type | Endpoint |
| --- | --- | --- |
| `showcase-list` | search | `GET /me/albums` |
| `showcase-get` | read | `GET /me/albums/{id}` |
| `showcase-create` | perform | `POST /me/albums` |
| `showcase-update` | perform | `PATCH /me/albums/{id}` |
| `showcase-delete` | perform | `DELETE /me/albums/{id}` |
| `showcase-video-list` | search | `GET /me/albums/{id}/videos` |
| `showcase-video-add` | perform | `PUT /me/albums/{id}/videos/{videoId}`, looped |
| `showcase-video-remove` | perform | `DELETE /me/albums/{id}/videos/{videoId}`, looped |
| `showcase-video-replace` | perform | `PUT /me/albums/{id}/videos` — **replaces the contents** |

### Comments (7)

| Key | Type | Endpoint |
| --- | --- | --- |
| `comment-list` | search | `GET /videos/{id}/comments` |
| `comment-get` | read | `GET /videos/{id}/comments/{commentId}` |
| `comment-create` | perform | `POST /videos/{id}/comments` |
| `comment-update` | perform | `PATCH /videos/{id}/comments/{commentId}` |
| `comment-delete` | perform | `DELETE /videos/{id}/comments/{commentId}` |
| `comment-reply-list` | search | `GET /videos/{id}/comments/{commentId}/replies` |
| `comment-reply-create` | perform | `POST /videos/{id}/comments/{commentId}/replies` |

### Likes (3)

| Key | Type | Endpoint |
| --- | --- | --- |
| `like-list` | search | `GET /me/likes` |
| `like-add` | perform | `PUT /me/likes/{videoId}` |
| `like-remove` | perform | `DELETE /me/likes/{videoId}` |

## Notes on shape

**Body fields are nested, even though the reference prints them dotted.** `edit_video` documents
`privacy.view`, `embed.color`, `upload.approach`; the wire format is nested JSON, exactly as every
worked example in `/api/upload/videos` shows (`{"upload":{"approach":"pull"},"privacy":{"view":"anybody"}}`).
Posting the literal key `"privacy.view"` is a different request that Vimeo will not apply.
`lib/client.ts`'s `nest()` is the one place that translation lives.

**Multi-valued parameters are one comma-separated value**, never a repeated key —
`fields=uri,name`, `uris=/videos/1,/videos/2`, `filter_tag=abc,xyz`.

**`filter` and `filter_<name>` come as a pair.** `filter=embeddable` alone is a 400; it names the
attribute and `filter_embeddable=true|false` picks the side. This app sends both or neither.

**Bulk endpoints want URIs, not ids** — and spell it differently in each place: the folder ones take
`uris`, the showcase replace takes `videos`. Both are comma-separated strings of `/videos/{id}`.

**Pagination is by page number, and a page past the end is a 404**, not an empty collection.
`per_page` defaults to 25 and caps at 100. Collections come back as
`{total, page, per_page, paging:{next,previous,first,last}, data}`, and these actions return the whole
envelope so a workflow can walk it.

**A custom `User-Agent` is sent on every request.** `/api/common-formats#using-the-user-agent-header`
asks for one by name: "If we see a generic `User-Agent` header, we might block your app's access to
the API." It carries no account or tenant information.

## What is deliberately not here

Left out because it could not be confirmed, cannot be expressed as one server-side call, or is a
different feature that deserves its own design:

- **tus (resumable) and form-based (POST) uploads.** tus needs the file bytes plus a stateful
  multi-request session against a Vimeo upload host; the POST approach returns an HTML form for the
  *end user's browser* to submit. Neither is a single API call. `video-upload-pull` covers the case
  that is — Vimeo fetches a public URL itself.
- **Replacing a video's source file** (`POST /videos/{id}/versions`) — same upload machinery, same
  reason.
- **A `folder_uri` on upload.** The upload guide and `edit_video` between them document the settable
  metadata fields, and no folder field appears in either. Create the video, then
  `folder-video-add`.
- **`password` on `PATCH /me`.** Vimeo documents it as "the default password for all future videos
  that this user uploads", usable only when `videos.privacy.view` is already `password`. Setting an
  account-wide default password for every future upload from a workflow is not an operation worth
  making easy; set it in Vimeo's own settings.
- **`GET /me/likes/{video_id}`** ("check if the user has liked a video"). It answers `204` for liked
  and **`404` for not liked**, so as an action it would have to raise on the ordinary "no" answer.
  Read `metadata.interactions.like` off the video, or use `like-list`.
- **The 54 of `edit_video`'s 70 body fields this app does not send** — embedded-player chrome (`embed.buttons.*`,
  `embed.cards`, `embed.logos.*`, `embed.sentiment_widgets`, `embed.end_screen`) and 360° `spatial.*`
  settings. Modelling them half-way would be worse than not modelling them.
- **Text tracks, chapters, thumbnails, credits, video versions, animated thumbnails, transcripts and
  the AI endpoints** — all real and documented under the Videos group, all their own surfaces.
- **Live events, channels, groups, categories, portfolios, On Demand, teams, webhooks and
  analytics** — entire resource groups outside this app's scope.
- **`PATCH /users/{id}/albums`** (`update_showcases`, add one item set to several showcases at once)
  and **`PATCH /users/{id}/albums/from_folder`** — different shapes from the per-showcase actions
  here, left for when there is a use for them.
- **Triggers.** Vimeo publishes app webhooks; nothing here subscribes to them.

## Testing

```sh
cd apps/vimeo
deno task validate   # pack conformance auditor
deno task check
deno task lint
deno task fmt
deno task test
```

242 unit tests, every one against a mocked `HookContext` (a fake `ctx.fetch`, a no-op `ctx.log`). No
test touches the network. Every action has its own test file; `tests/index.test.ts` additionally
enforces the sandbox rules by source scan — no global `fetch`, no `Deno.*`, no credential handling
outside `auth/`, no hard-coded host in an action — and pins the two facts most easily lost in a
refactor: that both `/me` probes keep their field filter, and that the service check keeps calling the
canonical status host.
