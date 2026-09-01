/**
 * Mollie — the European payment gateway: accept payments over 30+ methods
 * (iDEAL, cards, Bancontact, SEPA Direct Debit, PayPal, Klarna, and more) via
 * Payments, hosted Payment Links, and recurring Subscriptions billed against
 * a saved Mandate, over the Mollie API v2 (`api.mollie.com/v2`).
 *
 * Every path, verb, request/response field and enum in this app was verified
 * on 2026-09-01 against Mollie's own machine-readable OpenAPI 3.1 documents.
 * `docs.mollie.com` (ReadMe.io) embeds a full OAS document per doc
 * *category* — `"Accepting payments"` (44 operations: Payments, Methods,
 * Refunds, Chargebacks, Captures, Wallets, Payment Links, Terminals, Delayed
 * Routing, Unmatched Credit Transfers, Sessions), `"Recurring"` (18
 * operations: Customers, Mandates, Subscriptions), `"Mollie Connect"`
 * (Organizations, Profiles, Onboarding, OAuth, …) — rather than one combined
 * spec, and each was fetched and read in full, cross-checked against the
 * guide pages (authentication, pagination, error handling, rate limiting)
 * fetched alongside them, plus live probes against `api.mollie.com` and
 * `status.mollie.com`. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Amounts are exact decimal STRINGS, never integer cents** (`lib/client.ts`,
 *     `lib/params.ts`). `{currency: "EUR", value: "10.00"}` — unlike
 *     Razorpay/Stripe-style APIs, there is no smallest-sub-unit integer
 *     anywhere in this API.
 *  2. **The docs promise `401` for a bad credential; live traffic answers `400`**
 *     (`lib/client.ts`, `auth/bearer.ts`). Every credential problem this app
 *     could provoke — missing header, malformed header, wrong key — answered
 *     `400 Bad Request` / `"Invalid Authorization header"` on live probes,
 *     not the `401 Unauthorized Request` the `overview/handling-errors` guide
 *     page's own worked example shows.
 *  3. **The "checkout URL" lives at a different `_links` key per resource**
 *     (`actions/payment-create.ts`, `actions/payment-link-create.ts`). A
 *     Payment's shareable URL is `_links.checkout.href`; a Payment Link's is
 *     `_links.paymentLink.href`. Neither is `_links.self.href` — that key is
 *     always the API resource URL itself, not a page a customer can open.
 *
 * ## Orders API: deprecated by Mollie itself — not implemented
 *
 * Mollie's own sidebar marks `orders-api`'s operations (`create-order`,
 * `list-orders`, …) `"deprecated": true`, and the doc category is named
 * "Receiving orders" alongside a separate "Shipments API" that depends on
 * it. Mollie's replacement is the Payments API's own `lines` field (order
 * lines attached directly to a payment) — the `build-a-w6w-app.md` task that
 * started this app explicitly named Orders as a nav section to check; this
 * is the finding that it should NOT be built.
 *
 * ## Deliberately out of scope
 *
 * The wider **Mollie Connect** surface (OAuth-based platform/marketplace
 * access on behalf of *other* Mollie merchants — Organizations, Clients,
 * Client Links, Balance Transfers, Onboarding, Capabilities, Permissions) and
 * **Business operations** (Balances, Settlements, Invoices, Payouts, Sales
 * Invoices, Business Accounts, Terminals, Wallets, Delayed Routing,
 * Unmatched Credit Transfers, Sessions/Checkout Sessions) are a different
 * activation and a different account relationship — a platform managing
 * *other* merchants' funds, not a merchant's own payment-gateway surface —
 * and are left out rather than half-covered. See `README.md`.
 */
import type { AppDefinition } from "@w6w/types";
import bearer from "./auth/bearer.ts";

import paymentCreate from "./actions/payment-create.ts";
import paymentGet from "./actions/payment-get.ts";
import paymentList from "./actions/payment-list.ts";
import paymentUpdate from "./actions/payment-update.ts";
import paymentCancel from "./actions/payment-cancel.ts";

import paymentRefundCreate from "./actions/payment-refund-create.ts";
import paymentRefundList from "./actions/payment-refund-list.ts";
import paymentRefundGet from "./actions/payment-refund-get.ts";
import paymentRefundCancel from "./actions/payment-refund-cancel.ts";
import refundList from "./actions/refund-list.ts";

import paymentChargebackList from "./actions/payment-chargeback-list.ts";
import paymentChargebackGet from "./actions/payment-chargeback-get.ts";
import chargebackList from "./actions/chargeback-list.ts";

import methodList from "./actions/method-list.ts";
import methodListAll from "./actions/method-list-all.ts";
import methodGet from "./actions/method-get.ts";

import paymentLinkCreate from "./actions/payment-link-create.ts";
import paymentLinkGet from "./actions/payment-link-get.ts";
import paymentLinkList from "./actions/payment-link-list.ts";
import paymentLinkUpdate from "./actions/payment-link-update.ts";
import paymentLinkDelete from "./actions/payment-link-delete.ts";

import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerList from "./actions/customer-list.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import customerPaymentCreate from "./actions/customer-payment-create.ts";
import customerPaymentList from "./actions/customer-payment-list.ts";

import mandateCreate from "./actions/mandate-create.ts";
import mandateList from "./actions/mandate-list.ts";
import mandateGet from "./actions/mandate-get.ts";
import mandateRevoke from "./actions/mandate-revoke.ts";

import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionList from "./actions/subscription-list.ts";
import subscriptionUpdate from "./actions/subscription-update.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionListAll from "./actions/subscription-list-all.ts";
import subscriptionPaymentList from "./actions/subscription-payment-list.ts";

import profileGet from "./actions/profile-get.ts";
import profileList from "./actions/profile-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Payments
    paymentCreate,
    paymentGet,
    paymentList,
    paymentUpdate,
    paymentCancel,
    // Refunds
    paymentRefundCreate,
    paymentRefundList,
    paymentRefundGet,
    paymentRefundCancel,
    refundList,
    // Chargebacks
    paymentChargebackList,
    paymentChargebackGet,
    chargebackList,
    // Methods
    methodList,
    methodListAll,
    methodGet,
    // Payment Links
    paymentLinkCreate,
    paymentLinkGet,
    paymentLinkList,
    paymentLinkUpdate,
    paymentLinkDelete,
    // Customers
    customerCreate,
    customerGet,
    customerList,
    customerUpdate,
    customerDelete,
    customerPaymentCreate,
    customerPaymentList,
    // Mandates
    mandateCreate,
    mandateList,
    mandateGet,
    mandateRevoke,
    // Subscriptions
    subscriptionCreate,
    subscriptionGet,
    subscriptionList,
    subscriptionUpdate,
    subscriptionCancel,
    subscriptionListAll,
    subscriptionPaymentList,
    // Profiles
    profileGet,
    profileList,
  ],
  auth: [bearer],
  healthChecks: [service, quota],
} satisfies AppDefinition;
