# Tumblr

Read and post to Tumblr blogs, manage likes and follows, and check a connected user's dashboard,
on the **Tumblr API v2**.

- **Categories** — social-media, cms
- **Auth methods** — oauth2
- **Actions** — 23
- **Health checks** — 1 (`service`) + the derived `auth:oauth2`
- **Egress allowlist** — `api.tumblr.com` (the `service` check adds `automatticstatus.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.tumblr.com/
- **API docs** — https://www.tumblr.com/docs/en/api/v2
- **Status page** — https://automatticstatus.com/

> **Everything below was verified against Tumblr's own sources on 2026-09-05** — its hand-written
> API v2 reference (`https://www.tumblr.com/docs/en/api/v2`, ~324 KB HTML — Tumblr publishes prose
> documentation, not an OpenAPI or Postman collection), plus live probes against `api.tumblr.com`,
> `status.tumblr.com` and `automatticstatus.com`. Nothing here came from a third-party integration
> directory.

## The three things most likely to cost someone a day

### 1. OAuth 2.0, not OAuth 1.0a — even though the doc says "OAuth 1.0a"

Tumblr's own "Authentication" section defines its `OAuth`-level methods as needing "a signed
request that meets the **OAuth 1.0a Protocol**" — HMAC-SHA1 signing, a temporary-credentials
dance, `oauth_nonce`/`oauth_timestamp` on every call. Read only that line, and OAuth 1.0a looks
mandatory.

It isn't. The same page's later "OAuth2 Authorization" section documents a complete, current
OAuth 2.0 implementation — Authorization Code grant, Client Credentials, Refresh Token, at
`/oauth2/authorize` + `/v2/oauth2/token` — presenting a plain `Authorization: Bearer {access_token}`
header. The vendor's own worked example sends that exact header to `GET /v2/user/info`, one of the
`OAuth`-level methods. So OAuth 2.0 reaches the same surface OAuth 1.0a does, without ever touching
request-signing code. **This app implements OAuth 2.0 only** ([`auth/oauth2.ts`](auth/oauth2.ts)) —
no HMAC-SHA1, no request-signing base string, no nonce/timestamp bookkeeping anywhere in the tree
(enforced by a test in [`tests/index.test.ts`](tests/index.test.ts)).

Scopes requested: `basic` (read the account + its blogs), `write` (everything this app's `perform`
actions need) and `offline_access` (required to receive a `refresh_token` at all).

### 2. A 401's message text is randomised; its numeric code is not

A live, unauthenticated probe against `GET /v2/user/info` on 2026-09-05 returned three *different*
sentences on three consecutive calls — `"Hit a glitch. Try again."`, `"Internet strangeness. Try
again."`, `"Measly little error. Try again."` — all under the same `{"errors":[{"code":0, …}]}`. A
syntactically-plausible but wrong bearer token, by contrast, consistently answers `code: 1013,
"detail": "Unable to authorize"`. Every failure classification in this app —
[`lib/client.ts`](lib/client.ts)'s `formatTumblrError`, [`auth/oauth2.ts`](auth/oauth2.ts)'s
`classifyAuthFailure` — branches on the numeric `code`, never on `detail`'s wording, and a test
pins the randomised-string case so a future "helpful" rewrite keyed on message text fails loudly.

### 3. The real status page isn't at the obvious hostname

