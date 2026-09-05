# OneSignal

Send push, email, and SMS messages, manage Users, Subscriptions, and Segments, and record custom
events, on OneSignal's current REST API.

- **Categories** — communication, marketing
- **Auth methods** — api-key (`custom`: App ID + App API Key)
- **Actions** — 19
- **Health checks** — 1 live (`service`) + 1 declared absence (`quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.onesignal.com` (the `service` check adds `status.onesignal.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://onesignal.com/
- **API docs** — https://documentation.onesignal.com/reference/rest-api-overview
- **OpenAPI** — https://documentation.onesignal.com/openapi.json
- **Status page** — https://status.onesignal.com/

> **Everything below was verified against OneSignal's own sources on 2026-09-05** — its
> machine-readable OpenAPI 3.1 document
> ([`documentation.onesignal.com/openapi.json`](https://documentation.onesignal.com/openapi.json),
> 1,472,928 bytes, `info.version` `11.6`), the `documentation.onesignal.com` guides it links, and live
> probes against `api.onesignal.com` and `status.onesignal.com`. Nothing here came from a third-party
> integration directory.

## The four things most likely to cost someone a day

### 1. Two key generations coexist, and only one can still be created

OneSignal introduced **App API keys** and **Organization API keys** (`os_v2_app_...`) in November
2024, with names, rotation, and IP allowlisting. The legacy **REST API key** and **User Auth key**
"are still accepted, but the management UI for them has been removed and new keys cannot be created"
— the Keys & IDs guide, verbatim. Anything built against the legacy key type is a dead end for a new
Connection, so this app is built only against the current App API key.

### 2. App key vs Organization key is a hard split, not a scope tier

A disjoint set of endpoints requires an **Organization** API key instead of an App key —
`GET`/`POST /apps` (list/create apps), `PUT /apps/{id}` (update an app's platform config), every
`/apps/{id}/auth/tokens` key-management route, and `/organizations/{id}/audit_logs`. This was
confirmed from each operation's own `Authorization` parameter description in the OpenAPI document,
which literally reads "Your Organization API key" on those and only those. None of them are
implemented here — every action in this app works with a plain App API key. Mixing the two into one
Connection would silently 403 half the app for anyone who (correctly) provisioned only an App key.

### 3. `GET /apps/{app_id}` hands back live push credentials

Reading the app's own configuration is not a safe read. Its response schema includes:

| Field | What it actually is |
| --- | --- |
| `fcm_v1_service_account_json` | The **entire Firebase service-account private key** — capable of sending Android push (and more, depending on the service account's IAM roles) |
| `apns_p8` | Apple's private APNs token-signing key |
| `apns_certificates`, `safari_apns_certificate` | The app's APNs client certificates (private key + cert, PEM) |
| `gcm_key` | The **legacy** GCM/FCM server key — the vendor's own schema marks it deprecated, but it is still live until rotated |

A workflow step's result is persisted in the run record and routinely echoed into logs and previews,
so returning any of these would turn one read into a durable credential leak — the same trap Apify's
`GET /v2/users/me` sets with `proxy.password`. `actions/view-app.ts` strips every one of them
(`stripAppSecrets` in [`lib/client.ts`](lib/client.ts)) before returning anything, and the
credential-liveness probe deliberately reads `/segments` instead of this endpoint for the same reason
— see Auth below. A test in [`tests/actions/view-app.test.ts`](tests/actions/view-app.test.ts) feeds a
fixture carrying every one of those fields and asserts none survives.

### 4. The `?c=push` / `?c=email` / `?c=sms` split in OneSignal's own docs is not a real parameter

The OpenAPI document lists three separate "pages" for Create Message —
`/notifications?c=push`, `?c=email`, `?c=sms` — each with its own required-field set, and none of the
three declares an actual `c` query parameter anywhere in its `parameters` array. The vendor's own curl
example posts to the bare `https://api.onesignal.com/notifications` with **no query string at all**;
the channel is inferred from which body fields are present (`email_subject`/`email_body` for email) or
from an explicit `target_channel` (required for SMS, optional-but-recommended for push/email). This
app never sends the `?c=` form — see [`actions/send-email.ts`](actions/send-email.ts) for the fuller
accounting.

Two smaller traps in the same family, worth knowing before they cost a debugging session:

- **`GET /notifications`'s `kind` filter looks like a channel selector. It is not.** It filters by
  *how the message was created* — `0` dashboard, `1` API, `3` automated (Journeys, etc.) — with no
  `2` in the vendor's own enum. See [`actions/view-messages.ts`](actions/view-messages.ts).
- **`DELETE /apps/{app_id}/users/by/...` answers `202` with the deleted user's `identity` in the
  body**, not an empty response — confirmed from the OpenAPI `responses` block, not assumed from the
  HTTP verb.

## Auth

One method: `api-key`, type `custom` — two fields, not one, because the App ID travels alongside the
credential and every path needs it.

- **App ID** — a public UUID v4. Not a secret (OneSignal's own docs call it safe for client-side SDK
  init); recorded in the Connection's redacted `display` so every action can build its path.
- **App API Key** — `os_v2_app_...`, sent as `Authorization: Key <value>` (confirmed from the OpenAPI
  document's per-operation `Authorization` parameter default, `"Key YOUR_APP_API_KEY"` — **not**
  `Bearer`).

### The probe is `GET /apps/{app_id}/segments`, and it was chosen for the same reason as Apify's

| Candidate | Requires the App API key? | Leaks anything? |
| --- | --- | --- |
| **`/apps/{id}/segments?limit=1`** | ✅ (measured: `401` unauthenticated) | ✅ nothing but segment id/name/filter metadata |
| `GET /apps/{id}` (View an app) | ✅ | ❌ **returns `fcm_v1_service_account_json`, `apns_p8`, …** — see finding 3 |
| `POST /notifications/count-unsaved` | ✅ | side-effect-free, but requires guessing a real segment name to avoid a 400 |

Every app has at least the built-in "Subscribed Users"/"Total Subscriptions" segments, but even an
empty list on a brand-new app still answers `200`, which is all a liveness probe needs.

**A missing header and a syntactically-plausible-but-wrong key answer with the *identical* message**
— measured live on 2026-09-05 against an unauthenticated and a bogus-`Authorization` request to the
same endpoint, both returned:

```
401 {"errors": ["Access denied.  Please include an 'Authorization: ...' header with a valid API key (...)."]}
```

So `test()` cannot distinguish "no credential reached the request" from "the credential is wrong," and
its message says so rather than guessing. `403` is reported separately (IP allowlist, or an
Organization key mistakenly used where an App key belongs; also how `journey-not-entitled` shows up
per the vendor's own 403 FAQ entry), and `404` names the App ID that was not found.

`afterConnect` records nothing beyond the App ID the user already typed — it deliberately never calls
`GET /apps/{app_id}`, for the same reason `view-app` strips it.

## Actions

19 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `send-push` | perform | `POST /notifications` (push) |
| `send-email` | perform | `POST /notifications` (email) |
| `send-sms` | perform | `POST /notifications` (sms) |
| `estimate-recipients` | read | `POST /notifications/count-unsaved` |
| `view-messages` | read | `GET /notifications` |
| `view-message` | read | `GET /notifications/{message_id}` |
| `cancel-message` | perform | `DELETE /notifications/{message_id}` |
| `create-user` | perform | `POST /apps/{app_id}/users` |
| `view-user` | read | `GET /apps/{app_id}/users/by/{alias_label}/{alias_id}` |
| `update-user` | perform | `PATCH /apps/{app_id}/users/by/{alias_label}/{alias_id}` |
| `delete-user` | perform | `DELETE /apps/{app_id}/users/by/{alias_label}/{alias_id}` |
| `create-subscription` | perform | `POST /apps/{app_id}/users/by/{alias_label}/{alias_id}/subscriptions` |
| `update-subscription` | perform | `PATCH /apps/{app_id}/subscriptions/{subscription_id}` |
| `delete-subscription` | perform | `DELETE /apps/{app_id}/subscriptions/{subscription_id}` |
| `create-segment` | perform | `POST /apps/{app_id}/segments` |
| `view-segments` | read | `GET /apps/{app_id}/segments` |
| `delete-segment` | perform | `DELETE /apps/{app_id}/segments/{segment_id}` |
| `create-custom-event` | perform | `POST /apps/{app_id}/custom_events` |
| `view-app` | read | `GET /apps/{app_id}?view=config` (secrets stripped) |

### Idempotency

`send-push`, `send-email`, `send-sms`, and `create-custom-event` all accept an `idempotency_key` and
default it to `ctx.invocation.invocationId` when the caller leaves it blank — OneSignal documents this
as valid for 30 days and the correct way to retry a send without duplicating it. `cancel-message`,
`delete-user`, `delete-subscription`, and `delete-segment` are `idempotent: true` — a delete's end
state is the same however many times it runs. `create-user`, `create-subscription`, `create-segment`,
and the read/update actions are `idempotent: false` or not applicable (`read`/`search`).

### Notes on individual actions

- **`send-push`/`send-email`/`send-sms` share one targeting model** ([`lib/params.ts`](lib/params.ts)):
  Included/Excluded Segments, Subscription IDs, Aliases (+ Target Channel), and Filters. OneSignal
  documents these four as mutually exclusive; this app does not re-validate that client-side —
  the vendor already returns a clear `400` — it just omits whichever fields are left blank so three
  unused targeting modes never send empty arrays that could confuse that validation.
- **`create-custom-event` sends a batch of exactly one.** The vendor's endpoint always takes an
  `events: [...]` array; this action wraps a single event because that is the natural shape for one
  workflow step. Its `202` response does **not** mean the event was accepted — the body separately
  lists any individual events that could not be processed (most commonly because
  `external_id`/`onesignal_id` did not resolve to a user). `output.accepted` is derived from that
  field so a workflow can branch on it without re-deriving the logic itself.
- **`update-user`'s `deltas` increments, `properties`/`tags` sets.** They are exposed as two separate
  fields rather than merged, because conflating "add 1 session" with "set this tag" would silently
  corrupt whichever aliasing scheme a caller assumed.
- **Alias lookups default to `external_id`** ([`lib/alias.ts`](lib/alias.ts)) but accept
  `onesignal_id` or any custom alias key OneSignal's own [Aliases](https://documentation.onesignal.com/docs/en/aliases)
  guide describes.

## Health checks

One live check, one declared absence, plus the derived `auth:api-key`.

### `service` — the status page is real, checked three ways

**(a) Not a catch-all.** `GET /api/v2/summary.json` on `status.onesignal.com` answers `200` with
2,855 bytes of JSON; `/api/v2/status.json` answers `200` with a much smaller 208-byte summary; the
unclaimed-Statuspage decoy at `onesignal.statuspage.io` answers `401` ("Your page is inactive").

**(b) Self-identifies as this product.**
`"page": {"name": "OneSignal", "url": "https://status.onesignal.com/"}`.

**(c) Names OneSignal's own product surfaces**, not a generic template — 9 components: `Push`,
`Email`, `SMS`, `In-App Messages`, `Journeys`, `Integrations`, `Analytics & Reporting`,
`APIs & SDK Endpoints`, `Dashboard / UI`.

`group: true` container rows are excluded from the component map so nothing is double-counted, and the
verdict comes from the page-level `status.indicator` (OneSignal's own roll-up) rather than the worst
component. `credential: "none"` — a status host must never see an App API key.

### `quota` — declared unavailable, informational

OneSignal exposes **no** readable API rate-limit headroom. Verified two ways on 2026-09-05:

1. **Nothing on the wire.** A live `401` from `api.onesignal.com` (both a missing and a bogus
   `Authorization` header) carried `date`, `content-type`, `content-length`, `server`, `via`,
   `alt-svc`, `cf-cache-status`, `set-cookie`, `strict-transport-security`, `cf-ray` — **no**
   `X-RateLimit-*` header of any kind.
2. **Nothing in the documentation.** `/reference/rate-limits` states the ceilings as fixed numbers per
   plan tier (150 or 6,000 requests/sec/app for Create/Cancel Message) and says explicitly the only
   signal is the `429` response itself, `{"errors": ["API rate limit exceeded."]}`, with `Retry-After`
   giving the wait — never a remaining count.

The separate **application message limit** (an app is disabled if it delivers more than 10× its
subscribed-Subscription count in any rolling 15-minute window) is a real, documented ceiling, but it
is evaluated against message *delivery* volume internally and nothing in the REST API exposes how much
of it has been consumed. `severity: "informational"` is load-bearing: an `unavailable` entry always
reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity this would pin
the app's verdict at `unknown` forever.

## Deliberately not covered

OneSignal's REST surface is larger than this app's 19 actions. Left out, and why:

- **Every Organization-API-key endpoint** — list/create apps, update an app's platform config,
  API-key management (`/apps/{id}/auth/tokens/**`), audit logs. See finding 2. A separate app (or a
  second auth method plus a second set of actions gated on it) would be the right shape if this
  surface is needed later; mixing it into this Connection would misreport for anyone using a plain
  App key.
- **Journeys** (`create-journey`, `view-journey(s)`, `update-journey`, `update-journey-node`,
  `delete-journey`, `view-journey-stats`) — a real, substantial surface (create a draft, patch
  individual nodes, poll `state` until active) that deserves its own careful pass rather than a rushed
  inclusion; left out rather than half-covered. Worth adding.
- **Templates** (`create-template`, `update-template`, `view-template(s)`, `delete-template`,
  `copy_to_app`) — same reasoning; a real feature, not a small addition.
- **Message analytics/exports** (`csv-export`, `export-csv-of-events`, message `history`,
  `outcomes`) — async, poll-based exports whose result shape (a signed download URL, GZip-compressed)
  is a different pattern from this app's synchronous request/response actions.
- **Inbox / broadcast messages** (`/apps/{id}/inbox/**`) — a separate, smaller messaging surface
  (in-app inbox items rather than push/email/SMS); left out for scope.
- **Live Activities** (`start-live-activity`, `update-live-activity`) — iOS-specific Dynamic
  Island/Lock Screen updates with their own activity-type lifecycle; a different feature area from
  ordinary messaging.
- **Custom events' `idempotency_key` batch semantics beyond one event** — see the action note above;
  the underlying batch endpoint is fully reachable, this app just wraps it as a single-event action.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's OpenAPI document and was read there.

## Icon

`assets/icon.svg` is OneSignal's own mark, downloaded **verbatim** from
`https://onesignal.com/favicon.svg` on 2026-09-05 — 3,303 bytes, `image/svg+xml`, byte-identical to
the live download (same md5). It is not touched by `deno task fmt`, whose file list names only the
`.ts` directories.

## Layout

```
onesignal/
├── package.json              # manifest — the `w6w` identity block
├── index.ts                  # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts             # OneSignalClient, error formatting, App ID resolution, secret stripping
│   ├── params.ts             # shared targeting Param fragments + body builder
│   └── alias.ts              # shared alias-lookup Param fragments + path builder
├── auth/api-key.ts           # custom (App ID + App API key): sign, test, afterConnect
├── actions/                  # one file per action (19)
├── health/
│   ├── service.ts            # status.onesignal.com
│   └── quota.ts              # declared absence, informational
├── assets/icon.svg           # vendor mark, verbatim
└── tests/                    # 69 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
