/**
 * Lemon Squeezy — the merchant-of-record platform for selling software and
 * digital products: catalog (products, variants, prices), customers, orders
 * and refunds, subscriptions, discounts, license keys, checkouts and
 * webhooks, on the **Lemon Squeezy API** (`api.lemonsqueezy.com/v1`).
 *
 * Every path, verb, request/response field and enum in this app was verified
 * against Lemon Squeezy's own developer documentation
 * (`docs.lemonsqueezy.com/api`) fetched 2026-09-05, plus live probes against
 * `api.lemonsqueezy.com` the same day. Nothing here came from a third-party
 * integration directory.
 *
 * **A note on how the docs were read.** `docs.lemonsqueezy.com/api` is a
 * client-side-rendered Next.js app — a plain HTTP fetch of a resource page
 * (e.g. `/api/products/list-all-products`) returns only page chrome and
 * navigation; the actual reference content (attributes, filter parameters,
 * example bodies) is not present in that HTML at all. Each page's content was
 * instead read from its React Server Components payload embedded in the
 * response, which carries the exact MDX source Lemon Squeezy's own docs
 * repository (`github.com/Make-Lemonade/lemonsqueezy-docs`) authored — the
 * primary source, not a rendering of it.
 *
 * The findings that shaped this app's design:
 *
 *  1. **This is JSON:API**, and both `Accept: application/vnd.api+json` and
 *     `Content-Type: application/vnd.api+json` are required on **every**
 *     request per the vendor's own "Requirements" section — including plain
 *     `GET`s, not only writes (confirmed against the vendor's own
 *     authenticated-GET example, which sends both headers with no body).
 *     `lib/client.ts` sends both unconditionally.
 *  2. **One host, no environment split.** A Test-mode key and a Live-mode key
 *     both call `api.lemonsqueezy.com`; the key alone decides which dataset a
 *     call touches, and every resource carries its own `test_mode` boolean.
 *     Unlike `apps/paddle`, there is no host to rewrite in `sign`.
 *  3. **The auth probe is the vendor's own worked example**, `GET
 *     /v1/users/me` (`auth/api-key.ts`) — needs a credential (confirmed: no
 *     header and a bogus bearer token both answer a real `401`, never a `200`
 *     with an error body), needs no scoped permission (Lemon Squeezy API keys
 *     are not permission-scoped), and returns only the caller's own profile.
 *  4. **The status page is Oh Dear, not Statuspage/Instatus** — the usual
 *     `/api/v2/summary.json` guesses all 404 — and its RSS feed
 *     (`health/service.ts`) has never carried an incident to observe, so the
 *     open/resolved reading is a best-effort convention rather than a
 *     confirmed one; stated plainly in that file rather than hidden.
 *  5. **Two write-shape surprises**, each documented at its call site:
 *     `order-invoice`'s billing fields are sent as **query parameters** on the
 *     `POST`, not a JSON body (per the vendor's own curl example); and
 *     `webhook-create`'s `secret` is **never returned** by the API again —
 *     the vendor states plainly that it can only be viewed once, in the
 *     dashboard.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userGet from "./actions/user-get.ts";

import storeList from "./actions/store-list.ts";
import storeGet from "./actions/store-get.ts";

import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";

import variantList from "./actions/variant-list.ts";
import variantGet from "./actions/variant-get.ts";

import priceList from "./actions/price-list.ts";
import priceGet from "./actions/price-get.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";

import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderInvoice from "./actions/order-invoice.ts";
import orderRefund from "./actions/order-refund.ts";

import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionUpdate from "./actions/subscription-update.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";

import discountList from "./actions/discount-list.ts";
import discountGet from "./actions/discount-get.ts";
import discountCreate from "./actions/discount-create.ts";
import discountDelete from "./actions/discount-delete.ts";

import licenseKeyList from "./actions/license-key-list.ts";
import licenseKeyGet from "./actions/license-key-get.ts";
import licenseKeyUpdate from "./actions/license-key-update.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import checkoutList from "./actions/checkout-list.ts";
import checkoutGet from "./actions/checkout-get.ts";
import checkoutCreate from "./actions/checkout-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // account
    userGet,
    // stores
    storeList,
    storeGet,
    // catalog
    productList,
    productGet,
    variantList,
    variantGet,
    priceList,
    priceGet,
    // customers
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    // orders / money
    orderList,
    orderGet,
    orderInvoice,
    orderRefund,
    // subscriptions
    subscriptionList,
    subscriptionGet,
    subscriptionUpdate,
    subscriptionCancel,
    // discounts
    discountList,
    discountGet,
    discountCreate,
    discountDelete,
    // license keys
    licenseKeyList,
    licenseKeyGet,
    licenseKeyUpdate,
    // webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    // checkouts
    checkoutList,
    checkoutGet,
    checkoutCreate,
  ],
  // API key only. Lemon Squeezy has no OAuth2 surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
