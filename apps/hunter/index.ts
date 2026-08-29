/**
 * Hunter — find and verify professional email addresses, enrich people and
 * companies, and manage the Hunter Leads CRM, all against `api.hunter.io/v2`.
 *
 * Auth is a single `apiKey` method (see `auth/api-key.ts`) — Hunter accepts
 * the key as a query parameter, an `X-API-KEY` header, or a Bearer token;
 * this app standardises on the query parameter, the form used throughout
 * Hunter's own reference docs.
 *
 * Deliberately out of scope (see README for the full reasoning):
 *  - **Discover** and the beta **Discover People** / **Multi-Domain Search**
 *    — an AI-assisted company-search surface with a large, still-changing
 *    filter grammar, distinct from the finder/verifier/enrichment/leads
 *    surface this app covers.
 *  - **Sequences**, **Email Accounts**, **Messages** — these manage a
 *    connected mailbox and its warmup/sending state rather than lookup or
 *    lead data, and would need their own credential story (an email account
 *    id, not just the API key).
 *  - **Lead Tags**, **Custom Attributes**, **Lists Folders/Favorites**,
 *    **Bulk lead/company operations**, **Companies** and **Company Lists**,
 *    **Connected Apps**, **API keys management**, **Webhooks**, **Team
 *    members** — real endpoints, held out to keep the action count to
 *    Hunter's core lookup + lead-management surface rather than every CRUD
 *    corner of the account-admin API.
 *  - **Author Finder** — does not exist in the current v2 API; it is not
 *    referenced anywhere in Hunter's own reference docs (verified
 *    2026-08-29), so it is left out rather than guessed at.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import domainSearch from "./actions/domain-search.ts";
import domainFinder from "./actions/domain-finder.ts";
import emailFinder from "./actions/email-finder.ts";
import emailVerifier from "./actions/email-verifier.ts";
import emailCount from "./actions/email-count.ts";
import emailEnrichment from "./actions/email-enrichment.ts";
import companyEnrichment from "./actions/company-enrichment.ts";
import combinedEnrichment from "./actions/combined-enrichment.ts";
import accountGet from "./actions/account-get.ts";
import leadList from "./actions/lead-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpsert from "./actions/lead-upsert.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";
import leadsListList from "./actions/leads-list-list.ts";
import leadsListGet from "./actions/leads-list-get.ts";
import leadsListCreate from "./actions/leads-list-create.ts";
import leadsListUpdate from "./actions/leads-list-update.ts";
import leadsListDelete from "./actions/leads-list-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // finder & verifier
    domainSearch,
    domainFinder,
    emailFinder,
    emailVerifier,
    emailCount,
    // enrichment
    emailEnrichment,
    companyEnrichment,
    combinedEnrichment,
    // account
    accountGet,
    // leads
    leadList,
    leadGet,
    leadCreate,
    leadUpsert,
    leadUpdate,
    leadDelete,
    // leads lists
    leadsListList,
    leadsListGet,
    leadsListCreate,
    leadsListUpdate,
    leadsListDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
