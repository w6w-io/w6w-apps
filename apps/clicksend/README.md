# ClickSend

Send SMS, MMS, voice calls and transactional email, and manage contact lists, on the
**ClickSend REST API v3**.

- **Categories** — communication
- **Auth methods** — basic-auth
- **Actions** — 16
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:basic-auth`
- **Egress allowlist** — `rest.clicksend.com` (the `service` check adds `status.clicksend.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://www.clicksend.com/
- **API docs** — https://clicksend.docs.apiary.io/
- **Raw spec** — https://jsapi.apiary.io/apis/clicksend.apib (API Blueprint, 574 KB)
- **Status page** — https://status.clicksend.com/

ClickSend is a multi-channel messaging API: one account, one credential, and five outbound
channels (SMS, MMS, voice, transactional email, and post/fax which this app does not cover — see
"Deliberately not covered"). The channels share one billing model (a single account `balance`,
metered per-message) but each has its own quirks on the wire, which is most of what this README is
about.

> **Everything below was verified against ClickSend's own sources on 2026-08-24** — its API
> Blueprint document ([`jsapi.apiary.io/apis/clicksend.apib`](https://jsapi.apiary.io/apis/clicksend.apib),
> 574 KB, titled "ClickSend REST API v3"), and live probes against `rest.clicksend.com` (including
> the vendor's own published test credentials: `nocredit`/`notactive`/`banned`, each paired with
> `D83DED51-9E35-4D42-9BB9-0E34B7CA85AE`). Nothing here came from a third-party integration
> directory.

## The three things most likely to cost you a day

### 1. `GET /account` hands you a live API key

Verified live on 2026-08-24: the account-details response embeds `_subaccount.api_key` — a
**working credential** for that subaccount, returned in full to any caller holding the account's
own credential:

```json
"_subaccount": {
  "subaccount_id": 1716,
  "api_username": "KCIHOYEYGM",
  "api_key": "IJVEGTCF-VOHU-GSVF-KNKK-XHTARJXMQTXK",
  ...
}
```

A workflow step's result is persisted in the run record and routinely echoed into logs and
previews, so returning it verbatim would turn one ordinary read into a durable credential leak.
`account-get.ts` deletes `_subaccount.api_key` before returning; everything else in the response
(including the rest of `_subaccount`) is unchanged. This is the same trap Follow Up Boss's `/me`
and Mailjet's `/apikey` set, and it is why the Auth health probe (below) never touches this
endpoint either. [`tests/index.test.ts`](tests/index.test.ts) asserts `account-get` is the *only*
action reaching `/account`, and that it strips the field.

### 2. Missing, wrong, and not-yet-activated credentials are indistinguishable — but a suspended one isn't

Verified live on 2026-08-24 against ClickSend's own documented test accounts:

| Case                                         | Response                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| No `Authorization` header at all              | `401 {"response_code":"UNAUTHORIZED","response_msg":"Authorization failed."}` |
| A syntactically valid but wrong API key       | **byte-identical** `401 UNAUTHORIZED`                                    |
| `notactive` (real account, not yet activated) | **byte-identical** `401 UNAUTHORIZED`                                    |
| `banned` (real account, suspended)            | `403 {"response_code":"FORBIDDEN","response_msg":"Your account is suspended. Please contact support for more information."}` |

There is no way to tell "you typed the key wrong" from "your account got deactivated after the
Connection was made" — the Auth `test` hook says so explicitly in its failure message rather than
guessing. The one case that *does* differ is a suspended account, which the `test` hook reports
with ClickSend's own message verbatim, since that is a different problem (contact support) with a
different fix than re-typing a credential.

### 3. The blueprint's own docs are wrong, twice

- **`GET /account/usage/{year}/{month}/{type}`** documents `type` as accepting `"email"` *or*
  `"subaccount"`. Live testing on 2026-08-24 showed every value other than the literal
  `"subaccount"` — including the doc's own `"email"` — rejected with
  `400 {"response_msg":"Type must be 'subaccount' only."}`. `account-usage-get.ts` does not even
  expose `type` as a param; it always sends `subaccount`.
- **`POST /email/send`**'s request schema (the `Attributes` block) lists `to`, `cc`, `bcc`, `from`,
  `body`, `attachments` and `schedule` — and omits `subject` entirely. The one worked request
  example in the very same document includes `subject`, and every response echoes it back.
  `send-email.ts` requires it, following the example rather than the (incomplete) schema table.

## Auth

One method: `basic-auth`, type `basic` — an API username and an API key (ClickSend's dashboard
login username/password also works per the blueprint, but the dedicated API credential is what
every example in the reference uses and what this app's `fields` collect).

ClickSend publishes no OAuth surface for third-party apps.

### The probe is `GET /account/usage/{year}/{month}/subaccount`, chosen by reading the response body

| Candidate                                   | Requires a credential? | Leaks anything?                   |
| -------------------------------------------- | :---------------------: | ---------------------------------- |
| **`/account/usage/{y}/{m}/subaccount`**      | ✅ `401` unauthenticated | ✅ nothing — usage counts and spend only |
| `/account`                                   | ✅                       | ❌ **returns `_subaccount.api_key`** |
| `/countries`                                 | ❌ **answers `200` with no credential at all** | ✅ |

`/countries` is the trap that matters most for a probe: verified live, it answers `200 SUCCESS`
both with **no** `Authorization` header and with a syntactically wrong one — it is genuinely public,
not merely tolerant of a bad key, so a Connection whose credential never got attached would sail
straight through it. `/account` is the trap this README opens with. The usage endpoint needs no
resource-scoped access, and its response — per-channel message/price counts for the month — carries
no credential material anywhere in its schema.

This is also the source for the `quota` health check below, and the `account-usage-get` action.

## Actions

16 actions. `resource` groups them in the editor.

| Key                     | Type    | Endpoint                                              |
| ------------------------ | ------- | ------------------------------------------------------ |
| `send-sms`               | perform | `POST /sms/send`                                       |
| `sms-history-list`       | read    | `GET /sms/history`                                     |
| `sms-cancel`             | perform | `PUT /sms/{message_id}/cancel`                         |
| `send-mms`               | perform | `POST /mms/send`                                       |
| `mms-history-list`       | read    | `GET /mms/history`                                     |
| `send-voice`             | perform | `POST /voice/send`                                     |
| `voice-cancel`           | perform | `PUT /voice/{message_id}/cancel`                       |
| `voice-languages-list`   | read    | `GET /voice/lang`                                      |
| `send-email`             | perform | `POST /email/send`                                     |
| `email-address-list`     | read    | `GET /email/addresses`                                 |
| `account-get`            | read    | `GET /account`                                         |
| `account-usage-get`      | read    | `GET /account/usage/{year}/{month}/subaccount`         |
| `contact-list-create`    | perform | `POST /lists`                                          |
| `contact-list-list`      | read    | `GET /lists`                                           |
| `contact-create`         | perform | `POST /lists/{list_id}/contacts`                       |
| `countries-list`         | read    | `GET /countries` — public, `requiresAuth: false`       |

### Idempotency

Every `send-*` action is `idempotent: false`: ClickSend's send endpoints accept no idempotency key
of any kind, so retrying a dropped connection resends (and double-bills) the message. `sms-cancel`
and `voice-cancel` are `idempotent: true` — cancelling an already-cancelled message is a no-op per
the vendor. `contact-list-create` and `contact-create` are `idempotent: false`: ClickSend has no
get-or-create semantics for either, so a retry genuinely creates a duplicate.

### Notes on individual actions

- **Message parts & pricing.** A standard (GSM) SMS is 160 characters; anything past that splits
  into 153-character *parts*, each billed separately (a 200-character SMS is 2 parts). Any
  character outside the GSM 03.38 set (emoji, non-Latin scripts) forces Unicode encoding, which
  drops the per-part budget to 70 characters. MMS is 1,500 (standard) / 500 (Unicode) characters,
  truncated rather than split. `send-sms`/`send-mms`/`send-voice` all report `messageParts` /
  `messagePrice` in their output so a workflow can see what it was actually billed, rather than
  assuming one message = one credit.
- **Batch sends answer 200 even when a recipient fails.** `send-sms`, `send-mms` and `send-voice`
  each wrap one message in ClickSend's `messages` array (the vendor's own endpoint accepts up to
  1,000 per call — this app always sends one, except when `listId` fans a single call out to every
  contact on a list). A bad recipient shows up as that message's own `status`
  (`INVALID_RECIPIENT`, `INSUFFICIENT_CREDIT`, `INVALID_SENDER_ID`, …), not as an HTTP error. These
  three actions log (but do not throw on) a partial failure — inspect the `messages` output field.
- **`send-mms`'s `mediaFile` sits at the top level of the request, not per-message.** The
  blueprint's own attribute list documents it alongside per-message fields (`to`, `subject`,
  `body`), but the one worked example in the same document shows it outside the `messages` array,
  applied to the whole call. This app follows the example.
