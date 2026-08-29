/**
 * Whop — creator-commerce platform: memberships, products, plans, payments,
 * promo codes, and webhooks, over the Whop REST API v1 (`api.whop.com/api/v1`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-29 against Whop's own documentation
 * (`docs.whop.com`, read as markdown via `llms.txt`/`llms-full.txt` and the
 * per-endpoint OpenAPI 3.1 fragments embedded in each reference page) plus
 * live probes against `api.whop.com` and `status.whop.com`. Nothing here came
 * from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **An unpinned request silently gets the pre-2025 API** (`lib/client.ts`).
 *     Every native resource here (Memberships, Members, Products, Plans,
 *     Promo Codes, Webhooks) was migrated between 2026-06-08 and 2026-08-03
 *     from a `company_id` model to `account_id`. Without `Api-Version-Date`
 *     the OLD handler runs and rejects the new field name — measured live:
 *     `GET /products?first=1` unpinned answers `400 Missing required
 *     parameter: company_id`. Every request this app sends pins
 *     `API_VERSION_DATE`.
 *  2. **Payments is the one resource that was never migrated** (`lib/client.ts`,
 *     `actions/payment-*.ts`). It still takes `company_id`, confirmed by both
 *     the vendor's Legacy reference page and the getting-started guide's only
 *     worked `curl` example against this API.
 *  3. **The auth probe is `/permissions`, not `/users/me`** (`auth/api-key.ts`).
 *     `GET /users/me` answers the identical `404 "User not found"` for both a
 *     missing and a fake bearer token, and "the authenticated user" may not
 *     resolve at all for an App API key (which authenticates as the app, not
 *     a person). `/permissions` is documented to answer uniformly for every
 *     credential shape this Auth accepts and returns nothing credential-shaped.
 *  4. **Two secrets, two different rules** (`lib/client.ts`, `actions/webhook-create.ts`,
 *     `actions/payment-*.ts`). `POST /webhooks` returns a live `webhook_secret`
 *     that the workflow genuinely needs downstream (to verify inbound
 *     deliveries) — kept, with a loud warning to treat the output as
 *     sensitive. A Payment's `client_secret` — meant for the BUYER's own
 *     client-side checkout poll — is incidental to reading a payment for
 *     reporting or reconciliation and is stripped before this app returns one.
 *  5. **`amount_off`'s unit flips between write and read** (`actions/promo-code-create.ts`).
 *     Creating a percentage promo code takes a whole number (`25` for 25%
 *     off); reading that same code back reports it as a decimal fraction
 *     (`0.25`) per the PromoCode entity schema's own words.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import membershipList from "./actions/membership-list.ts";
import membershipGet from "./actions/membership-get.ts";
import membershipUpdate from "./actions/membership-update.ts";
import membershipCancel from "./actions/membership-cancel.ts";
import membershipPause from "./actions/membership-pause.ts";
import membershipResume from "./actions/membership-resume.ts";
import membershipExtend from "./actions/membership-extend.ts";

import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";

import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";

import planList from "./actions/plan-list.ts";
import planGet from "./actions/plan-get.ts";
import planCreate from "./actions/plan-create.ts";
import planUpdate from "./actions/plan-update.ts";
import planDelete from "./actions/plan-delete.ts";

import promoCodeList from "./actions/promo-code-list.ts";
import promoCodeGet from "./actions/promo-code-get.ts";
import promoCodeCreate from "./actions/promo-code-create.ts";
import promoCodeDelete from "./actions/promo-code-delete.ts";
import promoCodeActivate from "./actions/promo-code-activate.ts";
import promoCodeDeactivate from "./actions/promo-code-deactivate.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import paymentList from "./actions/payment-list.ts";
import paymentGet from "./actions/payment-get.ts";
import paymentRefund from "./actions/payment-refund.ts";

import userGet from "./actions/user-get.ts";
import userCheckAccess from "./actions/user-check-access.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Memberships
    membershipList,
    membershipGet,
    membershipUpdate,
    membershipCancel,
    membershipPause,
    membershipResume,
    membershipExtend,
    // Members
    memberList,
    memberGet,
    // Products
    productList,
    productGet,
    productCreate,
    productUpdate,
    productDelete,
    // Plans
    planList,
    planGet,
    planCreate,
    planUpdate,
    planDelete,
    // Promo Codes
    promoCodeList,
    promoCodeGet,
    promoCodeCreate,
    promoCodeDelete,
    promoCodeActivate,
    promoCodeDeactivate,
    // Webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    // Payments (Legacy — company_id, see lib/client.ts)
    paymentList,
    paymentGet,
    paymentRefund,
    // Users
    userGet,
    userCheckAccess,
  ],
  // API key only. Whop's OAuth surface authenticates a signed-in USER (for
  // "Sign in with Whop" and embedded-chat use cases), a fundamentally
  // different shape from the account/app-scoped credential this app's
  // account-and-catalog-management actions need — see rfcs/auth.md's
  // guidance to model distinct credential shapes as distinct Auth methods
  // rather than force one flow to cover both.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
