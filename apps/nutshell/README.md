# Nutshell

Read and write [Nutshell](https://www.nutshell.com) CRM Leads, Accounts (companies) and Contacts
(people), and log notes, over Nutshell's legacy **JSON-RPC** API.

---

## This is JSON-RPC, not REST — read this first

Nutshell ships two separate API products today:

- A newer **REST API**, documented at `developers.nutshell.com` (`PATCH`-style updates with `op`/
  `path`/`value` operations).
- The original **JSON-RPC API**, documented separately at `developers-rpc.nutshell.com`. Nutshell's
  own docs describe its status plainly: *"We are no longer adding new endpoints, but we will
  continue to support its use by our customers."*

**This app speaks the JSON-RPC API.** There is no resource routing: every action is one
`POST https://app.nutshell.com/api/v1/json` with a body of

```json
{ "jsonrpc": "2.0", "id": "1", "method": "getLead", "params": { "leadId": 1000 } }
```

`method` names the RPC call and `params` is a named-argument object — Nutshell's own docs: *"Nutshell
uses JSON-RPC v2.0 and supports named parameters."* A successful call answers `HTTP 200` with
`{"result": ..., "id": ..., "jsonrpc": "2.0"}`; a failed one carries a JSON-RPC `error` object instead
(see below). Because of this shape, every "action" in this app names the Nutshell method it calls in
its own doc comment, rather than a URL.

## Auth: HTTP Basic — a user's email + an API key

Confirmed against Nutshell's authentication reference: **all** of Nutshell's APIs (REST, GraphQL,
JSON-RPC) use HTTP Basic authentication.

- **Username** — a Nutshell user's email address.
- **Password** — an API key, created under **Setup > API keys** in Nutshell.

If the API key allows **impersonation**, the email may belong to any user in the account and changes
are attributed to them; otherwise the email must belong to the key's own owner and changes are
attributed to the key's name. (Nutshell's JSON-RPC docs also allow the *company domain* as the
username instead of a user's email — not used by this app, since a domain-only key has no natural
name to label a Connection with.)

## Error handling — verified on the wire, 2026-09-06

Nutshell's JSON-RPC endpoint was exercised live (against Nutshell's own published API sandbox,
`jim@demo.nutshell.com`) to confirm the exact failure shapes this app handles:

| Case | HTTP status | Body |
|---|---|---|
| Success | `200` | `{"result": ..., "id": ..., "jsonrpc": "2.0"}` — **no `"error"` key at all**, not even `null` |
| Bad/wrong API key | `401` | `{"error": {"code": 401, "message": "API key not found", "data": null}, ...}` |
| Unknown method | `404` | `{"error": {"code": -32601, "message": "Method not found", "data": null}}` |
| Stale `rev` on an edit | `409` | `{"error": {"code": 409, "message": "rev key is out-of-date", "data": null}}` |

The takeaway that would otherwise cost real debugging time: **a rejected Nutshell credential is a
real transport-level `401`, not a `200` hiding an error object** (unlike some JSON-RPC APIs). But this
app still reads the response **body**, not just the status, in every case — the status alone carries
no message a person could act on, and it is the body that names *which* problem occurred. See
`lib/client.ts`'s `unwrapRpc` for the single place this is done.

## Revs: mandatory optimistic concurrency

Every `get`/`find` response carries a `rev` (a string — Nutshell's own docs warn not to assume it
increments like an integer). Every `edit*` call **requires** the `rev` you last read the record at;
Nutshell rejects the write with the `409` above if the record changed since. This app's Update
actions surface `rev` as a required parameter rather than hiding it — pass the value you got back
from Get/Find/Create for that same record.

Nutshell documents a `"REV_IGNORE"` sentinel that skips the check entirely. This app does **not**
expose it as a convenience, since silently clobbering a concurrent edit is exactly the failure revs
exist to prevent.

**Multi-value fields replace, they don't merge.** Supplying any value for `phone`, `email`, `url`,
`tags`, etc. on an edit **replaces the entire list**, not just appends. If you want to add one phone
number to a Contact that already has two, you must resend all three. A `note`, in contrast, is always
**appended** — existing notes cannot be removed via the API.

