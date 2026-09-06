# Moneybird

Manage contacts and sales invoices in [Moneybird](https://www.moneybird.com/), the Dutch online
accounting and invoicing service.

Everything below was verified against Moneybird's own published OpenAPI document
(`https://raw.githubusercontent.com/moneybird/openapi/refs/heads/main/openapi.yml`, 55,154 lines —
linked from `developer.moneybird.com`'s own "Download OpenAPI Specification" button) and the
`developer.moneybird.com` "Introduction" / "Authentication" pages, fetched 2026-09-06. Nothing here
was inferred from a sibling integration.

## Auth setup

Register an application at `https://moneybird.com/user/applications/new`. Registration offers a
choice between two things this app both support:

- **Personal API Token** (`auth/personal-token.ts`) — a Bearer token minted for a single Moneybird
  account. Simplest to set up, but per the vendor's own docs "gives access to your entire company
  account" — not the right choice for a multi-tenant integrator.
- **OAuth2** (`auth/oauth2.ts`) — register an external OAuth application, configure its
  `client_id`/`client_secret`/`redirect_uri` on this w6w installation, then connect per end user via
  the browser flow. Scopes requested: `sales_invoices` and `estimates` (contacts are reachable
  through any of `sales_invoices`, `documents`, `estimates`, `bank` or `settings` — never through
  `time_entries` alone). The vendor's docs say the access token "does not expire, but we might
  change this in the future" and still issue a `refresh_token`, so `refreshUrl` is wired even though
  it should currently go unused.

## The administration id

Moneybird's API is per-**administration** (the bookkeeping entity id you see in Moneybird's own web
app URL), not per-account — but the **host** is always fixed:

```
https://moneybird.com/api/v2/:administration_id/:resource_path.json
```

A token can reach several administrations, and no request says which one a caller "means", so —
exactly like this pack's Xero (`tenantId`) and Jira (`cloudId`) integrations — a Connection resolves
and remembers **one** administration at connect time: `afterConnect` in both `auth/*.ts` files calls
`GET /administrations.json` right after the credential is entered and records the **first**
accessible administration's id on the Connection's `display`. Every action defaults to it, and every
action also accepts an optional `administrationId` param to target a different one for a token that
reaches more than one. Use **List Administrations** to discover the available ids.

## Actions (11)

**Administrations**
- `administration-list` — `GET /administrations.json`, the one endpoint with no administration id
  in its path.

**Contacts**
- `contact-list` — `GET /:administration_id/contacts.json`. `query` searches every documented
  contact field at once (there is no per-field search).
- `contact-get` — `GET /:administration_id/contacts/:id.json`.
- `contact-create` — `POST /:administration_id/contacts.json`.
- `contact-update` — `PATCH /:administration_id/contacts/:id.json`.

**Sales invoices**
- `sales-invoice-list` — `GET /:administration_id/sales_invoices.json`, filtered by a `filter`
  string (`key:value` pairs, comma-separated — see the action's own hint on why it *replaces* rather
  than narrows the vendor's defaults).
- `sales-invoice-get` — `GET /:administration_id/sales_invoices/:id.json`.
- `sales-invoice-create` — `POST /:administration_id/sales_invoices.json`. Creates a **draft** —
  it does not send the invoice.
- `sales-invoice-send` — `PATCH /:administration_id/sales_invoices/:id/send_invoice.json`. Assigns
  the invoice number and actually delivers it.
- `sales-invoice-payment-create` — `POST /:administration_id/sales_invoices/:id/payments.json`.
- `sales-invoice-pdf-get` — `GET /:administration_id/sales_invoices/:id/download_pdf.json`. Returns
  the pre-signed, 30-second download URL; does not fetch the PDF's bytes (see the action's own doc
  comment for why that redirect target can't be a fixed `network.allow` entry).

## Findings that would cost a day if you didn't know

1. **`register_payment` is deprecated (sunset 2026-12-31).** The OpenAPI document marks the older
   `PATCH .../sales_invoices/:id/register_payment` endpoint `deprecated: true` and points explicitly
   at `POST .../sales_invoices/:sales_invoice_id/payments` as its replacement. This app only
   implements the replacement (`sales-invoice-payment-create`) — anyone copying Moneybird sample
   code from an older tutorial is likely to hit the deprecated one.
2. **A new sales invoice is a draft with no invoice number.** `sales-invoice-create` returns
   `state: "draft"` and `invoice_id: null` — the invoice number is only assigned when
   `sales-invoice-send` actually sends it (or it is otherwise scheduled to send). Treating the
   `create` response as "the invoice is now sent" is the most common integration bug.
3. **`GET /administrations.json` has no administration id in its path — every other endpoint does.**
   Missing this means either hard-coding an administration id that only works for one account, or
   discovering at runtime (via this endpoint) which administration(s) a token can even reach — this
   is also the credential-liveness probe both auth methods use, since it needs no scope narrower
   than any personal token can have and returns no credential material.
4. **The `contact` create/update body has no plain `email` field**, even though a contact response
   *does* return one. The OpenAPI request schema for both create and update lists
   `send_invoices_to_email` / `send_estimates_to_email` but never a bare `email` — so this app does
   not expose one as a param; setting delivery email addresses goes through those two fields
   instead.
5. **Moneybird publishes no machine-readable status page.** `status.moneybird.com` is a
   custom-branded, Dutch-language page with no `/api/v2/summary.json` (confirmed by content, not
   just a 404 status code), and `moneybird.statuspage.io` is an **unclaimed Statuspage decoy** — its
   `/api/v2/summary.json` 302s straight to `https://www.statuspage.io`'s own marketing page (the
   same 127,717-byte trap several other apps in this pack have already documented). The `service`
   health check is a declared absence at `informational` severity; the derived `auth:personal-token`
   / `auth:oauth2` checks (`GET /administrations.json`) are the automatable signal instead.

## Gaps (left out deliberately)

- **SEPA direct debit, custom fields, and Peppol/e-invoicing identifier fields** on Contact
  create/update — documented in the OpenAPI schema, but this app's actions don't read or validate
  them, so they're left out rather than half-supported. Pass them via a future `additionalFields`
  JSON param if needed.
- **Scheduling a future invoice send** (`sending_scheduled` + `invoice_date` on `send_invoice`) is
  not exposed — only the immediate-send path is.
- **Estimates, purchase invoices, receipts, time entries, and every report endpoint** are out of
  scope for this pass — contacts and sales invoices are the "core subset" this app covers.
- **A `quota`/rate-limit health check** is not included: Moneybird's throttling (150 requests /
  5 minutes) is IP-based, not per-credential, and no endpoint exposes remaining headroom the way
  Apify's `/users/me/limits` does.
