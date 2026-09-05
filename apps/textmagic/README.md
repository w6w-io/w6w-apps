# TextMagic

Send and schedule text messages, and manage contacts, lists, templates and two-way conversations
("chats"), on the **TextMagic REST API v2**.

- **Categories** — communication, marketing
- **Auth methods** — basic
- **Actions** — 25
- **Health checks** — 2 (`service`, `quota`) + ~~`request-rate`~~ + the derived `auth:basic`
- **Egress allowlist** — `rest.textmagic.com` (the `service` check adds `status.textmagic.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://www.textmagic.com/
- **API docs** — https://docs.textmagic.com/
- **OpenAPI** — https://docs.textmagic.com/swagger.json
- **Status page** — https://status.textmagic.com/

TextMagic is a bulk SMS and business texting platform. This app covers the core messaging
lifecycle: sending and scheduling messages, managing contacts and the lists that group them,
saving reusable templates, and reading chat and scheduled-message state.

> **Everything below was verified against TextMagic's own sources on 2026-09-05** — its
> machine-readable OpenAPI (Swagger 2.0) document
> ([`docs.textmagic.com/swagger.json`](https://docs.textmagic.com/swagger.json), 2,310,913 bytes,
> `info.version` `"2"`, `host` `rest.textmagic.com`), the `docs.textmagic.com` prose sections it
> embeds, and live probes against `rest.textmagic.com` and `status.textmagic.com`. Nothing here
> came from a third-party integration directory.

## The things most likely to cost someone a day

### 1. `sendingTime` is deprecated — the schema says so, in the field itself

`POST /messages`'s own schema marks the Unix-timestamp `sendingTime` field `"deprecated": true` and
tells you to use `sendingDateTime` (`Y-m-d H:i:s`) plus `sendingTimezone` instead. `message-send`
exposes only the non-deprecated pair — `sendingTime` is not a param on this Action at all, and a
test in [`tests/actions/message-send.test.ts`](tests/actions/message-send.test.ts) pins that.

### 2. `POST /lists/{id}/contacts` *replaces* a list's membership — it does not add to it

The endpoint's summary reads "Reset list members to the specified contacts", but its plain English
name in TextMagic's own docs and every third-party mention of it reads like "add contacts to a
list". The vendor's own `operationId`, `clearAndAssignContactsToList`, is the only place that says
what it actually does: every existing member not named in the call is **removed**. This app names
the Action `list-set-contacts` (not `list-add-contacts`) and both its title and description state
the replace-not-add behavior explicitly — see [`actions/list-set-contacts.ts`](actions/list-set-contacts.ts).

### 3. Two auth schemes are documented; only one is a declared security scheme

TextMagic's "Getting started" page documents both HTTP Basic auth and an `X-TM-Username` /
`X-TM-Key` header pair as equivalent ways to authenticate. Only `BasicAuth` (HTTP Basic) appears in
the OpenAPI document's `securityDefinitions`, applied by default to all 139 paths — the header pair
appears nowhere in the machine-readable spec. This app implements Basic, the scheme the spec itself
declares; see [`auth/basic.ts`](auth/basic.ts).

### 4. `Lists` and `Distribution Lists` are two unrelated features with confusingly similar names

`/api/v2/lists` (tag `Lists`) is the plain contact-grouping feature this app covers — what targets
`message-send` and organizes `contact-create`. `/api/v2/distribution-lists` (tag `Distribution
Lists`) is a completely separate email-to-SMS forwarding feature with its own `recipients` shape
(`contactIds`/`groupIds`/`segmentIds`/`numbers`) and no relationship to the first. This app
deliberately implements only `Lists` — see [`actions/list-create.ts`](actions/list-create.ts).

### 5. No response header, anywhere, exposes rate-limit headroom

TextMagic documents fixed prose ceilings — 50 requests/second account-wide, 5/second on four
specific write endpoints (`DELETE /contacts/blocked`, `PUT /contacts/{id}`, `PUT`/`POST
/lists/{id}/contacts`) — and states the only signal of exceeding either is the `429` response
itself. Verified live on 2026-09-05: neither a 200 nor a 401 response carries any
`X-RateLimit-*`/`RateLimit-*` header. `health/request-rate.ts` declares this dimension
`unavailable` at `informational` severity rather than guessing; account balance, which *is*
readable, is reported by `health/quota.ts` instead.

## Response shapes

Unlike some REST APIs in this pack, TextMagic does **not** wrap single resources in an envelope —
`GET /messages/{id}` returns the message object directly, and `POST`/`PUT` create/update endpoints
return `{id, href}` (a `ResourceLinkResponse`), not the created/updated resource. List endpoints
return a flat `{page, pageCount, limit, resources}` page — there is no `total` count, only a page
count, so "are there more pages" is `page < pageCount`. Errors are always `{"code", "message",
"errors"?}`; `errors` (field → message[]) is present only when `message` is the literal
`"Validation Failed"`.

## Actions

| Resource | Actions |
| --- | --- |
| Account | `account-get` |
| Messages | `message-send`, `message-list`, `message-get`, `message-delete` |
| Contacts | `contact-create`, `contact-list`, `contact-get`, `contact-update`, `contact-delete` |
| Lists | `list-create`, `list-list`, `list-get`, `list-delete`, `list-set-contacts` |
| Templates | `template-create`, `template-list`, `template-get`, `template-delete` |
| Chats | `chat-list`, `chat-get`, `chat-messages-get` |
| Scheduled messages | `schedule-list`, `schedule-get`, `schedule-delete` |

Deliberately out of scope — not implemented, not guessed at: Email Campaigns, Distribution Lists
(see finding 4 above), Surveys, push tokens, subaccount management, number provisioning, carrier/
email lookups, and voice/call pricing. None of these are wired here.

## Auth

**Username & API Key** (`basic`) — HTTP Basic auth, username plus an API key minted at
[my.textmagic.com/online/api/rest-api/keys](https://my.textmagic.com/online/api/rest-api/keys)
(never the account login password). See [`auth/basic.ts`](auth/basic.ts) for why the credential
probe is `GET /ping` rather than the more obvious `GET /user`: `/ping`'s `{userId, ping,
utcDateTime}` body is the smallest possible proof of a live session and needs no account-level
read scope beyond the bare credential, where `/user` (while not secret) is a heavier read this app
already exposes as an Action.

## Health checks

- **`service`** (`kind: "service"`, unsigned, app-scoped) — `status.textmagic.com`, a genuine,
  currently updated Atlassian Statuspage. Weighted on the `SMS API Gateway` and `Sending text
  messages (Outbound SMS)` components — the two this app's traffic actually depends on — with the
  other seven (`Web App`, `Receiving text messages (Inbound SMS)`, `Email campaigns`, `Email to
  SMS`, `Voice services`, `Mobile App`, `Billing`) reported per-component only.
- **`quota`** (`kind: "quota"`, signed, connection-scoped) — the account's pre-paid balance
  (`GET /user`'s `balance` field). TextMagic bills sending against this balance directly rather
  than a request-rate ceiling, so this reports `down` when it is exhausted (sending will be
  refused, not slowed) and `ok` otherwise — there is no vendor-stated "credit limit" to compute a
  percentage against, so no arbitrary low-water threshold is invented.
- **`request-rate`** (`kind: "quota"`, declared `unavailable`, `informational` severity) — see
  finding 5 above.
- **`auth:basic`** — derived automatically from the Auth `test` hook.

## Development

```bash
deno task validate   # manifest against spec rules
deno task check       # typecheck
deno task lint         # deno lint
deno task test          # unit tests
deno task fmt            # format (use this, never bare `deno fmt` — see CLAUDE.md)
```