- **`send-voice`'s `lang`/`voice` pairing is not universal.** Several language codes
  (`en-in`, `fr-ca`, …) support only one gender in ClickSend's own `voice-languages-list` output.
  An unsupported pairing is rejected as `INVALID_VOICE` inside a 200 batch response, not a 4xx —
  check `voice-languages-list` first if a call comes back with that status.
- **`send-email`'s `from` is a numeric ID, not an address.** `fromEmailAddressId` must be an
  address ClickSend has already verified for the account (`email-address-list`'s
  `email_address_id` where `verified: 1`); ClickSend has no path for stamping an arbitrary `From`
  the way an SMTP relay does. A brand-new sender's first email(s) commonly come back
  `status: "WaitApproval"` — ClickSend's spam-review hold, not a failure.
- **`account-get` strips a live credential.** See "The three things..." above.
- **`account-usage-get` pins `type=subaccount`**, the only value the live API accepts despite the
  docs. See "The three things..." above. It defaults `year`/`month` to the current UTC calendar
  month.
- **`contact-create` needs at least one of phone/fax/email.** ClickSend rejects the call if all
  three are blank; this app does not pre-validate that client-side and lets ClickSend's own `400`
  surface as-is.
- **`countries-list` is genuinely public.** Verified live: `200 SUCCESS` with no credential at all
  and with a syntactically wrong one. It is the one action declaring `requiresAuth: false`.

