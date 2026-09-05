/**
 * Wise — cross-border money transfers, over the **Wise Platform API**
 * (`api.wise.com`).
 *
 * Every path, verb, query parameter, body field and security requirement in
 * this app was verified on 2026-09-05 against Wise's own machine-readable
 * OpenAPI 3.1 bundle
 * (`docs.wise.com/_bundle/api-reference/@latest/index.json`, 1,919,425 bytes,
 * `info.title` "Wise Platform API"), the prose guide at
 * `docs.wise.com/guides/developer/auth-and-security/personal-api-token`,
 * plus live probes against `api.wise.com` and `status.wise.com`. Nothing here
 * came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The base URL is calendar-versioned, not integer-versioned**
 *     (`lib/client.ts`). The current documented prefix is `/2026Q3/`,
 *     superseding a legacy per-resource mess of `/v1/`.../`/v4/` — confirmed
 *     live and inconsistent resource-to-resource, exactly what the vendor's
 *     own docs warn "pre-global versioned APIs (legacy)" mean. This constant
 *     will need bumping when Wise rolls to the next quarter.
 *  2. **A personal API token is a business-account feature with a
 *     documented, closed scope** (`auth/api-token.ts`) — and the guide that
 *     states that scope contradicts its own OpenAPI spec about which
 *     endpoints are in it. Both are real, both were read the same day, and
 *     the discrepancy is disclosed rather than silently resolved.
 *  3. **Two endpoints are SCA-protected and country-restricted for personal
 *     tokens** — Fund Transfer and Get Balance Statement
 *     (`actions/transfer-fund.ts`, `actions/balance-statement-get.ts`) work
 *     for OAuth partner flows and for six listed countries, and are
 *     documented as such rather than silently working everywhere.
 *  4. **List endpoints answer two different shapes.** Recipient List returns
 *     a paged envelope (`{content, seekPositionForNext, ...}`); every other
 *     list in this app (profiles, transfers, balances, rates, currencies)
 *     answers a bare JSON array. `recipient-list.ts` documents the
 *     difference; every bare-array action wraps its result as `{ items }` to
 *     present one consistent shape regardless.
 *  5. **One request needs a non-standard content type.** Quote Update's body
 *     is `application/merge-patch+json`, not `application/json` — the wrong
 *     one is refused with a 415. See `actions/quote-update.ts`.
 *
 * ## Auth
 *
 * One method, `api-token` (type `bearer`): a Personal API Token from a Wise
 * business account, or an OAuth user access token for partners. Both use the
 * identical `Authorization: Bearer <token>` wire format, so one `sign` hook
 * covers both — Wise's own gateway is what enforces which token type may
 * reach which endpoint.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import profileList from "./actions/profile-list.ts";
import profileGet from "./actions/profile-get.ts";

import quoteCreate from "./actions/quote-create.ts";
import quoteGet from "./actions/quote-get.ts";
import quoteUpdate from "./actions/quote-update.ts";

import recipientList from "./actions/recipient-list.ts";
import recipientGet from "./actions/recipient-get.ts";
import recipientCreate from "./actions/recipient-create.ts";

import transferCreate from "./actions/transfer-create.ts";
import transferGet from "./actions/transfer-get.ts";
import transferList from "./actions/transfer-list.ts";
import transferCancel from "./actions/transfer-cancel.ts";
import transferFund from "./actions/transfer-fund.ts";

import balanceList from "./actions/balance-list.ts";
import balanceGet from "./actions/balance-get.ts";
import balanceStatementGet from "./actions/balance-statement-get.ts";

import rateGet from "./actions/rate-get.ts";
import currencyList from "./actions/currency-list.ts";
import accountGet from "./actions/account-get.ts";

import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Profile
    profileList,
    profileGet,
    // Quote
    quoteCreate,
    quoteGet,
    quoteUpdate,
    // Recipient
    recipientList,
    recipientGet,
    recipientCreate,
    // Transfer
    transferCreate,
    transferGet,
    transferList,
    transferCancel,
    transferFund,
    // Balance
    balanceList,
    balanceGet,
    balanceStatementGet,
    // Rates & currencies
    rateGet,
    currencyList,
    // Account
    accountGet,
  ],
  auth: [apiToken],
  healthChecks: [service, requestRate],
} satisfies AppDefinition;
