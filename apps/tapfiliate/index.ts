/**
 * Tapfiliate — affiliate marketing platform: programs, affiliates, customers,
 * conversions, commissions, payments, and clicks, over the Tapfiliate REST
 * API v1.6 (`api.tapfiliate.com`).
 *
 * Every path, verb, parameter and body field in this app was read off
 * `https://tapfiliate.com/docs/rest/` (fetched 2026-09-05) — the page the
 * build brief's given Apiary blueprint URL
 * (`https://tapfiliate.docs.apiary.io/`) redirects readers to, since that
 * blueprint is a 144-byte stub reading "Our docs have moved" — cross-checked
 * against the page's own code-sample bodies, and verified live against
 * `api.tapfiliate.com` and `status.tapfiliate.com`.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **A missing or empty credential answers with an HTML page, not a JSON
 *     error** (`lib/client.ts`, `auth/api-key.ts`). `GET /1.6/programs/`
 *     replies `{"message":"Authentication Failed.","code":401}` for a
 *     non-empty but wrong `X-Api-Key` — but with no header, or an empty one,
 *     it answers `text/html`: the web app's own login-wall page. An unmapped
 *     path gets the same treatment (its "Page not found" page). The client
 *     and the auth `test` hook both check `content-type` before parsing.
 *  2. **`X-Api-Key`, no prefix, one account-wide key** (`auth/api-key.ts`).
 *     Unlike some vendors in this pack, Tapfiliate documents no scoped or
 *     read-only key — the docs' own warning is "Your API keys can approve
 *     commissions, so be sure to keep them secret!" — so there is no
 *     "narrowest usable" read to prefer for the health probe; any read works
 *     equally well.
 *  3. **Two request-argument shapes are undocumented in prose and only
 *     recoverable from the page's own Node.js code samples**
 *     (`actions/affiliate-group-set.ts`, `actions/affiliate-group-create.ts`).
 *     "Set affiliate group" and "Create affiliate group" both render with an
 *     empty "Arguments" section; their body fields (`group_id`, `title`) only
 *     appear inside the rendered `const options = { … body: {...} }` sample.
 *     Trusting the prose alone would have shipped two actions that silently
 *     did nothing.
 *
 * Not every documented endpoint is implemented. Left out of this build for
 * surface control, and fully expressible via `client.request` if ever
 * needed: the per-key `meta-data/{key}/` CRUD on customers, conversions and
 * affiliates (their collection-level get/replace form already covers the
 * same data); affiliate notes CRUD; affiliate payout-methods get/set and the
 * MLM parent set/remove; `affiliate-groups` update and `affiliate-prospects`
 * get-by-id; `programs/{id}/affiliates/{id}` get/update and the program
 * levels/bonuses lists; and the bulk (array-body) form of `payment-create`.
 * See the README for the full list.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import customerCancel from "./actions/customer-cancel.ts";
import customerUncancel from "./actions/customer-uncancel.ts";

import conversionList from "./actions/conversion-list.ts";
import conversionGet from "./actions/conversion-get.ts";
import conversionCreate from "./actions/conversion-create.ts";
import conversionUpdate from "./actions/conversion-update.ts";
import conversionDelete from "./actions/conversion-delete.ts";
import conversionCommissionsAdd from "./actions/conversion-commissions-add.ts";

import commissionList from "./actions/commission-list.ts";
import commissionGet from "./actions/commission-get.ts";
import commissionUpdate from "./actions/commission-update.ts";
import commissionApprove from "./actions/commission-approve.ts";
import commissionDisapprove from "./actions/commission-disapprove.ts";

import affiliateList from "./actions/affiliate-list.ts";
import affiliateGet from "./actions/affiliate-get.ts";
import affiliateCreate from "./actions/affiliate-create.ts";
import affiliateDelete from "./actions/affiliate-delete.ts";
import affiliateGroupSet from "./actions/affiliate-group-set.ts";
import affiliateGroupRemove from "./actions/affiliate-group-remove.ts";
import affiliateBalancesGet from "./actions/affiliate-balances-get.ts";
import affiliatePaymentsList from "./actions/affiliate-payments-list.ts";
import affiliateProgramsList from "./actions/affiliate-programs-list.ts";

import affiliateGroupList from "./actions/affiliate-group-list.ts";
import affiliateGroupCreate from "./actions/affiliate-group-create.ts";

import affiliateProspectList from "./actions/affiliate-prospect-list.ts";
import affiliateProspectCreate from "./actions/affiliate-prospect-create.ts";
import affiliateProspectDelete from "./actions/affiliate-prospect-delete.ts";

import programList from "./actions/program-list.ts";
import programGet from "./actions/program-get.ts";
import programAffiliatesList from "./actions/program-affiliates-list.ts";
import programAffiliateAdd from "./actions/program-affiliate-add.ts";
import programAffiliateApprove from "./actions/program-affiliate-approve.ts";
import programAffiliateDisapprove from "./actions/program-affiliate-disapprove.ts";
import programCommissionTypesList from "./actions/program-commission-types-list.ts";

import balanceList from "./actions/balance-list.ts";
import paymentList from "./actions/payment-list.ts";
import paymentCreate from "./actions/payment-create.ts";
import paymentCancel from "./actions/payment-cancel.ts";

import clickCreate from "./actions/click-create.ts";
import clickList from "./actions/click-list.ts";
import clickGet from "./actions/click-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Customers
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerDelete,
    customerCancel,
    customerUncancel,
    // Conversions
    conversionList,
    conversionGet,
    conversionCreate,
    conversionUpdate,
    conversionDelete,
    conversionCommissionsAdd,
    // Commissions
    commissionList,
    commissionGet,
    commissionUpdate,
    commissionApprove,
    commissionDisapprove,
    // Affiliates
    affiliateList,
    affiliateGet,
    affiliateCreate,
    affiliateDelete,
    affiliateGroupSet,
    affiliateGroupRemove,
    affiliateBalancesGet,
    affiliatePaymentsList,
    affiliateProgramsList,
    // Affiliate groups
    affiliateGroupList,
    affiliateGroupCreate,
    // Affiliate prospects
    affiliateProspectList,
    affiliateProspectCreate,
    affiliateProspectDelete,
    // Programs
    programList,
    programGet,
    programAffiliatesList,
    programAffiliateAdd,
    programAffiliateApprove,
    programAffiliateDisapprove,
    programCommissionTypesList,
    // Payments
    balanceList,
    paymentList,
    paymentCreate,
    paymentCancel,
    // Clicks
    clickCreate,
    clickList,
    clickGet,
  ],
  // Tapfiliate publishes no OAuth surface and no scoped-key concept for
  // third-party integrations — a single account-wide API key is the whole
  // authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