## Health checks

Two declared checks plus the derived `auth:basic-auth`.

### `service` — a real, currently-updated Statuspage instance

Verified live on 2026-08-24: `status.clicksend.com` (also reachable at
`clicksend.statuspage.io`) has `page.name` = `"ClickSend Service Status"` and an 18-component board
covering the actual product surfaces — `SMS`, `MMS`, `Voice`, `Fax`, `Email`, `Letters`,
`Postcards` (under a `Products` group) and `REST API`, `HTTP API`, `SMPP`, `SMTP`,
`Online Dashboard`, `Webhooks`, `Email to SMS`, `Credit Card Payments` (under `Services`/`Other`).

The `REST API` component — the one this app's own traffic depends on — drives the top-level
`state`, falling back to the page-wide indicator only if that component is ever absent from a
future reshuffle of the board. Every other named component (`SMS`, `MMS`, `Voice`, …) is still
reported in `components`, because a channel-specific outage with the API itself healthy is a real,
distinct failure mode for a multi-channel app — a voice outage should not report as "everything is
fine" just because SMS still works, and it should not report as "ClickSend is down" either.

`credential: "none"` (default) — unauthenticated, reports even before anyone has connected.
`status.clicksend.com` is on this hook's own `network.allow`, never on the app's.

### `quota` — a live, undocumented signal

ClickSend's blueprint has no "Rate Limiting" section despite its own Status Codes table linking to
one, but real rate-limit headers ride on **every** response — verified live on 2026-08-24:

```
x-ratelimit-limit: 6000
x-ratelimit-remaining: 5999
ratelimit-reset: 56
```

