# VideoAsk

Create and manage **VideoAsk** (by Typeform) forms — asynchronous video, audio and text
conversations — and read the contacts, answers and transcripts they produce, over the REST API at
`api.videoask.com`.

- **Categories** — forms, video, communication
- **Auth methods** — oauth2
- **Actions** — 38
- **Health checks** — 1 (`service`) + ~~`request-rate`~~ (declared unavailable) + the derived
  `auth:oauth2`
- **Egress allowlist** — `api.videoask.com` (the `service` check adds `status.videoask.com` to its
  own hook allowlist, never to the app's; `auth.videoask.com`, the OAuth host, is allowed implicitly
  by the runtime)
- **Website** — https://www.videoask.com/
- **API docs** — https://developers.videoask.com/ (rendered from the Postman collection at
  https://documenter.getpostman.com/view/291373/SWTEdwrG)
- **Status page** — https://status.videoask.com/

VideoAsk models a **form** (aka *videoask*) as a sequence of **questions** (steps). A **contact**
(aka *respondent*) answers them, producing **answers**, and the exchange of answers plus any replies
is a **conversation**.

> **Everything below was verified on 2026-08-30** against the vendor's own Postman collection —
> fetched as raw JSON from `documenter.gw.postman.com/api/collections/291373/SWTEdwrG` (the data
> source the public documentation page itself embeds and fetches from client-side) — plus live,
> unauthenticated probes against `api.videoask.com` and `status.videoask.com` the same day. Nothing
> here came from a third-party integration directory.

## The three things most likely to cost you a day

### 1. Auth is Auth0-backed OAuth2, and the authorize URL needs `audience`

`auth.videoask.com` — a **separate host** from the API — is an Auth0 tenant. The authorize request
must carry `audience=https://api.videoask.com/` or Auth0 mints an ID token instead of an API access
token, and every subsequent call fails despite a "successful" connect. This app sends it via
`oauth2.extraAuthParams` (see [`auth/oauth2.ts`](auth/oauth2.ts)) so it is never left to a default.

`offline_access` is requested in the default scope list, because VideoAsk only issues a
`refresh_token` when that scope was present on the *original* authorize request — without it, a
Connection quietly stops working the moment its first access token expires, with no way to recover
except reconnecting. Both the token exchange and the refresh call are the standard
`grant_type=authorization_code` / `grant_type=refresh_token` POST to `auth.videoask.com/oauth/token`,
so no custom `exchange`/`refresh` hooks are needed.

### 2. Two response shapes, and one endpoint breaks the pattern

Most endpoints return the entity itself — a form, a question, a tag — with **no envelope**. List
endpoints wrap it as `{results, next, previous, count?}` (`count` present on some, e.g. forms and
tags, absent on others). One endpoint breaks that rule outright:
`GET /questions/{id}/answers` accepts the same `limit`/`offset` as every other list but answers a
**bare JSON array** — confirmed against the vendor's own captured example. [`lib/client.ts`](lib/client.ts)
keeps `entity()`, `list()` and `array()` as three separate methods rather than one that guesses, and
`actions/question-answers-list.ts` is the one action that calls `array()`.

### 3. `GET /forms/{id}/contacts/{id}` carries its own, tighter rate limit

The vendor's collection flags Get Contact specifically: **"subject to a rate limit of 50 requests
per 5 minutes"** — the only *per-endpoint* limit documented anywhere in the collection (VideoAsk
otherwise publishes no rate-limit headers of any kind — see the `request-rate` health check).
Looping this action over many contacts to build a report will start returning 429s well before any
other call in this app does; batch via Filter Responses (`conversation-list`) instead, which returns
each contact's summary (including `tags`, `status`, `scoring`) in one paginated call.

## What is deliberately out of scope

**Direct video/audio upload.** VideoAsk documents three ways to create a question:
external-media-URL (implemented, `question-create`), "uploading media", and "existing media". The
upload path is a two-step, S3-presigned-POST flow — the API hands back
`media_upload.presigned_post_params` (an S3 form-POST target plus temporary AWS credentials), and the
caller then POSTs the raw file bytes directly to
`videoask-uploads-prod.s3(-accelerate).amazonaws.com`. That is a materially different shape from
every other call in this API (multipart form data to a *different* host, holding *temporary AWS
credentials* rather than the VideoAsk token) and is not implemented here. Host your media yourself
(any URL the vendor's player can fetch) and use `question-create`/`question-update`'s `mediaUrl`
field instead.

Also not implemented, and why: Invite Team Member, organization Settings/Working-Schedule/
Notifications (account-admin configuration, not workflow-shaped), Custom Languages (a large
sub-object with no read/list endpoint of its own to round-trip against), and brand Create/Update
(the create flow shares the same S3-presigned-upload shape as question media, for the logo/favicon).

## Health checks

- **`service`** — `status.videoask.com`, a real, claimed Atlassian Statuspage (verified live:
  `page.name` is `"VideoAsk"`, and the vendor's own 404 page links to this exact host as "System
  status"). 14 components: `API`, `Website, Web App and videoasks`, `Auth0 Authentication API` and
  `Subscriptions` are VideoAsk's own; ten AWS regional dependencies plus `iOS App` are reported but
  keyed by the vendor's own component id so they're never mistaken for a VideoAsk-authored outage.
- **`request-rate`** — declared `unavailable`, `severity: "informational"`. A live unauthenticated
  probe against `GET /forms` carried no `x-ratelimit-*`/`retry-after` header, and the vendor's
  collection documents none across its 45+ requests (Get Contact's 50-per-5-minutes limit, above, is
  the one exception, and it is prose-only — nothing on the wire reports remaining headroom against
  it).
- **`auth:oauth2`** (derived) — `GET /me`, chosen because it returns
  `{user_id, username, email, terms_and_conditions, marketing_communications_opt_in,
  tailored_experience_opt_in, third_parties_data_opt_in, created_at}` — confirmed against the
  vendor's own example — with nothing secret in it, unlike a raw OAuth token-introspection response.

No `quota` check: VideoAsk's plan limits (form/response/team-seat counts) are visible in the web
app's billing page but are not exposed by any endpoint in the documented API surface.

## Actions

38 actions across account/organizations, forms, conversations/contacts, questions, respondents,
media, tags and webhooks. Every action's params, request shape and response shape are documented in
its own file under [`actions/`](actions/); the doc comment on each explains the one or two things
about that specific endpoint worth knowing before calling it (e.g. why `contact-delete` takes
`form_id` as a query param while every sibling contact endpoint takes it as a path segment, or why
`form-update`/`question-update` expose both typed fields and a raw `Body (JSON)` passthrough).

`organizationId` is an optional param on nearly every action — VideoAsk documents most endpoints as
accepting an optional `organization-id` header to reach a different organization the caller belongs
to, rather than being locked to the Connection's default one.
