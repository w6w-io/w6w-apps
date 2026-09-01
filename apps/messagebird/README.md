# MessageBird

Send SMS and text-to-speech voice messages, run phone-number verification (OTP) flows, and look up
phone numbers, on MessageBird's classic REST API.

- **Categories** — communication
- **Auth methods** — access-key
- **Actions** — 7
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:access-key`
- **Egress allowlist** — `rest.messagebird.com` (the `service` check adds `status.bird.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://bird.com (formerly messagebird.com)
- **API docs** — https://developers.messagebird.com/api/
- **Status page** — https://status.bird.com/ (formerly status.messagebird.com)

## MessageBird is now Bird — what that changes here

MessageBird rebranded to **Bird**. Verified 2026-09-01, live:

- **The API host does NOT move.** `https://developers.messagebird.com/api/` is still the current,
  documented reference, and its examples still hit `https://rest.messagebird.com` with
  `Authorization: AccessKey {accessKey}`. This app calls that host — not any newer `bird.com` API —
  because it is the one the reference above actually documents end to end.
- **The marketing site and icon moved.** `www.messagebird.com` now redirects to `bird.com`, and
  `www.messagebird.com/favicon.svg` 301s to `bird.com/favicon.svg` — the file used at
  [`assets/icon.svg`](assets/icon.svg) (1,430 bytes, black/white with a dark-mode media query). That
  redirect target, not the old messagebird.com mark, is the vendor's current live icon.
  `appearance.icon.alt` says "Bird (formerly MessageBird)" so the rename doesn't get lost in the UI.
- **The status page moved.** `status.messagebird.com` 301s to `status.bird.com` (Statuspage page name
  "Bird"). That page now covers Bird's *entire* platform — Dashboard, CRM, Payments, AI Hub, and
  per-region Connectivity components — not just this classic REST API, so the `service` health check
  below reads only the two components whose own description names this app's surface.
- **A separate, newer Bird API exists and is out of scope here.** The status page lists a
  `Messaging - API` component distinct from `SMS - API` (whose description is literally
  `https://rest.messagebird.com`) — that is Bird's newer unified messaging product. This app does not
  call it; everything here is the classic, still-documented REST API.

## Actions

| Key | Type | What it does |
|---|---|---|
| `send-sms` | perform | Send an SMS (plain, binary, or flash) to one or more recipients, with optional scheduling and a status-report callback. |
| `message-get` | read | Retrieve a sent/received SMS message and its per-recipient delivery status. |
| `message-list` | search | List messages, filtered by originator, recipient, direction, type, status, or a free-text search term. |
| `verify-request` | perform | Start an OTP flow: send a one-time code by SMS, flash SMS, voice call, or email. |
| `verify-check` | perform | Check the code a user typed back in. Can only be done once per token — MessageBird invalidates it either way. |
| `lookup-number` | read | Resolve a phone number's country, line type (mobile/landline/voip/…), and canonical formats, without sending anything. |
| `voice-message-send` | perform | Call one or more recipients and read a text-to-speech message aloud, with answering-machine handling and repeat count. |

Everything above was verified directly against `developers.messagebird.com/api/{sms-messaging,
verify, lookup, voice-messaging}/` on 2026-09-01 — request/response shapes, required vs. optional
parameters, and the documented error envelope (`{"errors":[{"code","description","parameter"}]}`).
**Not included, deliberately:** the Conversations API (WhatsApp/omnichannel — a separately
authorized, much larger surface), the Voice **Calling** API (call flows/TwiML-equivalent — a
different resource from the Voice *Messaging* API this app uses), Contacts/Groups, HLR, MMS, Numbers,
and Partner Accounts. None of these were skipped for lack of verification; they were left out to keep
this app to the messaging/verification/lookup slice actually asked for.

## Auth

**Access Key** (`type: apiKey`) — MessageBird's single credential, sent as
`Authorization: AccessKey {accessKey}` (not Bearer, not Basic). Test keys carry a `test_` prefix;
live keys have none.

`test` probes `GET /balance`, which returns the account's own prepaid/postpaid balance
(`{"payment","type","amount"}`) — never the caller's own key, so the probe can't leak the credential
it's validating. Per this pack's rule against classifying a credential from the HTTP status alone,
the hook reads the response **body**: a balance object means the key is live, and MessageBird's
documented `{"errors":[...]}` envelope means it isn't — its `description` is surfaced rather than a
bare status code.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something the
app itself performs directly (via `Auth.test`, above).

### Is the vendor up?

**Service status** — <https://status.bird.com>, Atlassian Statuspage, unauthenticated:

```
GET https://status.bird.com/api/v2/summary.json
```

Bird's status page is huge — it covers the whole Bird platform, not just this API — so `service`
reads only the two components whose own `description` field names this app's surface:

| Component | Description | Covers |
|---|---|---|
| `SMS - API` | `https://rest.messagebird.com` | send-sms, message-get, message-list, verify-request, verify-check, lookup-number |
| `Voice - API` | (none — matched by name) | voice-message-send |

`SMS - API V1` (`https://api.messagebird.com`, a **different** host this app never calls) and
`Messaging - API` (Bird's newer unified messaging product) are excluded on purpose — including a
degraded/major-outage state there does **not** move this check.

### Is this credential live?

The Auth `test` hook, above — `GET /balance`.

### Do we have quota left?

No headroom endpoint or rate-limit response headers. MessageBird documents fixed per-method request
ceilings (`GET` 50/s, `POST` 500/s, `PATCH`/`DELETE` 50/s) and answers `429 Too Many Requests` once
exceeded, but nothing to read ahead of that.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-key` | credential | connection | signed | fatal | — | derived from the `access-key` auth method's `test` hook |

The host `status.bird.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

**`quota` is declared absent.** MessageBird publishes fixed rate limits but no headroom endpoint or
response headers to read against them. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-09-01, including the MessageBird→Bird rebrand's effect on the
host, icon, and status page. Status surfaces move; re-check with `_tools/audit.ts` conventions in
mind if a probe starts failing for everyone at once.
