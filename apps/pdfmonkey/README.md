# PDFMonkey

Generate PDFs and images from PDFMonkey templates.

- **Categories** — documents, developer-tools
- **Auth methods** — bearer-token
- **Actions** — 13
- **Egress allowlist** — `api.pdfmonkey.io`
- **Website** — https://pdfmonkey.io
- **API docs** — https://pdfmonkey.io/docs/api/

## API surface

```
Base URL:  https://api.pdfmonkey.io/api/v1
Auth:      Authorization: Bearer <API secret key>
```

Confirmed against PDFMonkey's own dated documentation (`docs/api/authentication`,
`docs/api/documents`, `docs/api/templates`, all "Last updated August 20, 2026"), not
inferred from a marketing page or a sibling app. `api.pdfmonkey.io/` itself is a red
herring: it 301s to a Devise-style **admin console** sign-in page
(`api.pdfmonkey.io/admin_users/sign_in`), not the API reference — the real docs live
at `pdfmonkey.io/docs/api/*`, one page per resource, reachable from the docs site's own
"API" sidebar section.

## Generation is async by default — read this before wiring a workflow

`POST /documents` **creates a `draft`** unless you explicitly set `"status": "pending"`.
A draft never renders. Once pending, poll `get-document-card` (or use a webhook,
undocumented here — out of scope) until `status` reaches `"success"` and
`download_url` is populated. `create-document-sync` (`POST /documents/sync`) is a
convenience that polls server-side and returns in one request, capped at a **6-minute**
timeout — the docs recommend it only for low-volume/interactive use, not production
pipelines or batch generation.

## Document vs DocumentCard

PDFMonkey documents come in two shapes and the vendor's own docs say to prefer the
lighter one:

- **`Document`** (`get-document`) — the full object, including `payload` and
  `generation_logs`.
- **`DocumentCard`** (`get-document-card`, `create-document-sync`, `list-documents`) —
  everything except `payload`/`generation_logs`/`checksum`, plus
  `document_template_identifier`. "Prefer DocumentCard over Document" is a direct quote
  from the vendor's docs; this app follows that by giving `create-document-sync` and
  `list-documents` no full-`Document` equivalent at all.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *documents-per-month*
headroom left.

### Is the vendor up?

**Declared `unavailable`.** `status.pdfmonkey.io` is a **real** vendor-operated status
page (title "PDFMonkey Status", updown.io-powered, with live monitors for the API,
generation latency, and system queue size — confirmed 2026-09-05 by an actual incident
banner about a DNS propagation issue, not a stale decoy). The obvious
`pdfmonkey.statuspage.io` alias is the unclaimed Atlassian decoy — it 302s to
`www.atlassian.com/software/statuspage`. Despite being real, `status.pdfmonkey.io`
exposes **no machine-readable surface**: every conventional feed/API path
(`/history.atom`, `/history.rss`, `/feed`, `/feed.atom`, `/feed.rss`, `/api/v1/status`,
`/status.json`, `/api/status`) answers 200 with the identical ~48 KB client-rendered
shell, and the page embeds no inline JSON to scrape either. `health/service.ts` says so
honestly instead of faking a check or leaving a silent gap.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one
of the three it performs itself: `GET /document_cards?page[number]=1`.

**This is deliberately not `GET /current_user`**, the endpoint the vendor's own
Authentication docs use as their "make a test API call" example. Its documented sample
response includes an `"auth_token"` field alongside the account's email/plan/etc., and
nothing in the schema states that field is a *different* secret from the API key just
presented in the `Authorization` header — a pattern that matches PDFMonkey's Rails/
Devise stack (its admin console at `api.pdfmonkey.io` serves a Devise-style sign-in
form with a `csrf-token` meta tag). Per this pack's rule that an auth probe must never
risk echoing the caller's own credential, `current_user` is never called anywhere in
this app — enforced by a test in `tests/auth/bearer-token.test.ts` that greps every
source file. `GET /document_cards` was picked instead: it needs no scope beyond
reading your own documents, and its response body never contains a credential.

### Do we have documents-per-month headroom left?

**Declared `unavailable`.** PDFMonkey bills per plan against a monthly document
allowance (20/300/3,000/5,000/60,000 across Free/Starter/Pro/Pro+/Premium, per
`docs/pricing-and-billing/our-plans`). The only field that exposes the remaining count
— `available_documents` — is on `GET /current_user`, the same endpoint excluded above
for the credential-echo risk. No other endpoint or response header documented anywhere
in `docs/api/*` carries a quota or rate-limit signal.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | `unavailable` — real status page, no machine-readable feed |
| `quota` | quota | connection | signed | informational | `unavailable` — only exposed via an endpoint that risks echoing the credential |
| `auth:bearer-token` | credential | connection | signed | fatal | derived from the `bearer-token` auth method's `test` hook (`GET /document_cards`) |

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `create-document` | perform | `POST /documents` |
| `create-document-sync` | perform | `POST /documents/sync` |
| `get-document` | read | `GET /documents/{id}` |
| `get-document-card` | read | `GET /document_cards/{id}` |
| `list-documents` | read | `GET /document_cards` |
| `update-document` | perform | `PUT /documents/{id}` |
| `delete-document` | perform | `DELETE /documents/{id}` |
| `list-templates` | read | `GET /document_template_cards` |
| `get-template` | read | `GET /document_templates/{id}` |
| `create-template` | perform | `POST /document_templates` |
| `update-template` | perform | `PUT /document_templates/{id}` |
| `delete-template` | perform | `DELETE /document_templates/{id}` |
| `list-engines` | read | `GET /engines` |

`list-templates` requires a `workspaceId` (`q[workspace_id]`) — there is no
account-wide template listing in the vendor's API, unlike `list-documents`, whose every
filter (including `q[workspace_id]`) is optional. Note the query-string shapes differ
between the two list endpoints too: Documents uses `page[number]`, Templates uses a
plain `page` — both confirmed from the vendor's own examples, not assumed to match.

The vendor's own docs are explicit that "most users don't need the Templates API" —
templates are normally designed in the Dashboard or visual Builder. The five template
actions here exist because they are real, documented, current endpoints, not because
they're the common path; `create-template`/`update-template` are included for
programmatic workflows (e.g. syncing from a CI pipeline) exactly as the vendor's docs
describe that use case.

### Deliberately not built

- **Webhooks** (`docs/generating-documents/webhooks`). Real and documented, but
  configuring/receiving a webhook is a `TriggerDefinition` concern, not an `Action` —
  out of scope for this pass per the app-building contract ("Triggers... add them only
  when asked").
- **`GET /current_user`.** See the health-check section above — its documented
  response schema cannot be shown to exclude echoing the caller's own API key.

---

Researched and endpoint-verified 2026-09-05 against `pdfmonkey.io/docs/api/authentication`,
`/docs/api/documents`, `/docs/api/templates`, and `/docs/pricing-and-billing/our-plans`
(all dated "Last updated August 20, 2026" at time of writing). Re-verify before wiring a
machine-readable status feed if PDFMonkey ever adds one.
