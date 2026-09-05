/**
 * Recharge — recurring billing for ecommerce stores (Shopify, BigCommerce,
 * custom platforms), over the Recharge API `2021-11`
 * (`api.rechargeapps.com`).
 *
 * Every path, verb, query parameter, request/response field and error shape
 * in this app was verified on 2026-09-05 against Recharge's own API
 * reference (`developer.getrecharge.com`) plus live probes against
 * `api.rechargeapps.com` and `status.getrecharge.com`. Nothing here came
 * from a third-party integration directory. See `lib/client.ts` for the
 * findings that shaped this app's design in full.
 *
 * Left out, and why: the reference documents many more resources
 * (Collections, Bundle Selections, Credit Accounts, Plans, Checkouts, Async
 * Batches, Metafields, Customer Entitlements) beyond what this app covers.
 * This app's surface is the day-to-day subscription-lifecycle operations —
 * customers, addresses, subscriptions, one-time purchases, charges, orders,
 * products, discounts, payment methods and webhooks — rather than every
 * endpoint Recharge exposes; the README says so explicitly rather than
 * silently.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";

import addressList from "./actions/address-list.ts";
import addressGet from "./actions/address-get.ts";
import addressUpdate from "./actions/address-update.ts";

import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionActivate from "./actions/subscription-activate.ts";
import subscriptionSetNextChargeDate from "./actions/subscription-set-next-charge-date.ts";

import chargeList from "./actions/charge-list.ts";
import chargeGet from "./actions/charge-get.ts";
import chargeSkip from "./actions/charge-skip.ts";
import chargeUnskip from "./actions/charge-unskip.ts";
import chargeRefund from "./actions/charge-refund.ts";

import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";

import productList from "./actions/product-list.ts";
import discountList from "./actions/discount-list.ts";

import onetimeList from "./actions/onetime-list.ts";
import onetimeCreate from "./actions/onetime-create.ts";

import paymentMethodList from "./actions/payment-method-list.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import tokenInformationGet from "./actions/token-information-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Customers
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    // Addresses
    addressList,
    addressGet,
    addressUpdate,
    // Subscriptions
    subscriptionList,
    subscriptionGet,
    subscriptionCreate,
    subscriptionCancel,
    subscriptionActivate,
    subscriptionSetNextChargeDate,
    // Charges
    chargeList,
    chargeGet,
    chargeSkip,
    chargeUnskip,
    chargeRefund,
    // Orders
    orderList,
    orderGet,
    // Catalog
    productList,
    discountList,
    // Onetimes
    onetimeList,
    onetimeCreate,
    // Payment methods
    paymentMethodList,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookDelete,
    // Token
    tokenInformationGet,
  ],
  // API token only. Recharge publishes no OAuth surface documented for
  // third-party apps in this reference; the token is the whole
  // authentication story.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
