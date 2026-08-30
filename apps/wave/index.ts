/**
 * Wave — free small-business accounting and invoicing.
 *
 * Wave has **no REST API**. Everything is a GraphQL POST to a single endpoint
 * (`https://gql.waveapps.com/graphql/public`), so `lib/client.ts` is a GraphQL
 * client rather than a REST wrapper and each action owns its own document.
 * Four things are worth knowing before reading any action:
 *
 *   - **Almost everything nests under `business`.** There is no top-level
 *     `customers`/`invoices`/`products` query — Wave's own schema reference
 *     says so: those fields live on `Business`, reached as `business(id:
 *     $businessId) { customers(...) { ... } }`. `business-list` is how a
 *     workflow discovers the id every other action needs.
 *   - **Failure arrives as HTTP 200, on two independent channels.** A
 *     malformed query or a bad id returns `errors[]` with the requested field
 *     `null` — `WaveClient.send` throws on this. A rejected MUTATION returns
 *     no `errors[]` at all, just `didSucceed: false` and an `inputErrors[]`
 *     array beside the (null) record — `unwrap` closes this second channel,
 *     and every mutation here routes through it.
 *   - **Pagination is limit/offset, not cursor-based.** `page` (1-based) and
 *     `pageSize`, with `pageInfo { currentPage totalPages totalCount }` —
 *     confirmed from Wave's own "Pagination" doc, which states this
 *     explicitly rather than leaving it to be assumed.
 *   - **No version header, no query-cost budget.** Unlike some GraphQL APIs
 *     in this pack (Jobber), Wave's docs describe the API as deliberately
 *     versionless, and nothing in the schema or docs exposes a rate-limit
 *     signal — see the README for why this app ships no `quota` health check.
 *
 * Everything here was checked against the LIVE schema: Wave's GraphQL
 * endpoint answers introspection unauthenticated, so every field, argument,
 * enum value and input type used below was read directly off the server
 * rather than assumed from the documentation.
 *
 * Deliberately absent: sales taxes, vendors, invoice payments/reminders,
 * estimate deposits and acceptance history, recurring invoices, checkouts,
 * and the constants queries (`currencies`/`countries`/`accountSubtypes`) —
 * see the README. All are reachable through `graphql-query`.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import fullAccessToken from "./auth/full-access-token.ts";

// Reference data
import userGet from "./actions/user-get.ts";
import businessList from "./actions/business-list.ts";
import businessGet from "./actions/business-get.ts";
import accountList from "./actions/account-list.ts";

// Customers
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerEdit from "./actions/customer-edit.ts";
import customerDelete from "./actions/customer-delete.ts";

// Products
import productList from "./actions/product-list.ts";
import productCreate from "./actions/product-create.ts";

// Invoices
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceSend from "./actions/invoice-send.ts";

// Estimates
import estimateList from "./actions/estimate-list.ts";
import estimateGet from "./actions/estimate-get.ts";
import estimateCreate from "./actions/estimate-create.ts";
import estimateSend from "./actions/estimate-send.ts";

// Money transactions
import moneyTransactionCreate from "./actions/money-transaction-create.ts";

// Escape hatch
import graphqlQuery from "./actions/graphql-query.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // reference
    userGet,
    businessList,
    businessGet,
    accountList,
    // customer
    customerList,
    customerGet,
    customerCreate,
    customerEdit,
    customerDelete,
    // product
    productList,
    productCreate,
    // invoice
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceSend,
    // estimate
    estimateList,
    estimateGet,
    estimateCreate,
    estimateSend,
    // transaction
    moneyTransactionCreate,
    // raw
    graphqlQuery,
  ],
  auth: [oauth2, fullAccessToken],
  healthChecks: [service],
} satisfies AppDefinition;
