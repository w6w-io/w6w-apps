/**
 * Zuora — subscription billing and monetization. Manage customer accounts,
 * subscriptions, invoices, payments and orders through Zuora's v1 REST API.
 *
 * See `lib/client.ts` for the ten regional hosts and the rate/concurrency
 * limits that shape this app, and `auth/client-credentials.ts` for how the
 * OAuth exchange works and why a token is minted once and reused.
 */
import type { AppDefinition } from "@w6w/types";

import clientCredentials from "./auth/client-credentials.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";
import accountCreate from "./actions/account-create.ts";
import accountUpdate from "./actions/account-update.ts";
import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import paymentList from "./actions/payment-list.ts";
import paymentGet from "./actions/payment-get.ts";
import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderCreate from "./actions/order-create.ts";

const app: AppDefinition = {
  actions: [
    accountList,
    accountGet,
    accountCreate,
    accountUpdate,
    subscriptionList,
    subscriptionGet,
    subscriptionCreate,
    invoiceList,
    invoiceGet,
    paymentList,
    paymentGet,
    orderList,
    orderGet,
    orderCreate,
  ],
  auth: [clientCredentials],
  healthChecks: [service, quota],
};

export default app;
