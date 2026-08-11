/**
 * Paddle — the merchant-of-record billing platform: catalog products and
 * prices, customers, subscriptions, transactions, invoice PDFs and refunds, on
 * the **Paddle Billing** REST API (`api.paddle.com`).
 *
 * Every path, verb, body field and enum in this app was verified against
 * Paddle's own developer documentation on 2026-08-10 — fetched as
 * machine-readable Markdown from `developer.paddle.com/llms/api-reference.txt`
 * and the per-endpoint `.md` pages it indexes — plus live probes against
 * `api.paddle.com` and `sandbox-api.paddle.com`. Nothing here came from a
 * third-party integration directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **This is Paddle Billing, not Paddle Classic** (`lib/client.ts`). Two
 *     incompatible generations share a brand; n8n's Paddle node is the other
 *     one and is not a reference for anything here.
 *  2. **The API key selects the host** (`auth/api-key.ts`). `pdl_live_` →
 *     `api.paddle.com`, `pdl_sdbx_` → `sandbox-api.paddle.com`, so the user is
 *     never asked to pick an environment that could disagree with their key.
 *  3. **`GET /event-types` is the only endpoint that needs a credential but no
 *     permission** (`auth/api-key.ts`), which makes it the one correct auth
 *     probe — `/ips` answers 200 with no credential at all, and `/products`
 *     needs `product.read`.
 *  4. **Status-page component names are not unique** (`health/service.ts`).
 *     Keying them by name collapses 25 components into 8 and lets a healthy row
 *     mask a broken one, so they are keyed by the vendor's component id.
 *
 * Subscription writes deserve their own warning, which their action files
 * carry: cancel and pause default to *scheduling* the change for the end of the
 * billing period, leaving the status `active` in the meantime.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";

import priceList from "./actions/price-list.ts";
import priceGet from "./actions/price-get.ts";
import priceCreate from "./actions/price-create.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";

import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionPause from "./actions/subscription-pause.ts";
import subscriptionResume from "./actions/subscription-resume.ts";

import transactionList from "./actions/transaction-list.ts";
import transactionGet from "./actions/transaction-get.ts";
import transactionInvoice from "./actions/transaction-invoice.ts";

import adjustmentList from "./actions/adjustment-list.ts";
import adjustmentCreate from "./actions/adjustment-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // catalog
    productList,
    productGet,
    productCreate,
    productUpdate,
    priceList,
    priceGet,
    priceCreate,
    // customers
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    // subscriptions
    subscriptionList,
    subscriptionGet,
    subscriptionCancel,
    subscriptionPause,
    subscriptionResume,
    // money
    transactionList,
    transactionGet,
    transactionInvoice,
    adjustmentList,
    adjustmentCreate,
  ],
  // API key only. Paddle Billing has no OAuth surface for third-party apps —
  // its other credential, the client-side token, is browser-only and limited to
  // opening checkouts and previewing prices.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
