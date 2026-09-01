/**
 * Zoho Invoice — invoicing/estimates, over the Zoho Invoice REST API
 * (`https://www.zohoapis.com/invoice/v3/...`, and its seven regional
 * siblings).
 *
 * Every path, verb, header, body field and error shape in this app was
 * verified on 2026-09-01 against Zoho's own documentation
 * (`https://www.zoho.com/invoice/api/v3/introduction/` plus the per-resource
 * pages it links to — organizations, contacts, items, invoices, estimates,
 * oauth, response, errors, pagination) and live probes against all eight
 * regional API hosts and their accounts hosts. Nothing here came from a
 * third-party integration directory or from `zohobooks` without independent
 * re-verification against Zoho Invoice's own pages.
 *
 * Scoped to **Zoho Invoice specifically** — this pack already ships `zoho`
 * (Zoho CRM), `zohobooks` (Zoho Books) and `zohomail` (Zoho Mail), separate
 * products with separate API surfaces; do not confuse them. Zoho Invoice and
 * Zoho Books are sibling products (Invoice is Books minus banking/expenses)
 * and share the OAuth mechanism, the eight-data-centre shape, and the
 * `{code, message, <resource>}` envelope — but NOT the organization-id
 * transport (see finding 1 below), and their resource surfaces genuinely
 * differ (e.g. Zoho Invoice's List Estimates has no `customer_id`/`status`
 * filter, unlike its own List Invoices or Zoho Books' equivalent).
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The organization id travels as a HEADER here, not a query
 *     parameter** (`lib/client.ts`). Every one of Zoho Invoice's own
 *     generated per-endpoint request examples — checked across the
 *     contacts, items, invoices and estimates pages, 644 occurrences total —
 *     sends `X-com-zoho-invoice-organizationid` as a header, never
 *     `organization_id` as a query string. Zoho Books instead documents
 *     `organization_id` as a query parameter on every one of its own
 *     examples. Getting this wrong doesn't 401 on Invoice either — it
 *     answers a `400` that reads like a broken action rather than a missing
 *     setting.
 *  2. **Multi-data-centre, and Canada's accounts host does NOT follow the
 *     API host's naming pattern** (`lib/regions.ts`, `auth/oauth2.ts`) — the
 *     identical finding `zohobooks` documents for itself, re-verified live
 *     against the Invoice-specific hosts rather than assumed. The real OAuth
 *     host is `accounts.zohocloud.ca` (confirmed live — `accounts.zoho.ca`
 *     fails to connect, `zohocloud.ca` answers `302`).
 *  3. **Items live under the `settings` OAuth scope family, not their own**
 *     (`auth/oauth2.ts`) — same finding as `zohobooks`. A separate
 *     `ZohoInvoice.items.READ` scope does exist, but it only guards the
 *     "Bulk fetch item details" endpoint (not called by this app); every
 *     Item CRUD endpoint documents `ZohoInvoice.settings.*` instead.
 *  4. **The response envelope names its own resource key, and it is not
 *     `data`** (`lib/client.ts`, `lib/invoice.ts`) — same shape as
 *     `zohobooks`: `{"code": 0, "message": "success", "<resource>": ...}`
 *     with the payload key varying per endpoint.
 *  5. **List Estimates has no `customer_id`/`status` filter** — unlike List
 *     Invoices (which documents both) and unlike Zoho Books' own equivalent
 *     endpoint, Zoho Invoice's List Estimates documents exactly three query
 *     parameters: `zcrm_potential_id`, `page`, `per_page` (see
 *     `actions/estimate-list.ts`).
 *  6. **List Contacts filters by status, not customer/vendor type** — the
 *     query parameters document `filter_by` (`Status.All` /
 *     `Status.Active` / `Status.Inactive` / `Status.Duplicate` /
 *     `Status.Crm`) and `search_text`, but no `contact_type` filter (see
 *     `actions/contact-list.ts`).
 *  7. **No quota surface exists** (`health/quota.ts`) — same finding as
 *     `zohobooks`: real per-minute/per-day limits are documented, but no
 *     `X-RateLimit-*` (or equivalent) response header is exposed to probe
 *     headroom ahead of the 429.
 *
 * Deliberately absent: recurring invoices, retainer invoices, credit notes,
 * customer payments, expenses/recurring expenses, projects/time entries,
 * users, taxes, currencies, bulk/mass-export and PDF/CSV response formats,
 * and every portal/e-invoicing/CFDI/GST regional feature — none of those are
 * core CRUD workflow automation, and several are jurisdiction-specific in
 * ways this app does not attempt to model generically. Create/update calls
 * take a generic set of fields for the same reason, since Zoho Invoice's own
 * forms run to dozens of optional, region-specific attributes.
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
