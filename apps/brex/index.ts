/**
 * Brex — corporate cards and spend management, over the Brex **Team API v1.0**
 * (`api.brex.com`): the user directory, the departments, locations and titles it
 * hangs off, legal entities, the company behind the credential, and the cards
 * themselves — listed, read, re-limited, locked, unlocked and terminated.
 *
 * Every path, verb, query parameter, body field and enum in this app was verified
 * on 2026-09-22 against Brex's own machine-readable OpenAPI bundle
 * (`developer.brex.com/openapi/team_api.md` plus the per-endpoint pages it
 * links) and against live probes of `api.brex.com` and `status.brex.com`.
 * Nothing here came from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **Authentication is a static user token** (`auth/api-token.ts`). Brex
 *     documents two auth stories; this app implements the dashboard-minted user
 *     token sent as `Authorization: Bearer`, and deliberately does not implement
 *     the partner OAuth2 consent-and-refresh flow, which needs a registered OAuth
 *     application and a live per-customer authorization step. The README states
 *     the narrowing.
 *  2. **`403` is overloaded** (`auth/api-token.ts`, `lib/client.ts`). Brex's error
 *     table documents `403` as "Expired token"; a live probe with a fake token
 *     answered `403 {"type":"FORBIDDEN","message":"Invalid or Revoked Token"}`.
 *     The credential probe classifies from the response body, never the status
 *     code alone.
 *  3. **The whoami is safe to probe and safe to expose**
 *     (`auth/api-token.ts`, `actions/user-get-current.ts`). `GET /v2/users/me`
 *     needs no scope beyond holding a token and returns no token, key or secret
 *     field, so it is both the liveness probe and an Action — addressed through
 *     one shared path constant.
 *  4. **Brex does not normalize its own field names** (`lib/client.ts`). Users,
 *     locations, departments and cards are snake_case; a legal entity's
 *     `displayName`/`billingAddress`/`createdAt`/`isDefault` and a company's
 *     `accountType` are camelCase. Both are passed through verbatim.
 *  5. **There is no rate-limit header** (`health/quota.ts`). Brex documents
 *     numeric ceilings in prose and signals one only with a `429`; two live
 *     responses carried no `X-RateLimit-*`, `RateLimit-*` or `Retry-After`
 *     header, so quota headroom is declared absent rather than invented.
 *
 * Scope is the Team API only. Brex also publishes Accounting, Budgets, Expenses,
 * Fields, Onboarding, Payments, Transactions, Travel and Webhooks OpenAPI docs;
 * none of those are in this build. Within Cards, three endpoints are deliberately
 * not implemented — see the README's "not covered" section for why each was
 * dropped.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import userList from "./actions/user-list.ts";
import userInvite from "./actions/user-invite.ts";
import userGetCurrent from "./actions/user-get-current.ts";
import userGet from "./actions/user-get.ts";
import userUpdate from "./actions/user-update.ts";

import locationList from "./actions/location-list.ts";
import locationCreate from "./actions/location-create.ts";
import locationGet from "./actions/location-get.ts";

import departmentList from "./actions/department-list.ts";
import departmentCreate from "./actions/department-create.ts";
import departmentGet from "./actions/department-get.ts";

import titleList from "./actions/title-list.ts";
import titleCreate from "./actions/title-create.ts";
import titleGet from "./actions/title-get.ts";

import cardList from "./actions/card-list.ts";
import cardGet from "./actions/card-get.ts";
import cardUpdate from "./actions/card-update.ts";
import cardLock from "./actions/card-lock.ts";
import cardUnlock from "./actions/card-unlock.ts";
import cardTerminate from "./actions/card-terminate.ts";

import legalEntityList from "./actions/legal-entity-list.ts";
import legalEntityGet from "./actions/legal-entity-get.ts";

import companyGet from "./actions/company-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Users
    userList,
    userInvite,
    userGetCurrent,
    userGet,
    userUpdate,
    // Locations
    locationList,
    locationCreate,
    locationGet,
    // Departments
    departmentList,
    departmentCreate,
    departmentGet,
    // Titles
    titleList,
    titleCreate,
    titleGet,
    // Cards
    cardList,
    cardGet,
    cardUpdate,
    cardLock,
    cardUnlock,
    cardTerminate,
    // Legal entities
    legalEntityList,
    legalEntityGet,
    // Company
    companyGet,
  ],
  // One method, one credential kind. Brex has a partner OAuth2 flow as well, but
  // it needs a registered OAuth application and a live consent screen, so this
  // app declares the static user token only (see auth/api-token.ts and README).
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