`https://status.tumblr.com` answers `200` — but its body is an ordinary Tumblr blog theme carrying
a **login-phishing warning banner** ("Warning: Never enter your Tumblr password unless
https://www.tumblr.com/login is the address…"), not a status dashboard. It's someone's actual
Tumblr blog squatting on that subdomain — precisely the "HTTP 200 ≠ a real endpoint" trap this pack
watches for elsewhere. `status.tumblr.com/api/v2/summary.json` (the shape a Statuspage.io host
would answer at) 404s, confirming it.

Tumblr's parent, Automattic, runs **one shared status page** for its whole portfolio at
**`automatticstatus.com`** — verified to actually *name* Tumblr, not just claim to: it monitors
three Tumblr components individually (`Tumblr API`, `Tumblr Dashboard`, `Tumblr Sites`) among ~34
total, alongside WordPress.com, Jetpack, Gravatar, Akismet and more. It runs Zoho Site24x7's
"StatusIQ" product, not Statuspage.io — `automatticstatus.com/api/v2/summary.json` 404s too — and
its machine-readable surface is an **RSS feed at `automatticstatus.com/rss`**, found in the page's
own embedded JS config (`statuspages.globals.rssurl`). Unlike most status feeds (one entry per
incident *update*), this one publishes exactly one entry per *component*, titled `"{component} -
{status}"`, so the newest entry per component already **is** its current status — see
[`health/service.ts`](health/service.ts) for the full derivation.

## Auth levels vs. what this app actually sends

The doc's per-method table marks each method `None`, `API key` (an unsigned request with the OAuth
consumer key as a plain `?api_key=` query parameter) or `OAuth` (a signed request). This app signs
**every** request with the connected account's OAuth2 bearer token, including the `API key`-level
methods (blog info, avatar, likes, notes) — the vendor's own OAuth2 walkthrough sends that same
bearer header to an `OAuth`-level method and gets the authenticated response, and OAuth is
documented as the stronger credential form. The one exception is `blog-avatar-get`
(`requiresAuth: false`), whose `None` level needs no credential of any kind.

## Deliberately left out

- **`GET /v2/tagged`** (get posts by tag, site-wide). It is the *only* method on the entire
  reference page whose "Request Parameters" table is followed immediately by the next method, with
  no "Response" section at all — every other endpoint has one. Rather than guess the shape (a bare
  array? an object?), this action is left unimplemented. See [`lib/client.ts`](lib/client.ts).
- **The legacy per-type post routes** (`POST /post`, `/post/edit`, `/post/reblog`). The vendor's own
  docs say "these legacy posting flows are still available, but we encourage you to use the [NPF]
  creation route" — `post-create`/`post-update` cover creation, editing and reblogging in NPF
  instead, which every read action in this app also normalises to via `npf=true`.
- **Multipart media upload** (uploading raw image/video bytes alongside a post's NPF JSON via
  `multipart/form-data`). An Action's params model has no natural shape for "JSON body plus N
  named binary parts"; an `image`/`video` NPF content block that references an already-hosted URL
  still works through `post-create`/`post-update`.
- **Blocks, tag filtering, content filtering, Pages, Communities.** All real, all documented, all
  out of scope for this pass — none is on the vendor's own OAuth2 walkthrough's core path (post,
  read, like, follow), and Communities is explicitly marked beta ("may change in
  backwards-incompatible ways") in the vendor's own docs.
- **The bare list-of-tags array form** (`tag[0]=a&tag[1]=b`, matching posts with *all* of up to 4
  tags). `blog-posts-list`'s `tag` param is single-valued only; a comma-joined multiselect would
  render as `tag=a,b`, a different and undocumented query shape.

## Pagination

Most list endpoints cap `limit` at **20**, a page size far smaller than typical (contrast an app
like Apify, whose ceiling is 1,000) — pull more with `offset` (capped at 1000 by Tumblr) or, where
documented, `before`/`after`. Two endpoints (`posts/draft`, `posts/submission`) don't take `limit`
at all — only a cursor field (`before_id`/`offset`) — and this app's params match that exactly
rather than adding a `limit` the API would silently ignore.

## What's NOT redacted, and why nothing needed to be

Unlike some vendors, no ordinary read in this API's documented surface hands back a live secondary
credential (Apify's `proxy.password`, for instance) — `user/info` and `user/limits` return account
metadata and usage counters, nothing else. So [`lib/client.ts`](lib/client.ts) has no
`stripSecrets`-equivalent; there is nothing to strip.