`ratelimit-reset` is a **delay in seconds until the window resets**, not a Unix timestamp — the
observed values (49, 56) are far too small to be epoch time, and they shrink between successive
calls in the same window. This check converts it to an absolute ISO `resetAt` itself. It reads the
headers off the same `account/usage/.../subaccount` call the Auth `test` hook already makes, since
ClickSend has no dedicated quota endpoint and the headers are present regardless of which
authenticated call carries them. `credential: "signed"` — this one needs a live Connection, unlike
`service`.

## Deliberately not covered

- **Fax** (`/fax/**`) and **post/direct mail/postcards** (`/post/**`, `/post/direct-mail/**`,
  `/post/postcards/**`) — separate physical-delivery channels with their own file-upload and
  address-validation flows. Left out for scope, not because anything couldn't be confirmed; add
  them by mirroring `send-sms`'s shape against `/fax/send`.
- **SMS/MMS/Voice/Fax delivery-receipt *rule* management** (`/automations/**`) — configuring push
  webhooks for delivery receipts. This app reads history directly (`sms-history-list`,
  `mms-history-list`) rather than managing the receipt-forwarding rules themselves.
- **SMS/MMS/Voice campaign endpoints** (`/sms-campaigns/**`, the campaign forms of send) — a
  higher-volume, less-detailed sibling of the per-message send endpoints this app already covers
  (up to 20,000 recipients against a single list, vs. 1,000 mixed recipients for the per-message
  form).
- **Contact list import/export, CSV preview, duplicate removal** (`/lists/{id}/import`, `/export`,
  `/import-csv-preview`, `/remove-duplicates`) and **contact suggestions** (`/contact-suggestions`)
  — bulk/CSV-shaped operations layered on top of the `contact-create`/`contact-list-create` this
  app already covers.
- **Account/subaccount/reseller administration** (`POST /account`, `PUT /account`,
  `/account-verify/**`, `/subaccounts/**`, `/reseller/**`, `/forgot-username`,
  `/forgot-password/**`) — provisioning and account-management surface, not workflow automation.
- **Email marketing** (`/email-campaigns/**`, `/email/templates/**`, `/email/master-templates*`) —
  a separate bulk-email product from the transactional `send-email` this app covers.
- **Recharge / billing** (`/recharge/**`) — adding credit to the account, a billing operation.
- **Uploads** (`POST /uploads?convert={type}`) — the file-conversion step `send-mms` mentions for
  png/bmp/jpeg attachments. Left out because it produces an intermediate URL with no independent
  use outside a send, and no format restriction blocked verifying it — left out for scope.
- **Statistics, delivery issues, timezones, SDK download, search** (`/statistics`,
  `/delivery-issues`, `/timezones`, `/sdk-download/{type}`, `/search/contacts-lists`) —
  dashboard-support endpoints with no corresponding automation need.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's own API Blueprint and was read there.

## Icon

`assets/icon.png` is ClickSend's own mark, extracted pixel-exact from
`https://www.clicksend.com/favicon.ico` on 2026-08-24 — the 48×48 frame of a 3-resolution
(16/32/48) uncompressed 32bpp ICO, decoded with a from-scratch BMP→PNG conversion (no lossy
resampling; every pixel including alpha is copied verbatim from the ICO's own 48×48 entry). No
`.svg` or `apple-touch-icon` was reachable on `www.clicksend.com` or `help.clicksend.com`. It is not
touched by `deno task fmt`, whose file list names only the `.ts` directories.

## Layout

```
clicksend/
├── package.json                # manifest — the `w6w` identity block
├── index.ts                    # entry: { actions, auth, healthChecks }
├── lib/
│   └── client.ts                # ClickSendClient, the envelope shape, pagination, error formatting
├── auth/basic-auth.ts           # HTTP Basic: sign, test
├── actions/                     # one file per action (16)
├── health/
│   ├── service.ts                # status.clicksend.com, weighted on the REST API component
│   └── quota.ts                  # x-ratelimit-* headers, signed
├── assets/icon.png               # vendor mark, pixel-exact from favicon.ico
└── tests/                        # entry module, every action, auth, health, lib
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
