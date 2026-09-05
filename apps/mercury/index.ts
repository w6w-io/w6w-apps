/**
 * Mercury — business banking, over the **Mercury API** (`api.mercury.com/api/v1`).
 *
 * Every path, verb, query parameter, body field and security requirement in
 * this app was verified on 2026-09-05 against Mercury's own machine-readable
 * OpenAPI document — embedded verbatim inside the `ssr-props` hydration
 * payload of every page at `docs.mercury.com/reference/*`, a ReadMe-hosted
 * reference confirmed live the same day (all 74 paths, `info.title` "Mercury
 * API", `servers[0].url` "https://api.mercury.com/api/v1") — plus live
 * probes against `api.mercury.com` and `status.mercury.com`. Nothing here
 * came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **This is a banking API — real money moves through two actions.**
 *     `transaction-send` ("Send money to a recipient") and `transfer-create`
 *     ("Create an internal transfer") both require a vendor-mandated
 *     `idempotencyKey` and are documented "processed immediately or may
 *     require approval" — this app cannot see or configure which. See both
 *     actions' own doc comments.
 *  2. **The auth probe deliberately avoids every sensitive read.**
 *     `GET /categories` (custom expense-category LABELS only) is the probe
 *     — not `GET /organization` (EIN + legal business name) and not
 *     `GET /accounts` (live balances). See `auth/api-token.ts`.
 *  3. **List response envelopes are never uniform.** The array key varies
 *     per resource (`accounts`, `cards`, `categories`, `recipients`,
 *     `customers`, `invoices`, `webhooks`, `users`, `transactions`,
 *     `statements`) — every list action here re-presents its own key as a
 *     consistent `{ items, nextPage, previousPage }`.
 *  4. **The status page is real but NOT a classic Statuspage** —
 *     `status.mercury.com` is incident.io-hosted, yet its `/api/v2/
 *     summary.json` is Statuspage-v2-JSON-compatible, and — unlike a classic
 *     Statuspage instance — omits `incidents`/`scheduled_maintenances`
 *     entirely rather than sending empty arrays when there are none. See
 *     `health/service.ts`.
 *  5. **Mercury exposes no rate-limit headroom anywhere** — no header, no
 *     endpoint, no documentation of one. See `health/quota.ts`.
 *  6. **`CreateCardType` is a one-value enum: `["virtual"]`.** The API can
 *     only issue virtual cards; physical card issuance is not exposed here.
 *
 * ## Auth
 *
 * One method, `api-token` (type `bearer`): a personal or organization API
 * token from the Mercury dashboard. Mercury's own worked example bakes a
 * literal `secret-token:` prefix INTO the token value itself — this app
 * stores whatever the user pastes verbatim and never tries to add or strip
 * it.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";
import accountStatementList from "./actions/account-statement-list.ts";
import statementPdfGet from "./actions/statement-pdf-get.ts";

import transactionList from "./actions/transaction-list.ts";
import transactionGet from "./actions/transaction-get.ts";
import transactionUpdate from "./actions/transaction-update.ts";
import transactionSend from "./actions/transaction-send.ts";
import transferCreate from "./actions/transfer-create.ts";

import cardList from "./actions/card-list.ts";
import cardGet from "./actions/card-get.ts";
import cardFreeze from "./actions/card-freeze.ts";
import cardUnfreeze from "./actions/card-unfreeze.ts";
import cardCancel from "./actions/card-cancel.ts";

import recipientList from "./actions/recipient-list.ts";
import recipientGet from "./actions/recipient-get.ts";
import recipientCreate from "./actions/recipient-create.ts";
import recipientDelete from "./actions/recipient-delete.ts";

import categoryList from "./actions/category-list.ts";
import categoryCreate from "./actions/category-create.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";

import organizationGet from "./actions/organization-get.ts";
import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Accounts
    accountList,
    accountGet,
    accountStatementList,
    statementPdfGet,
    // Transactions & money movement
    transactionList,
    transactionGet,
    transactionUpdate,
    transactionSend,
    transferCreate,
    // Cards
    cardList,
    cardGet,
    cardFreeze,
    cardUnfreeze,
    cardCancel,
    // Recipients
    recipientList,
    recipientGet,
    recipientCreate,
    recipientDelete,
    // Categories
    categoryList,
    categoryCreate,
    // Accounts receivable: customers
    customerList,
    customerGet,
    customerCreate,
    // Accounts receivable: invoices
    invoiceList,
    invoiceGet,
    invoiceCreate,
    // Webhooks
    webhookList,
    webhookCreate,
    // Organization & users
    organizationGet,
    userList,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
