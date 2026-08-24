/**
 * Zoho Books — accounting/invoicing, over the Zoho Books REST API
 * (`https://www.zohoapis.com/books/v3/...`, and its seven regional
 * siblings).
 *
 * Every path, verb, query parameter, body field and error shape in this app
 * was verified on 2026-08-24 against Zoho's own documentation
 * (`https://www.zoho.com/books/api/v3/introduction/` plus the per-resource
 * pages it links to — contacts, items, invoices, estimates, organizations,
 * oauth, response, errors, pagination) and live probes against all eight
 * regional API hosts and their accounts hosts. Nothing here came from a
 * third-party integration directory.
 *
 * Scoped to **Zoho Books specifically** — this pack already ships `zoho`
 * (Zoho CRM) and `zohomail` (Zoho Mail), separate products with separate API
 * surfaces; do not confuse the three.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **`organization_id` is required on almost every call, and getting it
 *     wrong doesn't 401** (`lib/client.ts`). Zoho Books calls a business an
 *     "organization"; every endpoint except `GET /organizations` itself (the
 *     discovery call) requires `organization_id` as a query parameter, or it
 *     answers a Books-specific 400 that reads like a broken action rather
 *     than a missing setting. `organizationIdFrom` mirrors `zohomail`'s
 *     `accountIdFrom`: an optional per-action param that falls back to the
 *     id `afterConnect` records, so the common single-organization case needs
 *     nothing typed in.
 *  2. **Multi-data-centre, and Canada's accounts host does NOT follow the API
 *     host's naming pattern** (`lib/regions.ts`, `auth/oauth2.ts`). Zoho
 *     hosts every organization in one of eight regional data centres, each
 *     with its own API host (`www.zohoapis.<tld>`) and OAuth host
 *     (`accounts.zoho.<tld>`) — except Canada, where the documented API host
 *     is `www.zohoapis.ca` but there is no `accounts.zoho.ca` at all; the
 *     real OAuth host is `accounts.zohocloud.ca` (confirmed live — `.ca`
 *     fails to connect, `zohocloud.ca` answers `302`). Assuming the pattern
 *     holds for all eight breaks OAuth for exactly the one region where it
 *     doesn't, in a way that looks like a typo rather than a design fact.
 *  3. **Items live under the `settings` OAuth scope family, not their own**
 *     (`auth/oauth2.ts`). Contacts, Invoices and Estimates each get a
 *     same-named scope (`ZohoBooks.contacts.*`, etc.), but there is no
 *     `ZohoBooks.items.*` — Item endpoints (and `GET /organizations` itself)
 *     are documented under `ZohoBooks.settings.*`, easy to miss when scoping
 *     an OAuth client from the resource names alone.
 *  4. **The response envelope names its own resource key, and it is not
 *     `data`** (`lib/client.ts`, `lib/books.ts`). A success is `{"code": 0,
 *     "message": "success", "<resource>": ...}` — the payload key varies per
 *     endpoint (`"contacts"`, `"item"`, `"invoices"`, ...), unlike Zoho
 *     Mail's fixed `data` envelope or Zoho CRM's batch-style `data` array.
 *  5. **No quota surface exists** (`health/quota.ts`). Zoho Books documents
 *     real per-minute/per-day limits and their exact error bodies, but
 *     exposes no `X-RateLimit-*` (or equivalent) response header to probe
 *     headroom ahead of the 429 — declared absent rather than guessed.
 *
 * Deliberately absent: bulk/mass-export APIs, PDF/CSV response formats,
 * recurring invoices, sales/purchase orders, bills, banking, and every
 * portal/e-invoicing/CFDI/GST/e-way-bill regional feature — none of those are
 * core CRUD workflow automation, and several are jurisdiction-specific in
 * ways this app does not attempt to model generically.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import organizationList from "./actions/organization-list.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import itemList from "./actions/item-list.ts";
import itemGet from "./actions/item-get.ts";
import itemCreate from "./actions/item-create.ts";
import itemUpdate from "./actions/item-update.ts";
import itemDelete from "./actions/item-delete.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import invoiceDelete from "./actions/invoice-delete.ts";
import invoiceMarkSent from "./actions/invoice-mark-sent.ts";
import invoiceVoid from "./actions/invoice-void.ts";
import invoiceEmail from "./actions/invoice-email.ts";

import estimateList from "./actions/estimate-list.ts";
import estimateGet from "./actions/estimate-get.ts";
import estimateCreate from "./actions/estimate-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // organizations
    organizationList,
    // contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // items
    itemList,
    itemGet,
    itemCreate,
    itemUpdate,
    itemDelete,
    // invoices
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceUpdate,
    invoiceDelete,
    invoiceMarkSent,
    invoiceVoid,
    invoiceEmail,
    // estimates
    estimateList,
    estimateGet,
    estimateCreate,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
