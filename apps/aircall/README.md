# Aircall

Read and act on Aircall calls, resolve and maintain contacts, drive click-to-call from an agent's
Workspace, and manage the users, teams, numbers, tags and webhooks behind them — over the
[Aircall Public API](https://developer.aircall.io/api-references/).

- **API**: `https://api.aircall.io`, version in the path (`/v1`, `/v2`)
- **Auth**: HTTP Basic — `api_id` as the username, `api_token` as the password
- **Actions**: 38 · **Health checks**: `service` · `quota` · 1 derived (`auth:basic`)

Every path, verb, query parameter, body field and enum below was verified on **2026-08-11** against
Aircall's own reference (`developer.aircall.io/api-references/`, which 301s to
`developers.aircall.io/api-references`, 875,367 bytes) plus live probes against `api.aircall.io` and
`status.aircall.com`. Nothing came from a third-party integration directory.

## Is the API alive?

Yes. Grepping the whole reference for `deprecat|sunset|will be removed|end of life` returns 49
matches, and **every one is about a single field or a single endpoint** — not the platform and not
v1:

| What is deprecated | Effect here |
|---|---|
| `Number.open`, `Number.is_ivr` | Documented as stale for Smartflows numbers. Called out in the two Number actions' hints; read `availability_status` instead. |
| `Call.cost` | "Legacy field which has been deprecated, we might reintroduce it." Passed through untouched; not in any declared output. |
| The availability-status *setting* | Business Hours moved to the Smartflows Time Rule widget. |
| Call archiving | "The concept of archiving a call is deprecated for Aircall Workspace users." Not exposed — see [What is deliberately missing](#what-is-deliberately-missing). |
| `realtime_transcription` endpoint | "In its deprecation phase… update/migrate to `transcription`." Not exposed. |
| **User V1 API** | The one that touches this app. See below. |

There is no platform-wide removal date, no v1 sunset, and no version header.

## The five findings

### 1. `403` means the credential is *wrong*, not that it lacks permission

This inverts the usual reading, and getting it backwards reports a dead credential as a healthy one.
Measured live on 2026-08-11:

| Request | Status | Body |
|---|---|---|
| `GET /v1/ping` with no `Authorization` header | **401** | `{"message":"Unauthorized"}` |
| `GET /v1/ping` with a bogus `api_id:api_token` pair | **403** | `{"message":"Forbidden"}` |
| `GET /v1/ping` with a malformed `Basic` header | **403** | `{"message":"Forbidden"}` |
| `GET /v1/definitely-not-real-zzz` | **404** | `{"message":"Not Found"}` |

Aircall's documentation agrees: nearly every endpoint's status table reads **"403 — Forbidden.
Invalid API key or Bearer access token"**, the global error table glosses 403 as "Lack of valid
authentication credentials for the target resource", and **401 does not appear in the documented
table at all** (it comes from the AWS edge, for a request carrying no header). There is no scope
system to be short of — OAuth has exactly one scope, `public_api`, and a Basic API key is
company-wide — so 403 is never "the credential is fine but narrow".

`auth/basic.ts#classifyProbe` classifies from the **body**, never from the status code alone, and
`lib/client.ts#formatAircallError` says so in every error message. Both readings are pinned by tests.

The 404 row also settles the "HTTP 200 is not a real endpoint" question: this API is not a catch-all.

### 2. Ordinary webhook reads return a live shared secret

`GET /v1/webhooks` returns **every** webhook's `token` in plaintext — up to 100 of them in one
response. That field is not an identifier. The reference calls it the "Unique token for request's
authentication" and tells integrators to "use the `token` field to identify from which Aircall
account a Webhook is sent from": it is the shared secret a receiver checks to decide whether an
inbound delivery really came from Aircall. Anyone holding it can forge deliveries.

A workflow step's result is persisted in the run record and routinely echoed into logs, other apps
and human-readable previews, so listing a company's webhooks would turn one read into a durable,
multi-secret leak — the same trap as Mailjet's `/apikey` and Follow Up Boss's `/me`, already banned
pack-wide.

So `lib/client.ts#stripWebhookToken` deletes it on every read: `webhook-list`, `webhook-get` and
`webhook-update`. **`webhook-create` is the one deliberate exception** — there the token is being
*issued*, it belongs to the webhook this very step created, and the receiver cannot verify a single
delivery without it (the same reading the pack already applies to Fathom's `whsec_…`). Aircall
publishes no rotate endpoint and no way to re-read it: if it is lost, delete the webhook and create
another.

The invariant is enforced by a test that **derives** the set of webhook-returning actions from the
action sources rather than listing them, so a new action that returns a webhook without stripping
fails before it ships.

### 3. Users are v2, everything else is v1, and they interleave

Every User V1 page carries the banner *"User V1 API will be deprecated soon. Please migrate to User
V2 API."* But v2 exists **only** for Users, and the v2 User surface is strictly *smaller* than v1's:

| Capability | v1 | v2 |
|---|:-:|:-:|
| List / retrieve / create / update a User | yes | yes |
| `numbers` array embedded on the User object | yes | **no** — "Please note User v2 object doesn't include a numbers object" |
| `GET /users/:id/numbers` | no | yes |
| `GET /users/availabilities`, `GET /users/:id/availability` | yes | **no** |
| `POST /users/:id/calls` (click-to-call), `POST /users/:id/dial` | yes | **no** |
| `DELETE /users/:id` | yes | **no** |

So user *reads* go to **v2** (`user-list`, `user-get`, `user-number-list`) and the three capabilities
v2 never got stay on **v1** (`user-availability-list`, `user-availability-get`, `user-call-start`,
`user-dial`). A well-meant "migrate everything to v2" 404s; the prefixes are pinned by tests.

Code migrating from v1 should also expect `user.numbers` to be **absent**, not empty — that is what
`user-number-list` replaces.

### 4. The status page answers on a different host than the product

| Request | Result |
|---|---|
| `GET https://status.aircall.io/api/v2/summary.json` | **301** → `https://status.aircall.com/api/v2/summary.json` |
| `GET https://status.aircall.com/api/v2/summary.json` | **200**, 17,124 B, 0 redirects |

Both eventually serve the identical document (md5 `e3871743666d504c442228de995372b9`) and the page
self-identifies as `"url": "https://status.aircall.com"` — the vendor treats `.com` as canonical even
though the product's API and marketing live on `.io`. A health check may only reach hosts it declares
and the runtime does not follow a redirect out through the allowlist, so declaring
`status.aircall.io` — the name a reader would write from memory — yields a check that dies on the
301. This app declares and calls **`status.aircall.com`**, from a single exported constant, pinned
by a test.

The page is real, checked three ways:

- **Not a catch-all**: `/api/v2/definitely-not-real-zzz.json` → **404, 0 bytes**, where
  `summary.json` → 200 / 17,124 B and `status.json` → 200 / 214 B. Three distinct answers.
- **Content-type and body**: `application/json; charset=utf-8`, parsing as the Statuspage v2 schema.
  Neither unclaimed-host signature matches (unclaimed `*.statuspage.io` ≈ 127,700 B of HTML,
  unclaimed `*.instatus.com` ≈ 216,800 B).
- **It describes the API, not just the product**: `{"id":"glgfnjclpmlj","name":"Aircall"}`, and among
  its 50 components is **`API & Webhooks`** (id `fgncjccmmjnf`) in the `Integrations & APIs` group.
  An incident on that component is named explicitly in the report, because it is the one that
  explains why this app's own calls are failing.

Nine of the 50 rows are Statuspage `group: true` containers and are excluded — reporting them would
double-count every child.

### 5. The rate-limit headers may only exist once you are already limited

Aircall's rate-limiting section reads: *"Aircall limits the number of requests to its Public API to
120 requests per minute per company. The following headers are available in API headers' responses
**when the rate limit has been reached**"* — then lists `X-AircallApi-Limit`, `-Remaining` and
`-Reset`.

That qualifier admits two readings and leads to opposite checks. It cannot be settled from outside an
authenticated session: the headers can only appear on a **successful, authenticated** response, and
every unauthenticated probe is refused at the AWS edge before Aircall's application runs (a measured
`403` carries `content-type`, `content-length`, `date`, `apigw-requestid`, `x-cache`, `via`,
`x-amz-cf-pop` and `x-amz-cf-id`, and none of the three — which proves nothing either way).

So the `quota` check reads them if they are there and says so plainly if they are not, rather than
guessing, and carries **`severity: "informational"`** because under the pessimistic reading its
steady state is `unknown`, and `unknown` outranks `ok` in the roll-up. `X-AircallApi-Reset` has no
documented unit, so `parseResetAt` accepts both seconds and milliseconds.

Note the limit is **per company, not per API key** — the budget is shared with every other
integration on the account, which is why this check rides on the same `/v1/ping` the credential probe
uses instead of spending a second request.

## Two smaller shapes that bite

- **Update Contact is a `POST`, not a `PUT`.** Aircall flags this itself ("This request is a POST
  method, and not a PUT method!"). Every other update in this app — Tag, Webhook — is a PUT, which is
  exactly why this is the one written wrong.
- **`per_page` maxes out at 50** ("Default is 20. Minimum is 1, maximum is 50"), and paging through
  **Calls or Contacts reaches at most 10,000 records** however large `meta.total` grows. Every list
  action therefore derives `hasMore` from `meta.next_page_link`, never from `count < total` — the
  latter promises pages the API will refuse to serve. Narrow with `from` instead.

Two more worth knowing: `tags` on Search Calls is an **AND** across the array and reaches the wire as
repeated `tags[]` keys (comma-joining silently matches nothing), and a transferred call is indexed
under the transfer **destination**, not the origin — "given a call transferred between A and B phone
numbers, the call will not appear when filtering by A but it will for B".

## Authentication

`auth/basic.ts` — HTTP Basic, `base64(api_id:api_token)` on the `Authorization` header. Both halves
are `type: "secret"`: Basic auth has no notion of a public username, and Aircall cannot show the
token again ("we won't be able to retrieve it for you as Aircall does not store it in plain text").

Aircall also accepts `https://api_id:api_token@api.aircall.io` and warns against it — "URLs are often
stored in browser history and server logs". A workflow host logs request URLs and does not log
request headers, so the credential only ever reaches the wire as a header, built in one exported
function, and no Action can express the URL form because no Action builds a host.

### The credential probe: `GET /v1/ping`

Chosen by measuring the wire, not by its name — a purpose-built ping is exactly the endpoint most
likely to be a public liveness check that proves nothing.

- **It requires a credential.** 401 without one, 403 with a bad one (both measured). A Connection
  whose credential never attached fails here — the failure mode that makes ElevenLabs' `/v1/voices`
  and Apify's `/v2/store` unusable as probes.
- **It returns nothing secret.** The only success body is `{"ping":"pong"}`. Compare
  `GET /v1/webhooks` (returns every webhook's shared secret) and `GET /v1/company` (returns the
  organisation's headcount).
- **There is no scope it could be short of**, so it cannot report a legitimately-narrow credential as
  broken.

### No `afterConnect`, deliberately

The natural label for an Aircall connection is the company name from `GET /v1/company` — which also
returns `users_count` and `numbers_count`. That is an organisation's headcount and infrastructure
size, published into Connection display metadata that every Action can read and every UI renders.
Aircall exposes no narrower identity read (there is no `/v1/me`, and `/v1/ping` names nothing). Given
the choice between an unlabelled Connection and publishing that, this app takes the unlabelled one;
`company-get` returns the same data as an explicit step output, which is a different bargain.

### Why OAuth is not implemented

Aircall's other scheme is fully documented — `https://dashboard.aircall.io/oauth/authorize` →
`POST /v1/oauth/token`, `grant_type=authorization_code`, single scope `public_api`, non-expiring
bearer — but it is **not implementable from here**. It needs a `client_id`/`client_secret` that
Aircall issues by hand after a partner application ("Click the start building button on top of the
page and fill in the form. We will get back to you shortly"), and that application requires an
`install_uri`: a partner-hosted page Aircall opens inside its Dashboard. That is a hosting
commitment, not a config value. Declaring an `oauth2` method with placeholder client credentials
would produce a Connection that cannot complete.

Both schemes hit the same endpoints, so adding it later grows `auth/` and touches nothing in
`actions/`.

## Health checks

| Check | Kind | Posture | Severity | What it answers |
|---|---|---|---|---|
| `service` | `service` | `none`, `network.allow: ["status.aircall.com"]` | `degraded` (default) | Is Aircall up? 50 Statuspage components, verdict from `status.indicator`, with `API & Webhooks` named explicitly when affected. |
| `quota` | `quota` | `signed` | **`informational`** | How much of the company's 120 req/min is left, from the `X-AircallApi-*` headers on `GET /v1/ping`. |
| `auth:basic` | derived | — | — | Projected automatically from the Auth `test` hook. |

`status.aircall.com` is **not** in `w6w.network.allow` — a status host must never see an API token,
so it lives in the check's own per-hook allowlist under an unsigned posture, per
[`HEALTHCHECKS.md`](../../HEALTHCHECKS.md).

A status page that itself fails reports `unknown`, never `down`: a broken status API says nothing
about the vendor.

## Actions

### Calls (8)

| Key | Type | Endpoint |
|---|---|---|
| `call-list` | read | `GET /v1/calls` |
| `call-get` | read | `GET /v1/calls/:id` |
| `call-search` | search | `GET /v1/calls/search` |
| `call-transfer` | perform | `POST /v1/calls/:id/transfers` |
| `call-comment` | perform | `POST /v1/calls/:id/comments` |
| `call-tag` | perform | `POST /v1/calls/:id/tags` |
| `call-recording-pause` | perform | `POST /v1/calls/:id/pause_recording` |
| `call-recording-resume` | perform | `POST /v1/calls/:id/resume_recording` |

Notes: only **six months** of call history is available. Contact details are **absent** from a Call
payload unless `fetch_contact` is set, so `contact: null` does not mean "unknown caller". Recording
and voicemail URLs expire after **1 hour** (3 for the `*_short_url` forms) — store the audio, not the
link. A Call holds at most **five** comments, they cannot be edited or deleted, and one posted via
the API **has no owner**. Transfers are cold-only, do not re-route if the target is unavailable, and
external transfers work only for inbound calls not yet answered; `dispatching_strategy` is Team-only
and is dropped otherwise (pairing it with a user or number is a documented 400). On the recording
endpoints, **400 means "call already ended" and 405 means "recording is disabled on this Number"** —
a configuration state, not a wrong verb.

### Users (7)

| Key | Type | Endpoint |
|---|---|---|
| `user-list` | read | `GET /v2/users` |
| `user-get` | read | `GET /v2/users/:id` |
| `user-number-list` | read | `GET /v2/users/:id/numbers` |
| `user-availability-list` | read | `GET /v1/users/availabilities` |
| `user-availability-get` | read | `GET /v1/users/:id/availability` |
| `user-call-start` | perform | `POST /v1/users/:id/calls` |
| `user-dial` | perform | `POST /v1/users/:id/dial` |

Notes: a User is addressable by numeric id **or by email address** (`GET /v2/users/john.doe@…` is
documented verbatim), which is why `encodeId` restores `@` after `encodeURIComponent` escapes it to
`%40`. Two different availability vocabularies coexist: `availability_status` on a User object is the
coarse working-hours field (`available` / `custom` / `unavailable`), while the availability endpoints
return the operational one (`available`, `offline`, `do_not_disturb`, `in_call`, `after_call_work`) —
"is this agent free right now?" is only answerable there.

`user-call-start` and `user-dial` look interchangeable and are not: the first **rings a phone and
bills a minute** (so `idempotent: false`), the second only pre-fills the agent's dialler and lets
them pick the line (`idempotent: true`). Both need the User available and not on a call (**405**
otherwise), and both are **Workspace Desktop only** — not iOS, not Android. `user-call-start` also
needs an active Number the User is assigned to, which is what `user-number-list` returns.

### Contacts (6)

| Key | Type | Endpoint |
|---|---|---|
| `contact-list` | read | `GET /v1/contacts` |
| `contact-search` | search | `GET /v1/contacts/search` |
| `contact-get` | read | `GET /v1/contacts/:id` |
| `contact-create` | perform | `POST /v1/contacts` |
| `contact-update` | perform | **`POST`** `/v1/contacts/:id` |
| `contact-delete` | perform | `DELETE /v1/contacts/:id` |

Notes: only **shared** Contacts are visible, and **Contacts synced from third-party integrations are
not exposed by the API at all** even though Workspace shows them — a Contact an agent can see on
screen may simply not be listed. Search accepts only `phone_number` and `email`; there is no name or
free-text search and none is faked here. `phone_numbers` is mandatory on create and every entry needs
both a `label` and a `value` (max 20 each) — validated before the request so the error names the
offending row. **Duplicate creates with the same payload create duplicate contacts** (the vendor says
so), hence `idempotent: false`. `order_by` (`created_at` / `updated_at`) exists only on the Contact
endpoints and is what makes an incremental "changed since" sync possible.

### Teams (4)

| Key | Type | Endpoint |
|---|---|---|
| `team-list` | read | `GET /v1/teams` |
| `team-get` | read | `GET /v1/teams/:id` |
| `team-user-add` | perform | `POST /v1/teams/:team_id/users/:user_id` |
| `team-user-remove` | perform | `DELETE /v1/teams/:team_id/users/:user_id` |

Notes: Teams are only used in Numbers' call distribution — they are not a permission boundary.
`team-list`'s embedded user rows carry **more** than `team-get`'s (`availability_status` and
`default_number_id` come from the list endpoint), and the User `available` boolean is absent from
both. Membership lives entirely in the path; there is no request body.

### Tags (5)

| Key | Type | Endpoint |
|---|---|---|
| `tag-list` | read | `GET /v1/tags` |
| `tag-get` | read | `GET /v1/tags/:id` |
| `tag-create` | perform | `POST /v1/tags` |
| `tag-update` | perform | `PUT /v1/tags/:id` |
| `tag-delete` | perform | `DELETE /v1/tags/:id` |

Notes: `call-tag` and `call-search` take **Tag IDs, never names**, so `tag-list` is the lookup that
makes them usable. Tag names are unique company-wide, which is why `tag-create` is `idempotent:
false` — a replay of a create that already succeeded returns 400, not the existing Tag. **Deleting a
Tag also strips it from every Call that carried it**, irreversibly. Aircall's `tag-update` body table
marks both `name` and `color` mandatory while its own worked example sends `name` alone; this action
follows the example and sends only what the caller supplied.

### Numbers (2)

| Key | Type | Endpoint |
|---|---|---|
| `number-list` | read | `GET /v1/numbers` |
| `number-get` | read | `GET /v1/numbers/:id` |

Notes: `open` and `is_ivr` are documented as **no longer updated** for Smartflows numbers and may
return stale values — read `availability_status` instead. `digits` is the display format with spaces;
the unspaced E.164 form (`e164_digits`) is documented as appearing only in webhook events, not here.

### Webhooks (5)

| Key | Type | Endpoint | `token` |
|---|---|---|:-:|
| `webhook-list` | read | `GET /v1/webhooks` | stripped |
| `webhook-get` | read | `GET /v1/webhooks/:webhook_id` | stripped |
| `webhook-create` | perform | `POST /v1/webhooks` | **returned** |
| `webhook-update` | perform | `PUT /v1/webhooks/:webhook_id` | stripped |
| `webhook-delete` | perform | `DELETE /v1/webhooks/:webhook_id` | n/a |

Notes: **leaving `events` empty subscribes to every event type** — around ninety of them — and that
is the vendor's default, on create *and* on update: "If the events field is not specified, Webhook
will be registered to all events by default." So `webhook-update` never sends an `events` field
unless the caller filled one in, and exposes `events_action=add|remove` so the list can be amended
rather than only replaced. This matters most for the main reason to call update at all: Aircall
**auto-deactivates** a webhook whose endpoint keeps failing, and `active: true` is how it comes back
— a naive PUT to flip that flag would silently re-subscribe it to everything. A company may hold at
most 100 webhooks. The legacy numeric webhook id is still accepted in the path, which is how a stored
pre-UUID id is migrated to the `webhook_id` UUID.

### Company (1)

| Key | Type | Endpoint |
|---|---|---|
| `company-get` | read | `GET /v1/company` |

## What is deliberately missing

Documented endpoints this app does **not** expose, and why:

- **Archive / unarchive a Call** (`PUT /v1/calls/:id/archive`, `/unarchive`) — the vendor states "the
  concept of archiving a call is deprecated for Aircall Workspace users" and that the endpoint "no
  longer has any effect in the app UI"; it only toggles a flag. Its own documentation is also
  self-contradictory: both pages say "Sets the `archived` attribute of a Call to **false**", while the
  archive sample response shows `"archived": true`.
- **Delete a Call recording / voicemail** (`DELETE /v1/calls/:id/recording`, `/voicemail`) —
  irreversible, and on AI Assist accounts deletion "will also permanently delete the transcription
  and all AI-generated insights, including summaries, topics, action items, and sentiment analysis".
  The semantics are also awkward enough to need a retry policy this app cannot express honestly: the
  asset "can take up to 24 hours to be received. If it is not present, it will not be deleted", so a
  successful call may delete nothing. Worth adding behind an explicit confirmation; not worth
  shipping as an ordinary step.
- **Create / update / delete a User, create / delete a Team** — seat provisioning with billing and
  access consequences, and User deletion destroys "all data associated to them… won't be
  recoverable". Left out for scope, not for correctness: all are documented and would be
  straightforward to add.
- **A Contact's phone-number and email sub-resources** (`POST/PUT/DELETE /v1/contacts/:id/phone_details`
  and `/email_details`) — `contact-update` covers only the four scalar fields, exactly as the vendor
  splits them. Adding them is mechanical.
- **Messages, High Volume Messages, Dialer Campaigns, Conversation Intelligence, Analytics exports,
  AI Voice Agents, Integrations, Insight Cards, Number updates and Music & Messages** — each is a
  substantial surface of its own (Analytics alone is an async export-and-poll protocol). Out of scope
  for a first pass; none was omitted for lack of documentation.
- **Triggers.** Aircall's webhook events are a rich surface (~90 types across calls, users, numbers,
  messages, contacts, conversation intelligence and analytics) and would make good `TriggerDefinition`
  hooks. This app exposes only the webhook **REST** endpoints, so a workflow registers a delivery URL
  it already owns rather than receiving events directly.

## Development

```bash
deno task validate   # manifest + spec + sandbox audit
deno task check      # typecheck
deno task lint
deno task fmt
deno task test
```

Run them in the api container — there is no `deno` on the devcontainer host:

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/aircall && deno task validate && deno task check \
         && deno task lint && deno task fmt && deno task test'
```

**178 tests** across 44 files: one per action, plus the entry module, the auth method, both health
checks, and the client and params libraries. Every hook is exercised against a mocked `HookContext`
(a queued fake `ctx.fetch`, a recording `ctx.log`); nothing reaches the network.

## Icon

`assets/icon.svg` is the vendor's own mark, downloaded **verbatim** on 2026-08-11 from
`https://www.aircall.io/favicon.svg` (which 301s to `https://aircall.io/favicon.svg`).

- **2,740 bytes**, md5 `8e491a6537a43d75a6433f11aad7e1d9`
- A square `viewBox="0 0 96 96"` glyph — four `<path>` elements, colours `#00bd82` and `#fff`, and
  **no `<text>` or `<tspan>`**, so it is a mark rather than a wordmark. The simple-icons alternative
  (1,097 bytes, `cdn.simpleicons.org/aircall`) was checked and not needed.

The size, viewBox, colours and the absence of text elements are all asserted by a test, so a redraw
or a bare `deno fmt` rewriting the asset fails the suite rather than shipping.
