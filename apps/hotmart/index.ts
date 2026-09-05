/**
 * Hotmart — the online-course / digital-products platform: sales, recurring
 * subscriptions, products, checkout coupons and the producer's own profile,
 * over Hotmart's Public API.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-05 against Hotmart's own developer documentation
 * (`developers.hotmart.com/docs/en/...`, read as its own structured page-data
 * JSON rather than screen-scraped) plus live, unauthenticated probes of both
 * API hosts. Nothing here came from a sibling integration or from Hotmart's
 * marketing site. See `lib/client.ts` for the two-host, one-error-envelope
 * design and `auth/client-credentials.ts` for the three-secret auth flow.
 */
import type { AppDefinition } from "@w6w/types";

import salesHistory from "./actions/sales-history.ts";
import salesSummary from "./actions/sales-summary.ts";
import salesUsers from "./actions/sales-users.ts";
import salesCommissions from "./actions/sales-commissions.ts";
import salesPriceDetails from "./actions/sales-price-details.ts";
import salesRefund from "./actions/sales-refund.ts";
import salesBillet from "./actions/sales-billet.ts";
import subscribersList from "./actions/subscribers-list.ts";
import subscriptionSummary from "./actions/subscription-summary.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionReactivate from "./actions/subscription-reactivate.ts";
import subscriptionChangeDueDay from "./actions/subscription-change-due-day.ts";
import productList from "./actions/product-list.ts";
import couponCreate from "./actions/coupon-create.ts";
import couponList from "./actions/coupon-list.ts";
import couponDelete from "./actions/coupon-delete.ts";
import userMe from "./actions/user-me.ts";

import clientCredentials from "./auth/client-credentials.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Sales
    salesHistory,
    salesSummary,
    salesUsers,
    salesCommissions,
    salesPriceDetails,
    salesRefund,
    salesBillet,
    // Subscriptions
    subscribersList,
    subscriptionSummary,
    subscriptionCancel,
    subscriptionReactivate,
    subscriptionChangeDueDay,
    // Products
    productList,
    // Coupons
    couponCreate,
    couponList,
    couponDelete,
    // User
    userMe,
  ],
  // Hotmart's only third-party auth surface: a client_credentials exchange
  // wrapped in a third, vendor-generated "Basic" secret. See the auth file.
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
