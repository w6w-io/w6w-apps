/**
 * Unbounce — landing pages, pop-ups and sticky bars for conversion campaigns,
 * over the Unbounce REST API v0.4 (`api.unbounce.com`).
 *
 * Every path, verb, query parameter and response field in this app was
 * verified on 2026-08-30 against Unbounce's own developer portal
 * (`developer.unbounce.com/api_reference/` and `/getting_started/`, fetched
 * live — a server-rendered reference with an inline JSON Schema per endpoint,
 * not a SPA) plus live probes against `api.unbounce.com` and
 * `status.unbounce.com`. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Errors are not one shape** (`lib/client.ts`). The reference's own
 *     "Errors" section implies a uniform JSON body; the wire disagrees — an
 *     unmatched route answers JSON, but a missing or rejected credential
 *     answers `401` as **plain text** (`"Unauthorized\nRequested URL: …"`),
 *     with no field distinguishing "no credential" from "bad credential".
 *  2. **Two endpoints refuse an API key outright** (`auth/api-key.ts`,
 *     `actions/page-lead-delete.ts`, `actions/page-lead-deletion-request-create.ts`).
 *     Unbounce documents these as "OAuth only" — the account model has no
 *     scope system to explain that in advance, so both actions say so in
 *     their own `description`.
 *  3. **No rate-limit header is published** (`lib/client.ts`, `health/`). The
 *     reference documents a 500 req/min ceiling in prose only; none was
 *     observed live either. So this app declares no `quota` health check
 *     rather than inventing a headroom figure the vendor never publishes.
 *
 * The account model is three levels deep: an Account owns Sub-Accounts
 * (Unbounce's own UI calls these "Clients"), and Sub-Accounts own Domains,
 * Page Groups and Pages. "List every page" therefore depends on which level a
 * credential can see, so this app exposes each level's own page list
 * separately (`account-page-list`, `sub-account-page-list`,
 * `domain-page-list`, `page-group-page-list`, and the top-level `page-list`
 * for OAuth clients that can see pages across sub-accounts) rather than
 * assuming one global list is enough.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

import apiMetaGet from "./actions/api-meta-get.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";
import accountSubAccountList from "./actions/account-sub-account-list.ts";
import accountPageList from "./actions/account-page-list.ts";

import subAccountGet from "./actions/sub-account-get.ts";
import subAccountDomainList from "./actions/sub-account-domain-list.ts";
import subAccountPageGroupList from "./actions/sub-account-page-group-list.ts";
import subAccountPageList from "./actions/sub-account-page-list.ts";

import domainGet from "./actions/domain-get.ts";
import domainPageList from "./actions/domain-page-list.ts";

import pageList from "./actions/page-list.ts";
import pageGet from "./actions/page-get.ts";
import pageFormFieldList from "./actions/page-form-field-list.ts";

import pageLeadList from "./actions/page-lead-list.ts";
import pageLeadCreate from "./actions/page-lead-create.ts";
import pageLeadGet from "./actions/page-lead-get.ts";
import pageLeadDelete from "./actions/page-lead-delete.ts";
import pageLeadDeletionRequestCreate from "./actions/page-lead-deletion-request-create.ts";
import pageLeadDeletionRequestGet from "./actions/page-lead-deletion-request-get.ts";

import pageGroupPageList from "./actions/page-group-page-list.ts";
import leadGet from "./actions/lead-get.ts";

import userGetSelf from "./actions/user-get-self.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";

export default {
  actions: [
    apiMetaGet,
    // Accounts
    accountList,
    accountGet,
    accountSubAccountList,
    accountPageList,
    // Sub-Accounts ("Clients")
    subAccountGet,
    subAccountDomainList,
    subAccountPageGroupList,
    subAccountPageList,
    // Domains
    domainGet,
    domainPageList,
    // Pages
    pageList,
    pageGet,
    pageFormFieldList,
    // Leads
    pageLeadList,
    pageLeadCreate,
    pageLeadGet,
    pageLeadDelete,
    pageLeadDeletionRequestCreate,
    pageLeadDeletionRequestGet,
    // Page Groups
    pageGroupPageList,
    leadGet,
    // Users
    userGetSelf,
    userGet,
  ],
  // API Key for a single account (works everywhere except the two OAuth-only
  // lead-deletion endpoints); OAuth for a public integration, or to reach those.
  auth: [apiKey, oauth2],
  healthChecks: [service],
} satisfies AppDefinition;
