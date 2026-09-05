# Instapaper

Save, organize and read articles with [Instapaper](https://www.instapaper.com), the read-it-later
service. Built against Instapaper's **Full Developer API**
(`https://www.instapaper.com/developers`, redirecting internally to `/developers/v1/full-api`) —
an older but still-live REST surface distinct from the "Simple API" (a one-way, add-only surface
this app does not implement, since the Full API already covers adding and far more).

## Verifying the docs against a client-rendered page

`instapaper.com/developers` today serves a client-rendered React shell (confirmed live,
2026-09-05: ~6.7 KB of markup, no API content). The actual reference content was recovered from
two archived snapshots of the classic `instapaper.com/api/full` page (which still 301s to the
current docs route today): one from **2026-01-30** and one from **2026-06-15**, seven months
apart. Diffing the two (normalizing only whitespace) shows them **byte-identical in every
substantive line** — endpoints, parameters, error codes and prose all match — which is why this
app treats the surface as settled rather than mid-migration, despite reading it from an archive.

## Authentication — xAuth (OAuth 1.0a)

Instapaper's own words: *"xAuth is the only way to get an Instapaper access token."* This is a
two-step story, both implemented in [`auth/xauth.ts`](./auth/xauth.ts):

1. **`exchange`** — spends the user's Instapaper username/password exactly once, via
   `POST /api/1/oauth/access_token` with `x_auth_mode=client_auth`, signed as a **two-legged**
   OAuth 1.0a request (consumer key/secret only — no token yet). The response is a single
   **qline-like line** (`oauth_token=...&oauth_token_secret=...`), **not JSON** — the docs say
   this is deliberate, "to match conventions when issuing access tokens" — even though every
   other successful response in this API is a JSON array.
2. **`sign`** — every subsequent request is signed with the full **three-legged** OAuth 1.0a
   parameter set (consumer key/secret + token/token secret), HMAC-SHA1 (the only signature method
   Instapaper documents supporting).

An app-level **consumer key/secret** is a prerequisite this app cannot ship on your behalf:
Instapaper issues one per application after a manual human review
(`https://www.instapaper.com/main/request_oauth_consumer_token`). Both are collected as connect-time
fields.

**The account password is not required, and is not retained.** The docs are explicit that most
Instapaper accounts are email-only with no password (*"If an account does not have a password, any
value works"*), so the `password` field here is optional. Unlike this pack's other exchange-based
Auth methods (`bluesky/app-password.ts`, `agencyzoom/auth/login.ts`), which keep the password to
redo a login when there is no refresh path, this app does **not** retain it: Instapaper documents
no expiry and no refresh endpoint for the OAuth token it issues, so there is nothing a stored
password would ever be used to redo. `refresh` and `revoke` hooks are therefore intentionally
absent — adding either would mean inventing an endpoint the vendor does not document.

The OAuth 1.0a signing itself (percent-encoding, the signature base string, HMAC-SHA1 via Web
Crypto) is in [`lib/oauth1.ts`](./lib/oauth1.ts), with **no signing library dependency** — HMAC-SHA1
is a pure computation, legal inside the network-less `sign` hook. Its correctness is checked in
[`tests/lib/oauth1.test.ts`](./tests/lib/oauth1.test.ts) against a signature computed **independently
in Python**, from scratch, rather than against a half-remembered published test vector (an earlier
draft of that test cited a vector from memory that turned out to be simply wrong — verified against
an independent implementation before trusting it).

### A quirk that would have cost a day: the body is part of what gets signed

The docs state every parameter travels in the POST body and never the query string, and separately
that the OAuth parameters go in the `Authorization` header. RFC 5849 §3.4.1.3 says the OAuth
signature base string must include the union of the OAuth parameters **and every
`application/x-www-form-urlencoded` body parameter**. Sign only the OAuth params — an easy mistake,
since it "works" for bodyless calls — and every write (`bookmark_id`, `url`, `title`, ...) gets a
signature Instapaper silently rejects, while reads with no body happen to still verify. `sign` in
this app parses the exact outgoing body (`lib/oauth1.ts`'s `parseFormBody`) and feeds it into the
signature for every request, precisely to avoid that trap.

## Three response shapes, not one

Most methods answer a JSON array of tagged objects, `[{"type": "bookmark", ...}]` — see
[`lib/client.ts`](./lib/client.ts)'s `call()`. Two documented exceptions:

- **`bookmarks/list`** answers a bespoke object, `{"user", "bookmarks", "highlights", "delete_ids"}`
  — `callObject()`.
- **`bookmarks/get_text`** answers the bookmark's raw `text/html` body with a bare HTTP 200 on
  success, or the standard error array on failure — `callText()`.

**Errors are not reliably tied to a non-2xx HTTP status.** The docs describe the error envelope
(`[{"type":"error","error_code",...}]`) without stating which status codes carry it, and separately
say a response that fails to parse as JSON should be treated as a 503 and retried. Every call in
this app therefore classifies by **response shape**, never by HTTP status alone.

## Actions (18)

| Resource | Actions |
|---|---|
| Account | Get Current User (`account/verify_credentials`) |
| Bookmarks | List, Add, Delete, Star, Unstar, Archive, Unarchive, Move, Update Reading Progress, Get Text |
| Folders | List, Add, Delete, Set Order |
| Highlights | List, Create, Delete |

Every action maps 1:1 to a documented method — nothing here was inferred from a sibling app or a
marketing page. Two smaller conveniences, both pure reshaping of a documented wire format, not new
behavior:

- **Add Bookmark**'s `tags` param is a plain list of names; it is serialized into the documented
  `[{"name": "..."}]` shape before the call.
- **Set Folder Order** collects a structured `{folderId, position}` list instead of the documented
  raw `folder_id:position,...` string, and builds that string itself.

Not marked `idempotent`: **Add Bookmark** (re-saving an existing URL moves it to the top and
overwrites its title/description — visible state changes every call), **Add Folder** (a duplicate
title errors rather than returning the existing folder), and **Create Highlight** (always creates a
new resource). Every other mutation sets absolute state and is safe to retry.

## Health check

Instapaper publishes **no vendor status page** — checked live 2026-09-05:

- `status.instapaper.com` does not resolve (DNS `NXDOMAIN`).
- `instapaper.statuspage.io/api/v2/summary.json` answers a `302` to `https://www.statuspage.io` —
  the same unclaimed-Statuspage decoy this pack's other apps (Apollo, Aweber, AgencyZoom, ...) have
  already documented.

`health/service.ts` declares this absence explicitly, with `severity: "informational"` — omitting
that would leave the app pinned at `unknown` forever, since an `unavailable` entry always reports
`unknown` and `unknown` outranks `ok` in a roll-up. The derived `auth:xauth` check (from `xauth.ts`'s
`test` hook, `POST /api/1/account/verify_credentials`) is the automatable "is Instapaper working"
signal for anyone holding a live connection.

The auth probe is chosen deliberately: `account/verify_credentials` returns only
`{"type":"user","user_id","username"}` — it never echoes the OAuth token or secret it was signed
with, so it is safe to use as both the connect-time liveness check and this derived health check.

## Icon

[`assets/icon.svg`](./assets/icon.svg) is Instapaper's mark from
[simpleicons.org](https://cdn.simpleicons.org/instapaper) (confirmed 200, ~315 bytes, a real vector
mark labelled `<title>Instapaper</title>`), the same source this pack uses for its other
simple-icons-backed apps. It is a single-colour black mark, which the pack's icon-legibility audit
(`_tools/icon-legibility.ts`) flags as illegible on the dark icon tile — `assets/icon.dark.svg` is
that same geometry reversed to white, generated by the audit's own `fix` mode
(`deno run -A _tools/icon-legibility.ts fix instapaper`), and declared via
`appearance.darkMode.icon`.

## Not implemented

- **The Simple API** — a separate, one-way "add a URL" surface the docs point to as a lighter
  alternative for apps that don't need anything beyond saving. Out of scope: the Full API already
  covers adding a bookmark, and everything else besides.
- **RSS-feed folders and starred-subscription folders** — `folders/list`'s own docs say it excludes
  these ("the implementation of those is changing in the near future"), so there is no documented
  way to list or address them.
