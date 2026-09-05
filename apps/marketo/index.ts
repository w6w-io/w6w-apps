/**
 * Marketo (Adobe Marketo Engage) — leads, static lists, companies and smart
 * campaigns, on whichever pod your subscription runs on.
 *
 * Every path, parameter and response shape here was taken from Adobe's
 * current Marketo Developer documentation
 * (`github.com/AdobeDocs/marketo-developer.en`, `help/rest-api/*.md`, fetched
 * 2026-09-05 — the old `developers.marketo.com` host now 301s to Experience
 * League) — `authentication.md`, `base-url.md`, `custom-services.md`,
 * `error-codes.md`, `leads.md`, `list-membership.md`, `companies.md`,
 * `smart-campaigns.md`, `usage.md`, `rest-api.md`, `getting-started.md`.
 *
 * ## There is no fixed vendor host
 *
 * Every Marketo subscription runs on its own pod, addressed by a
 * Munchkin-ID-derived host such as `https://123-ABC-456.mktorest.com`. So
 * the REST base URL — and the separate Identity URL OAuth uses to mint
 * tokens — are connection fields, not a manifest constant, and the egress
 * allowlist is `["*"]`, the posture this pack already uses for `mautic`,
 * `tableau`, `kintone`, `learnworlds` and `invoiceninja`.
 *
 * ## Auth: Client Credentials is the *only* option, and Marketo's own docs
 * disagree about the base URL shape
 *
 * There is no browser-login flow to choose instead of client-credentials
 * OAuth2 — see `auth/client-credentials.ts` for the full account setup and
 * for why the Identity URL is collected as its own field rather than derived
 * from the REST base URL. `lib/client.ts` documents the base-URL-shape
 * inconsistency between Marketo's own `base-url.md` and `rest-api.md` pages
 * and how this app normalises around it.
 *
 * ## Every REST call answers HTTP 200, even on failure
 *
 * `error-codes.md` is explicit that a Response-Level error (bad token, rate
 * limit, bad parameter) still returns HTTP 200 with `{"success": false,
 * "errors": [...]}` in the body — real HTTP status codes are reserved for
 * gateway-level failures (413, 414, 502) and the separate Identity endpoint.
 * `lib/client.ts`'s `MarketoClient` checks `success`, never `res.ok`, for
 * exactly this reason.
 *
 * ## Two API surfaces share one base URL
 *
 * Lead, list, company, campaign-trigger and campaign-schedule calls live
 * under `/rest/v1/...` (the "Lead Database" API); Smart Campaign metadata
 * (get/list) lives under `/rest/asset/v1/...` (the "Asset" API). Both sit on
 * the same instance host — `campaign-get`/`campaign-list` are the two
 * actions here that use the Asset prefix.
 *
 * ## Deliberately out of scope
 *
 * Marketo's REST surface is large. Left out of this first pass, and worth
 * flagging rather than silently missing: Bulk Extract/Import, Programs,
 * Opportunities, Custom Objects, Activities, Tags, Tokens, Emails, Forms,
 * Landing Pages, Snippets, Named Accounts, Sales Persons, Channels, Custom
 * Services management, Smart Campaign create/clone/delete/activate (only
 * get/list are here), and the JavaScript/Munchkin tracking API. See
 * README.md for the full list and why each is deferred.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import leadGet from "./actions/lead-get.ts";
import leadFind from "./actions/lead-find.ts";
import leadsDescribe from "./actions/leads-describe.ts";
import leadSync from "./actions/lead-sync.ts";
import leadDelete from "./actions/lead-delete.ts";
import listAddLeads from "./actions/list-add-leads.ts";
import listRemoveLeads from "./actions/list-remove-leads.ts";
import listGetMembers from "./actions/list-get-members.ts";
import listIsMember from "./actions/list-is-member.ts";
import companyGet from "./actions/company-get.ts";
import companySync from "./actions/company-sync.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignTrigger from "./actions/campaign-trigger.ts";
import campaignSchedule from "./actions/campaign-schedule.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // leads
    leadGet,
    leadFind,
    leadsDescribe,
    leadSync,
    leadDelete,
    // lists
    listAddLeads,
    listRemoveLeads,
    listGetMembers,
    listIsMember,
    // companies
    companyGet,
    companySync,
    // campaigns
    campaignGet,
    campaignList,
    campaignTrigger,
    campaignSchedule,
  ],
  auth: [clientCredentials],
  healthChecks: [instance, service, quota],
} satisfies AppDefinition;