## Actions

**Leads**
- **Get Lead** (`getLead`) — one Lead by internal ID. Note this is *not* the number shown on the
  website (`Lead-1000`) — use Find Leads with a `number` query for that.
- **Find Leads** (`findLeads`) — search by status, account, contact, milestone (stage), or website
  Lead number, plus a raw JSON query escape hatch for the rest of Nutshell's documented query keys
  (`tag`, `dueTime`, `assignee`, `origin`, `channel`, `source`, `priority`, `stagesetId`, ...).
- **Create Lead** (`newLead`) — every field is optional; Nutshell attaches the default sales process
  automatically.
- **Update Lead** (`editLead`) — description, stage (`milestoneId`), confidence, pending flag, an
  appended note, plus an Additional fields escape hatch. Closing/reopening a Lead (`outcome`,
  `status`) is left to Additional fields since which outcomes exist is per-instance configuration
  (`findLead_Outcomes`), not something a manifest can enumerate.

**Accounts (companies)**
- **Get Account** / **Find Accounts** (`getAccount` / `findAccounts`) — the latter supports
  `hasOpenLeads` and `tag` as named query keys, plus the raw-query escape hatch for `accountType`,
  `industry`, `territory`, `origin`.
- **Create Account** / **Update Account** (`newAccount` / `editAccount`).

**Contacts (people)**
- **Get Contact** / **Find Contacts** (`getContact` / `findContacts`) — search by `accountId`,
  `leadId`, or `tag`.
- **Create Contact** (`newContact`) — Nutshell will not create a totally empty Contact: it requires
  at least a name, phone number, or email address.
- **Update Contact** (`editContact`) — note Nutshell's own caveat: editing the email list may make
  the returned `lastContactedDate`/`contactedCount` momentarily inaccurate.

**Notes**
- **Add Note** (`newNote`) — logs a note against a Lead, Account, or Contact.

## Not implemented (deliberate scope, not a documentation gap)

`deleteLead`, `deleteAccount`, and `deleteContact` are documented, straightforward (`id` + `rev`),
and could be added following the same pattern as the update actions above — left out of this first
pass to keep it focused on the create/read/search/update lifecycle. `findCustomFields`,
`findMilestones`, `findStagesets`, and `findLead_Outcomes` are useful *lookup* methods (ids you would
feed back into the actions above) that were left out for the same reason.

## Health checks

- **`service`** (`kind: service`) — reads Nutshell's own status page,
  [status.nutshell.com](https://status.nutshell.com) (a verified Atlassian Statuspage: its
  `/api/v2/status.json` self-identifies as `{"page": {"id": "2qwvjdg4xvkv", "name": "Nutshell", ...}}`,
  and a bogus path 404s rather than being caught by a redirect/catch-all). The page lists 12
  components, most unrelated to the API (marketing email, business card scanner, support chat) — this
  check reads only the **"Nutshell application"** component (id `5q688w26m371`), the one that covers
  `app.nutshell.com`, the exact host this app's JSON-RPC calls hit.
- **`quota`** (`kind: quota`, `severity: informational`) — declared **unavailable**. Nutshell
  documents rate limiting only in prose ("we rate limit a few large requests... most notably `find`
  requests with non-stub responses") with no numeric limit, and a live successful response carried no
  `RateLimit`/`X-Rate-Limit-*`/`Retry-After` header of any kind (verified 2026-09-06) — there is
  nothing on the wire to read.
- The credential-liveness check is derived automatically from `auth/basic.ts`'s `test` hook, which
  calls `getUpdateTimes` — a parameterless method whose response is a small map of bin names to
  timestamps, chosen because it cannot be mistaken for credential material or a specific person's PII
  while still requiring a valid, authenticated call to answer at all.

## Network

Only `app.nutshell.com` is declared in the App's `network.allow` — the single JSON-RPC endpoint host.
`status.nutshell.com` is declared separately, scoped to the `service` health check's own
`network.allow`, per this pack's convention that a status host must never be reachable from a signed
(credentialed) request path.
