/**
 * Zoho Inventory — stock, catalog and sales orders, over the Zoho Inventory
 * REST API (`https://www.zohoapis.com/inventory/v1/...`, and its seven
 * regional siblings).
 *
 * Every path, verb, query parameter, body field and error shape in this app
 * was verified on 2026-09-22 against Zoho's own documentation
 * (`https://www.zoho.com/inventory/api/v1/introduction/` plus the
 * per-resource pages it links to — organizations, contacts, items, locations,
 * salesorders, oauth, errors, pagination) and live probes against all eight
 * regional API hosts and their accounts hosts. Nothing here came from a
 * third-party integration directory.
 *
 * Scoped to **Zoho Inventory specifically** — this pack already ships
 * `zohobooks` (Zoho Books), `zoho-invoice` (Zoho Invoice) and `zoho` (Zoho
 * CRM), separate products with separate API surfaces; do not confuse them.
 * The three share a platform (same OAuth mechanics, same envelope, same error
 * codes, same `organization_id` requirement) but not an API root.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The API root is the shared `www.zohoapis.<tld>` gateway with a
 *     `/inventory/v1` path segment, NOT a product subdomain**
 *     (`lib/regions.ts`). Zoho Desk and Zoho Campaigns each get their own
 *     `*.zoho.<tld>` host per region, so a host pattern learned from those
 *     siblings does not transfer: the product here is selected by the path,
 *     not the hostname. There are eight data centres with eight API hosts,
 *     all a plain `www.zohoapis.<tld>`.
 *  2. **`organization_id` is required on almost every call, and getting it
 *     wrong doesn't 401** (`lib/client.ts`). Zoho calls a business an
 *     "organization"; every endpoint except `GET /organizations` itself (the
 *     discovery call) requires `organization_id` as a query parameter, or it
 *     answers an Inventory-specific 400 that reads like a broken action rather
 *     than a missing setting. `organizationIdFrom` mirrors `zohobooks`'s
 *     same-named helper: an optional per-action param that falls back to the
 *     id `afterConnect` records, so the common single-organization case needs
 *     nothing typed in.
 *  3. **Multi-data-centre, and Canada's accounts host does NOT follow the API
 *     host's naming pattern** (`lib/regions.ts`, `auth/oauth2.ts`). The
 *     documented Canadian API host is `www.zohoapis.ca`, but there is no
 *     `accounts.zoho.ca` at all; the real OAuth host is
 *     `accounts.zohocloud.ca` (confirmed live — `.ca` fails to connect,
 *     `zohocloud.ca` answers `302`). Assuming the pattern holds for all eight
 *     breaks OAuth for exactly the one region where it doesn't.
 *  4. **Items and Locations live under the `settings` OAuth scope family,
 *     not their own** (`auth/oauth2.ts`). Contacts and Sales Orders each get a
 *     same-named scope (`ZohoInventory.contacts.*`, `ZohoInventory.salesorders.*`),
 *     but there is no `ZohoInventory.items.*` or `ZohoInventory.locations.*` —
 *     both are documented under `ZohoInventory.settings.*`, as is
 *     `GET /organizations`. Easy to miss when scoping an OAuth client from the
 *     resource names alone.
 *  5. **The Locations resource is what makes this its own product, not an
 *     accounting add-on** (`actions/location-list.ts`). Stock is tracked per
 *     warehouse, so "how many are there" is only half an answer without a
 *     location; `GET /locations` is exposed read-only, since creating or
 *     deleting a warehouse rewrites how the whole account's stock is
 *     reported.
 *  6. **No quota surface exists** (`health/quota.ts`). Zoho documents request
 *     limits and the error bodies returned once they are hit, but exposes no
 *     `X-RateLimit-*` (or equivalent) response header to probe headroom ahead
 *     of the failure — declared absent rather than guessed.
 *
 * Deliberately absent: purchases, bills, purchase orders, transfer orders,
 * assemblies, shipments, packages, inventory adjustments, price lists, sales
 * order status transitions (confirmed as their own `POST /salesorders/{id}/
 * {verb}` endpoints but left out), and every jurisdiction-specific tax feature
 * — none of those are core CRUD workflow automation, and several are
 * jurisdiction-specific in ways this app does not attempt to model
 * generically.
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

import locationList from "./actions/location-list.ts";

import salesorderList from "./actions/salesorder-list.ts";
import salesorderGet from "./actions/salesorder-get.ts";
import salesorderCreate from "./actions/salesorder-create.ts";
import salesorderUpdate from "./actions/salesorder-update.ts";
import salesorderDelete from "./actions/salesorder-delete.ts";

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
    // locations
    locationList,
    // sales orders
    salesorderList,
    salesorderGet,
    salesorderCreate,
    salesorderUpdate,
    salesorderDelete,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
