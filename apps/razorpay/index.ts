/**
 * Razorpay — India-focused payment gateway: Orders, Payments (capture,
 * refund), Refunds, Customers, Payment Links, Invoices, Items, Plans,
 * Subscriptions, Settlements, Disputes and UPI QR Codes, over the Razorpay
 * API v1 (`api.razorpay.com/v1`).
 *
 * Every path, verb, request/response field and error shape in this app was
 * verified on 2026-09-01 against Razorpay's own machine-readable OpenAPI 3.0
 * document (`razorpay.com/openapi.json`, 402,421 bytes, `info.version`
 * `1.0.0`), cross-checked against the prose docs it is generated alongside
 * (fetched as raw Markdown from `razorpay.com/docs/api/**` via the `.md`
 * suffix Mintlify serves), and live probes against `api.razorpay.com` and
 * `status.razorpay.com`. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The auth error code never disambiguates — only the description does**
 *     (`lib/client.ts`, `auth/basic.ts`). Every credential failure is `401
 *     BAD_REQUEST_ERROR`; a missing header and a wrong secret differ only in
 *     `error.description`.
 *  2. **Amounts are integers in the smallest currency sub-unit, with two
 *     documented exceptions** (`lib/client.ts`, `lib/params.ts`) —
 *     three-decimal currencies (KWD, BHD, OMR) drop the last decimal digit,
 *     zero-decimal currencies (JPY) are passed as-is.
 *  3. **The status host has a real feed and a decoy on the same domain**
 *     (`health/service.ts`) — every Statuspage-shaped `/api/v2/*.json` path
 *     200s with an identical HTML shell, while the actual live feed is the
 *     unrelated `/api/services` (a self-hosted Statping instance).
 *
 * RazorpayX (Razorpay's separate banking/payouts product — contacts, fund
 * accounts, payouts, virtual accounts, banking balances) and the
 * Partner/Route sub-merchant APIs (`/v2/accounts/**`, transfers, reversals)
 * are a different activation and a different product, and are deliberately
 * left out of this app rather than half-covered. See `README.md` for the
 * full list of what is out of scope and why.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import orderCreate from "./actions/order-create.ts";
import orderGet from "./actions/order-get.ts";
import orderList from "./actions/order-list.ts";
import orderPaymentsList from "./actions/order-payments-list.ts";

import paymentGet from "./actions/payment-get.ts";
import paymentList from "./actions/payment-list.ts";
import paymentUpdate from "./actions/payment-update.ts";
import paymentCapture from "./actions/payment-capture.ts";
import paymentRefundCreate from "./actions/payment-refund-create.ts";

import refundList from "./actions/refund-list.ts";
import refundGet from "./actions/refund-get.ts";

import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerList from "./actions/customer-list.ts";
import customerUpdate from "./actions/customer-update.ts";

import paymentLinkCreate from "./actions/payment-link-create.ts";
import paymentLinkGet from "./actions/payment-link-get.ts";
import paymentLinkList from "./actions/payment-link-list.ts";
import paymentLinkUpdate from "./actions/payment-link-update.ts";
import paymentLinkCancel from "./actions/payment-link-cancel.ts";

import itemCreate from "./actions/item-create.ts";
import itemList from "./actions/item-list.ts";

import planCreate from "./actions/plan-create.ts";
import planList from "./actions/plan-list.ts";

import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionList from "./actions/subscription-list.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionPause from "./actions/subscription-pause.ts";
import subscriptionResume from "./actions/subscription-resume.ts";

import settlementList from "./actions/settlement-list.ts";
import settlementGet from "./actions/settlement-get.ts";

import disputeList from "./actions/dispute-list.ts";
import disputeGet from "./actions/dispute-get.ts";
import disputeAccept from "./actions/dispute-accept.ts";
import disputeContest from "./actions/dispute-contest.ts";

import qrCodeCreate from "./actions/qr-code-create.ts";
import qrCodeGet from "./actions/qr-code-get.ts";
import qrCodeClose from "./actions/qr-code-close.ts";

import invoiceCreate from "./actions/invoice-create.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceIssue from "./actions/invoice-issue.ts";
import invoiceCancel from "./actions/invoice-cancel.ts";
import invoiceList from "./actions/invoice-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Orders
    orderCreate,
    orderGet,
    orderList,
    orderPaymentsList,
    // Payments
    paymentGet,
    paymentList,
    paymentUpdate,
    paymentCapture,
    paymentRefundCreate,
    // Refunds
    refundList,
    refundGet,
    // Customers
    customerCreate,
    customerGet,
    customerList,
    customerUpdate,
    // Payment Links
    paymentLinkCreate,
    paymentLinkGet,
    paymentLinkList,
    paymentLinkUpdate,
    paymentLinkCancel,
    // Items
    itemCreate,
    itemList,
    // Plans
    planCreate,
    planList,
    // Subscriptions
    subscriptionCreate,
    subscriptionGet,
    subscriptionList,
    subscriptionCancel,
    subscriptionPause,
    subscriptionResume,
    // Settlements
    settlementList,
    settlementGet,
    // Disputes
    disputeList,
    disputeGet,
    disputeAccept,
    disputeContest,
    // QR Codes
    qrCodeCreate,
    qrCodeGet,
    qrCodeClose,
    // Invoices
    invoiceCreate,
    invoiceGet,
    invoiceIssue,
    invoiceCancel,
    invoiceList,
  ],
  // Basic auth (key id + key secret) only. Razorpay's OAuth surface
  // (`mcp.razorpay.com`) authenticates its own MCP server, not this REST API.
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
