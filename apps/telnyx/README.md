# Telnyx

Send SMS/MMS, place and control voice calls, and look up phone numbers via Telnyx.

- **Categories** — communication, devops
- **Auth methods** — api-key (bearer)
- **Actions** — 6
- **Egress allowlist** — `api.telnyx.com`
- **Website** — https://telnyx.com
- **API docs** — https://developers.telnyx.com/docs/overview

Verified 2026-09-05 against Telnyx's own public OpenAPI 3 document —
`https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json`
(`info.version` `2.0.0`, ~6.7 MB) — plus a live probe of `status.telnyx.com`. Nothing here
came from a third-party integration directory.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `send-message` | perform | `POST /messages` |
| `get-message` | read | `GET /messages/{id}` |
| `make-call` | perform | `POST /calls` |
| `hangup-call` | perform | `POST /calls/{call_control_id}/actions/hangup` |
| `lookup-number` | read | `GET /number_lookup/{phone_number}` |
| `list-phone-numbers` | search | `GET /phone_numbers` |

## Findings that would have cost someone a day

1. **A call needs a Call Control Application, not just a phone number.**
   `CallRequest.connection_id` is `required` alongside `to`/`from` — it names a Call
   Control Application you create once in the Telnyx portal (Voice → Call Control
   Applications), not any property of the calling number itself. There is no way to dial
   with a bare phone number; skipping this is the most common way a first integration
   gets stuck on a 422.

2. **Calling and messaging are both fire-and-poll, not request/response.** `POST /calls`
   answers with a `call_control_id` *before* the destination has answered — whether/when
   it does arrives later as a `call.answered` / `call.hangup` webhook this app does not
   subscribe to. `POST /messages` answers **`200`, not `201`**, with the message merely
   queued: the response's per-recipient `to[].status` is `queued`/`sending`, never yet
   `delivered`. `get-message` is provided for polling the message side; there is no
   equivalent read-back for a call leg in this app's scope.

3. **The status page's duplicate component names cannot be disambiguated via the API.**
   `status.telnyx.com` repeats "API V1" and "API V2" twice each with **no
   `group`/`group_id` field anywhere in the API response** — unlike the same
   repeated-name shape other apps in this pack resolve via `group_id` (e.g. Lever). There
   is also no messaging-specific component at all. `health/service.ts` falls back to the
   page-level indicator except for two components that are genuinely unique in the list
   ("Number Lookup API", "Outbound Calling Services - United States/Canada").

4. **Auth failures share one error code across every namespace, and it's not a 401 you
   can trust blindly.** Every Telnyx error response is `{"errors":[{"code","title",
   "detail"}]}`, and a bad key answers with `code: "10009"` ("Authentication failed") in
   `numbers_Errors`, `messaging_Errors` and `call-control_Errors` alike — so `auth/api-key.ts#test`
   reads that structure rather than trusting a specific HTTP status.

5. **The OpenAPI document itself has duplicate/renamed paths for the same operation**
   (e.g. `/legacy/reporting/usage_reports/number_lookup` vs.
   `/legacy_reporting/usage_reports/number_lookup`, `/messages/alphanumeric/sender/id` vs.
   `/messages/alphanumeric_sender_id`) — a sign the spec itself isn't perfectly
   deduplicated. None of the paths this app calls have a sibling like this, but it's worth
   knowing before trusting a `grep` across the document for "the" path to an operation.

## Deliberately out of scope

Telnyx's OpenAPI document declares 901 paths. This app covers the coherent core of
Messaging, Voice (Call Control dial/hangup) and Numbers; everything else is left out
rather than guessed at:

- **The other ~40 Call Control in-call actions** — answer, bridge, transfer, refer,
  gather (DTMF/speech/AI), playback, recording, SIP REFER/INFO, streaming, forking,
  SIPREC, conferencing/queues, AI Assistant join, deepfake detection, and more. Only
  `make-call` (dial) and `hangup-call` are implemented.
- **WhatsApp and RCS messaging** (`/messages/whatsapp`, `/messages/rcs`,
  `/whatsapp/*`) — separate onboarding and profile-management surfaces of their own.
- **Number ordering, porting and configuration** — `/available_phone_numbers`,
  `/phone_numbers/jobs/*`, `/phone_numbers/{id}/messaging`, `/phone_numbers/{id}/voice`,
  regulatory requirements, emergency address setup. `list-phone-numbers` is read-only.
- **Messaging Profiles, alphanumeric sender IDs and number pools** — configured
  out-of-band in the Telnyx portal; this app accepts a `messagingProfileId` on
  `send-message` but does not manage profiles.
- **Fax, Video, and Wireless (SIM/eSIM) products**, and the many auxiliary APIs sharing
  this one OpenAPI document (email inboxes, AI conversations, verification, brand
  registration, etc.).
- **Multi-destination dialing and inline DTMF-on-answer shorthand** in `CallRequest.to`
  — only a single string destination is exposed.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.telnyx.com>

```
GET https://status.telnyx.com/api/v2/summary.json
```

A genuinely claimed Atlassian Statuspage (`page.name: "Telnyx"`, live incidents — not a
`statuspage.io`-hosted decoy), confirmed live 2026-09-05. It carries a page-level
`status.indicator` (`none`/`minor`/`major`/`critical`) plus ~90 named components, most of
them per-region points of presence. Two components repeat with no `group`/`group_id`
field to tell the copies apart ("API V1", "API V2" — one instance of each was
`degraded_performance` at check time, the other `operational`), and there is no
messaging-specific component at all. `health/service.ts` therefore reports the
page-level indicator as `state`, and additionally names the two component groups that
are unambiguous in the list: `"Number Lookup API"` (covers `lookup-number`) and
`"Outbound Calling Services - United States"` / `"… - Canada"` (covers `make-call` /
`hangup-call`).

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /v2/phone_numbers/slim?page[size]=1
```

Chosen because the OpenAPI document itself calls `/phone_numbers/slim` "a lighter version
of the /phone_numbers endpoint having higher performance and rate limit," and any working
key can list its own numbers — even zero of them — so this never fails for a live key
that simply owns no inventory. A failure is read from the response **body**
(`{"errors":[{"code":"10009", ...}]}`), not from the HTTP status alone — see finding 4
above.

### Do we have quota left?

No headroom endpoint or rate-limit response header exists anywhere in the OpenAPI
document (searched every spelling of "rate limit" — the handful of hits describe fixed
per-feature cooldowns in prose, not a counter to read). Declared `unavailable`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.telnyx.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

**`quota` is declared absent.** Telnyx publishes no headroom endpoint or rate-limit
response headers in its OpenAPI document. A declared absence always reports `unknown`,
so it carries `severity: "informational"` — otherwise it would pin every verdict for this
app at `unknown` forever.

---

Researched and endpoint-verified 2026-09-05.
