# PDF.co

Convert, generate, merge, split, and extract data from PDFs and other documents on the **PDF.co
API v1/v2**.

- **Categories** — documents, developer-tools
- **Auth methods** — api-key
- **Actions** — 24
- **Health checks** — 2 (`quota`, ~~`service`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.pdf.co`
- **Website** — https://pdf.co/
- **API docs** — https://developer.pdf.co/
- **OpenAPI** — https://developer.pdf.co/openapi.json
- **Status page** — none published (see "Nothing is a real status page" below)

> **Everything below was verified against PDF.co's own sources on 2026-08-24** — its machine-readable
> OpenAPI 3.0 document ([`developer.pdf.co/openapi.json`](https://developer.pdf.co/openapi.json),
> 553,062 bytes, `info.version` `1.0`, 67 paths), its per-endpoint Markdown reference
> (`developer.pdf.co/llms-full.txt`, 3.4 MB — every endpoint's own "Attributes" table, worked
> example, and response schema), and live probes against `api.pdf.co`, `status.pdf.co`, and
> `pdf-co.statuspage.io`. Nothing here came from a third-party integration directory.

## The three things most likely to cost you a day

### 1. `openapi.json` lower-cases nearly every field name — and the API is case-sensitive

PDF.co's own docs say "Attributes are case-sensitive." Its generated OpenAPI document calls
PDF-to-text's line-grouping field `linegrouping`, PDF Find's search field `searchstring`,
PDF-from-HTML's paper size `papersize`, and PDF security's `ownerpassword`/`encryptionalgorithm` —
every one of them wrong. The vendor's own per-endpoint Markdown tables, and its own worked `curl`
examples (which actually round-trip), use `lineGrouping`, `searchString`, `paperSize`,
`ownerPassword`, `encryptionAlgorithm`.

Sending the `openapi.json` casing is not an error. The field is silently **dropped** — PDF.co's
parser doesn't recognize it, so it falls back to the documented default — and nothing about a `200`
response says a field was ignored. This is the single most expensive way to lose a day on this
vendor: a request that "works" (returns `200`) while quietly not doing what you asked. Every
camelCase field name in this app ([`lib/client.ts`](lib/client.ts) has the full account) was
cross-checked against the endpoint's own Markdown table and, where one exists, its literal
`curl`/JSON example — never taken from `openapi.json` alone.

### 2. `openapi.json`'s `required` arrays are sometimes fiction — in both directions

- `POST /pdf/edit/add`'s schema lists `annotationsString` as required. The endpoint's own Markdown
  table marks it *No*, and PDF.co's worked examples elsewhere call related endpoints with none of
  `annotations`/`images`/`fields`/`annotationsString` set. [`pdf-add`](actions/pdf-add.ts) requires
  only `url`.
- `POST /pdf/convert/from/html`'s schema lists `templateid` as required. Both the table and the
  vendor's own worked example omit it entirely. [`pdf-from-html`](actions/pdf-from-html.ts) requires
  only `html`.
- `POST /barcode/read/from/url`'s own Markdown table marks `type` "Required: Yes, default
  `QRCode`" — copy-pasted from the *generate* endpoint's row. The vendor's own worked example calls
  the reader with only `url`, `types` (plural, comma-separated) and `async`, and gets back barcodes
  of several different types in one response. [`barcode-read`](actions/barcode-read.ts) never sends
  `type`, and exposes `types` as the real, optional filter.

### 3. Page indexing is not one convention

Most endpoints take 0-based page ranges ("the first-page index is 0"). `POST /pdf/edit/delete-pages`
is the documented exception — its own Markdown page opens with an explicit warning that `pages` is
**1-based** there, and it is *required*: omitting it, or sending it blank, returns HTTP 400. Every
other action in this app that takes a `pages` param documents (and a test in
[`tests/index.test.ts`](tests/index.test.ts) enforces) the 0-based convention;
[`pdf-delete-pages`](actions/pdf-delete-pages.ts) alone documents 1-based and requires the field.

### Smaller findings, still worth knowing

- **`file/hash` is titled "Get MD5 Hash of File by URL" and returns SHA-256.** Its own worked example
  response is a 64-hex-character digest — the length of a SHA-256 hash, not the 32 characters an MD5
  hash would be. [`file-hash`](actions/file-hash.ts) is titled and described without naming an
  algorithm the response doesn't match.
- **The failure envelope is not one shape.** A failure reliably carries `error: true` and `message`,
  but the numeric code shows up under two different keys depending on which layer produced it:
  `status` (a number, on most documented failure schemas) or `errorCode` (observed live on every auth
  failure, where `status` is instead the *string* `"error"`). This app's error formatting
  ([`lib/client.ts`](lib/client.ts)) keys off `error`/`message` and treats the numeric code fields as
  optional detail, never as the branch.
- **PDF.co's documented custom codes (`441` invalid password, `442` damaged document, `446` missing
  files, `452` invalid URL, …) are real HTTP status lines**, not a `200` wrapping a numeric field —
  confirmed against the OpenAPI document's own per-path `responses` map. `res.ok` already separates
  these correctly.
- **Every input is a URL, never raw file bytes.** The OpenAPI `file` schema ("path to a local file")
  exists only for the vendor's own SDKs reading local disk, which a sandboxed Action cannot do — no
  action here exposes it. `POST /file/upload` and `POST /file/upload/base64` share that same
  generated `file` schema even though `file/upload/base64`'s own Markdown table correctly describes
  it as "Base64-encoded file bytes" — a second instance of the generic schema being wrong for one of
  the two endpoints reusing it.
- **Nothing is a real status page.** `status.pdf.co` and `pdf-co.statuspage.io` both resolve, but
  both are unclaimed placeholders on two different providers: `status.pdf.co` is a CNAME onto Better
  Stack's uptime-monitoring product and its own page redirects with
  `?unpublished-status-page=true`; `pdf-co.statuspage.io` bounces straight to Atlassian's Statuspage
  marketing site. Neither serves a `summary.json` or any other machine-readable feed for this vendor.
  `health/service.ts` declares the vendor-status check `unavailable` with `severity: "informational"`
  rather than polling a redirect and guessing at meaning from it.

## Auth

**API Key** (`x-api-key` header) — from PDF.co Dashboard → Account → API Key. PDF.co does not offer
scoped keys; any key an account generates has full access to that account, so there is no "narrowest
usable key" question for the health probe.

The credential-liveness probe is `GET /v1/account/credit/balance`. Chosen by reading the response
shape, not the name: it needs a credential (measured live: no `x-api-key` header answers `401`), and
its documented success body is `{"remainingCredits": 99795868}` — a running counter, no credential
material. Compare favorably against `GET /v1/file/upload/get-presigned-url`, which hands back a live,
pre-signed S3 **write** URL — a far bigger blast radius to park in a health surface that is stored
and displayed on every check.

## Health checks

- **`quota`** (connection-scoped, signed) — reads the same balance endpoint as the auth probe and
  reports `remainingCredits`. PDF.co's API publishes no plan ceiling, only what's left, so this check
  reports `remaining` with no `limit` rather than inventing a denominator the vendor never states. A
  balance of exactly zero is reported `down` (every metered call will fail from here), not `unknown`.
- **`service`** — declared `unavailable` (see finding above), `severity: "informational"` so its
  permanent `unknown` never outranks a live credential check in the App's overall verdict.

## Actions

**Convert PDF →** `pdf-to-text`, `pdf-to-json` (structured layout JSON), `pdf-to-csv` (table
extraction), `pdf-to-html`, `pdf-to-jpg` (one image URL per page).

**Convert → PDF** `pdf-from-html`, `pdf-from-url` (render a live web page), `pdf-from-image`.

**Merge / split / inspect / search** `pdf-merge`, `pdf-split`, `pdf-info` (metadata + security
permissions), `pdf-forms-info` (fillable field list), `pdf-find` (text/regex search with positions).

**Edit** `pdf-add` (overlay text/images/PDFs and fill form fields), `pdf-delete-pages`, `pdf-rotate`.

**Security** `pdf-add-password` (encrypt + restrict), `pdf-remove-password`.

**Barcodes** `barcode-generate`, `barcode-read` (auto-detects multiple types per call).

**Files, account, jobs** `file-upload-from-url` (rehost a URL into PDF.co temp storage),
`file-hash`, `account-balance-get`, `job-check` (poll an `async: true` background job).

### What was left out, and why

PDF.co's surface is ~67 endpoints; this app covers a well-documented core rather than every
conversion permutation:

- **PNG/WEBP/TIFF/XLS/XLSX/XML conversions** — near-identical siblings of `pdf-to-jpg`/`pdf-to-csv`
  (same request shape, different output format). JPG and CSV are the most commonly requested; adding
  the rest is a mechanical follow-up, not a design question.
- **`pdf-from-doc`, `pdf-from-csv`, `pdf-from-email`, `pdf-merge2`, `pdf-split2`, `pdf/optimize`
  (retired per its own summary), `pdf/makesearchable`/`makeunsearchable`, `pdf/classifier`,
  `documentparser`, `ai-invoice-parser`, `xls/*`, `email/*`** — narrower, less-frequently-needed
  conversions/extractions in the same family as what's already covered.
- **`file/upload` (raw multipart) and `file/upload/base64`** — see "every input is a URL" above; a
  sandboxed Action has no local file path, and no typical workflow step hands over an
  already-base64-encoded blob. `file-upload-from-url` is this app's one file-hosting primitive.
- **`file/upload/get-presigned-url`** — deliberately not exposed as an action or used as a probe: it
  returns a live, pre-signed S3 write URL, which is exactly the kind of response this app avoids
  surfacing anywhere it's stored and re-displayed (a health check, or a workflow log).

## Network

`api.pdf.co` only. No health check widens egress (the `service` check is a declared absence, not a
live probe against either placeholder status host).
