# Hacker News

Read Hacker News stories, comments, users, and story-id lists from the official public v0 API.

- **Categories** — social-media, developer-tools
- **Auth methods** — none (the v0 API is a genuinely anonymous, no-auth service)
- **Actions** — 10
- **Egress allowlist** — `hacker-news.firebaseio.com`
- **Website** — https://news.ycombinator.com
- **API docs** — https://github.com/HackerNews/API (README)

## What this is

Hacker News publishes its live data through a public, read-only, Firebase-backed v0 API. Every
story, comment, job post, poll, and poll option is an **item**, addressable by its unique integer
id under `/v0/item/{id}.json`; user profiles are addressable by case-sensitive username under
`/v0/user/{id}.json`. The rest of the surface — story-id lists, the current max item id, and a
changefeed — lets a workflow discover items without already knowing their ids.

Verified live against `hacker-news.firebaseio.com` on 2026-09-05, cross-checked against the
official README fetched from `github.com/HackerNews/API` at the same time. Every endpoint below
was fetched for real, not inferred from the docs alone.

## Actions

| Key | Type | Resource | Endpoint |
|---|---|---|---|
| `get-item` | read | item | `GET /v0/item/{id}.json` |
| `get-user` | read | user | `GET /v0/user/{id}.json` |
| `get-max-item-id` | read | item | `GET /v0/maxitem.json` |
| `list-top-stories` | read | story | `GET /v0/topstories.json` |
| `list-new-stories` | read | story | `GET /v0/newstories.json` |
| `list-best-stories` | read | story | `GET /v0/beststories.json` |
| `list-ask-stories` | read | story | `GET /v0/askstories.json` |
| `list-show-stories` | read | story | `GET /v0/showstories.json` |
| `list-job-stories` | read | story | `GET /v0/jobstories.json` |
| `get-updates` | read | updates | `GET /v0/updates.json` |

Every action is `read` — the whole API this app covers is read-only. `topstories` and `newstories`
carry up to 500 ids each, `beststories` likewise up to 500; `askstories`/`showstories`/`jobstories`
carry up to 200, all per the README. None of the list endpoints take a `limit` or paging
parameter — the vendor caps the list itself.

## Auth

None. The v0 API has no credential of any kind — no API key, no bearer token, no OAuth — and the
README states plainly: *"There is currently no rate limit."* `auth` is omitted entirely from this
app's `index.ts`, per the no-auth-app convention in `docs/build-a-w6w-app.md`. Every action and
health check issues a plain, unsigned `GET`.

## Findings worth knowing before you build on this

1. **A missing id answers `200 null`, not a 404.** Fetching a bogus item id
   (`/v0/item/999999999999.json`) or a nonexistent username
   (`/v0/user/this-user-should-not-exist-xyz.json`) both come back `HTTP 200` with the literal
   JSON body `null` — verified live. `get-item` and `get-user` pass that `null` through unchanged
   rather than throwing, since the vendor itself treats it as a well-formed answer. A caller that
   assumes "200 means it exists" will silently treat a deleted/unknown item as real data unless it
   explicitly checks for `null`.
2. **`HEAD` is not supported anywhere.** Every path answers `405 Method Not Allowed` to `HEAD`
   (verified live against `/v0/maxitem.json`), including from a bare `curl -I`. The health check
   and every action here always issue `GET`.
3. **There is genuinely no rate limit, and the vendor says so explicitly** rather than leaving it
   undocumented — see the `quota` health check below. This is unusual enough among the apps in
   this pack to call out: most vendors either publish a real limit or say nothing at all.
4. **No status page exists to check for vendor-wide outages.** `hacker-news.firebaseio.com` is a
   read replica of HN's own data, not a separately-run product with a status page, feed, or
   dashboard — there is nothing at `status.ycombinator.com` or similar to declare. The `service`
   health check below is therefore a live reachability probe against the API itself, not a
   third-party status feed.

## Health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `GET /v0/maxitem.json`, confirms a plausible positive integer body |
| `quota` | quota | connection (default) | signed (default) | informational | — | _declared absent_ |

**`service` is a live probe, not a declared absence.** There is no vendor status page to point at,
but there is a real, cheap, unauthenticated endpoint (`/v0/maxitem.json`) that answers a bare
integer — so rather than declaring `unavailable`, this check GETs it and verifies the body parses
as a plausible positive integer, catching the case where Firebase's edge answers `200` with an
empty or non-numeric body.

**`quota` is declared absent.** The README states explicitly there is currently no rate limit, and
no response from this API carries an `x-ratelimit-*` or similar header (checked against live
`/v0/maxitem.json` and `/v0/item/1.json` responses). `severity: "informational"` keeps that
permanent `unknown` from ever worsening the App's rolled-up verdict.

There is no derived `auth:*` check — this app declares no Auth method, so there is no credential
to test.

## Icon

`assets/icon.svg` is Hacker News's own `y18.svg`, fetched verbatim from
`https://news.ycombinator.com/y18.svg` (linked by the site's own `<link rel="icon">` tag) — not
redrawn or approximated.

---

Researched and endpoint-verified 2026-09-05 directly against `hacker-news.firebaseio.com` (every
item/user/list/maxitem/updates endpoint fetched live) and the official README at
`github.com/HackerNews/API`.
