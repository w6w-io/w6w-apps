/**
 * Invoice Ninja — a source-available invoicing and billing platform.
 *
 * Covers clients, invoices, quotes, payments, products, tasks and expenses.
 * Verified directly against the real OpenAPI 3.0.1 document Invoice Ninja's
 * own Redoc page (https://api-docs.invoicing.co/) renders: Redoc embeds the
 * parsed spec into the page as `const __redoc_state = {...}` rather than
 * fetching it client-side from a separate URL, so it was extracted straight
 * from that script tag (fetched 2026-09-05) rather than inferred from the
 * rendered HTML.
 *
 * ## The per-tenant-subdomain assumption does not hold
 *
 * Invoice Ninja is BOTH a hosted cloud service and a self-hosted, source
 * -available application — its own docs ask for "an active Invoice Ninja
 * account (or your own self hosted installation)". The spec's `servers` list
 * names exactly two fixed hosts (`https://invoicing.co` production,
 * `https://demo.invoiceninja.com` demo); nothing in it documents a
 * `{tenant}.invoicing.co` API host the way `apps/gorgias` and `apps/kustomer`
 * have for their own vendors. The one `subdomain` field the spec does define
 * (`CompanySettings.subdomain`, feeding `portal_domain`, e.g.
 * `https://subdomain.invoicing.co`) names the **client-facing invoice portal**
 * URL — a page this app never calls — not the API base.
 *
 * So this app follows the discourse/wordpress self-hosted pattern instead:
 * `w6w.network.allow: ["*"]`, and the instance URL is collected as an Auth
 * field (`lib/client.ts`, `auth/api-token.ts`) rather than assembled from a
 * vendor-owned wildcard apex. Health checks split the same way `apps/discourse`
 * does: `health/service.ts` watches the HOSTED service's own status feed,
 * while `health/instance.ts` probes each connection's own instance —
 * necessarily signed, since Invoice Ninja's `/health_check` endpoint 403s
 * without a valid token (verified live).
 *
 * Deliberately absent: recurring invoices/quotes/expenses, purchase orders,
 * credits, projects, vendors, bank integrations, designs, subscriptions and
 * webhooks — all real, documented resources this API has, but outside the
 * spec's core-surface list (clients, invoices, quotes, payments, products,
 * tasks, expenses). OAuth2/SSO login is also absent: this API's only
 * documented credential for third-party integrations is the static
 * `X-API-TOKEN`.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import clientCreate from "./actions/client-create.ts";
import clientGet from "./actions/client-get.ts";
import clientGetMany from "./actions/client-get-many.ts";
import clientUpdate from "./actions/client-update.ts";
import clientDelete from "./actions/client-delete.ts";

import invoiceCreate from "./actions/invoice-create.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceGetMany from "./actions/invoice-get-many.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import invoiceDelete from "./actions/invoice-delete.ts";
import invoiceSend from "./actions/invoice-send.ts";
import invoiceMarkPaid from "./actions/invoice-mark-paid.ts";

import quoteCreate from "./actions/quote-create.ts";
import quoteGet from "./actions/quote-get.ts";
import quoteGetMany from "./actions/quote-get-many.ts";
import quoteUpdate from "./actions/quote-update.ts";
import quoteDelete from "./actions/quote-delete.ts";
import quoteApprove from "./actions/quote-approve.ts";
import quoteConvertToInvoice from "./actions/quote-convert-to-invoice.ts";

import paymentCreate from "./actions/payment-create.ts";
import paymentGet from "./actions/payment-get.ts";
import paymentGetMany from "./actions/payment-get-many.ts";
import paymentUpdate from "./actions/payment-update.ts";
import paymentDelete from "./actions/payment-delete.ts";
import paymentRefund from "./actions/payment-refund.ts";

import productCreate from "./actions/product-create.ts";
import productGet from "./actions/product-get.ts";
import productGetMany from "./actions/product-get-many.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";

import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskGetMany from "./actions/task-get-many.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import expenseCreate from "./actions/expense-create.ts";
import expenseGet from "./actions/expense-get.ts";
import expenseGetMany from "./actions/expense-get-many.ts";
import expenseUpdate from "./actions/expense-update.ts";
import expenseDelete from "./actions/expense-delete.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";

export default {
  actions: [
    // client
    clientCreate,
    clientGet,
    clientGetMany,
    clientUpdate,
    clientDelete,
    // invoice
    invoiceCreate,
    invoiceGet,
    invoiceGetMany,
    invoiceUpdate,
    invoiceDelete,
    invoiceSend,
    invoiceMarkPaid,
    // quote
    quoteCreate,
    quoteGet,
    quoteGetMany,
    quoteUpdate,
    quoteDelete,
    quoteApprove,
    quoteConvertToInvoice,
    // payment
    paymentCreate,
    paymentGet,
    paymentGetMany,
    paymentUpdate,
    paymentDelete,
    paymentRefund,
    // product
    productCreate,
    productGet,
    productGetMany,
    productUpdate,
    productDelete,
    // task
    taskCreate,
    taskGet,
    taskGetMany,
    taskUpdate,
    taskDelete,
    // expense
    expenseCreate,
    expenseGet,
    expenseGetMany,
    expenseUpdate,
    expenseDelete,
  ],
  auth: [apiToken],
  healthChecks: [service, instance],
} satisfies AppDefinition;
