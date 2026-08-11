/**
 * Keap (formerly Infusionsoft) — the small-business CRM: contacts, tags,
 * companies, opportunities, tasks, notes, campaigns, orders, subscriptions and
 * transactional email, over the Keap REST API at `api.infusionsoft.com`.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against Keap's own machine-readable OpenAPI 3.1
 * documents — `crm.infusionsoft.com/app/v3/api-docs/V1` (344,714 bytes, 92
 * paths) and `.../V2` (958,308 bytes, 236 paths) — plus live probes against
 * `api.infusionsoft.com` and `status.thryv.com`, and Keap's own developer-portal
 * pages for OAuth, access keys and quota. Nothing here came from a third-party
 * integration directory. Checksums are in `lib/client.ts`.
 *
 * ## v2 unless v2 does not have it
 *
 * v1 and v2 overlap heavily and disagree in detail. v2 is the vendor's stated
 * direction and is the newer, larger and better-documented surface, so every
 * resource this app touches is v2 — with exactly one exception, taken because
 * there was no choice: **appointments**. v2 declares 236 paths and not one of
 * them is an appointment, where v1 has four. Those two actions
 * (`appointment-list`, `appointment-create`) are the only v1 calls here, and
 * each says so in its own module doc. Everything else — including the business
 * profile, where v1's `/account/profile` and v2's `/businessProfile` return the
 * same thing — uses v2.
 *
 * ## The five findings that shaped the code, each documented where it matters
 *
 *  1. **Two error envelopes, and the documented one is the rarer.**
 *     (`lib/client.ts`, `auth/probe.ts`.) The OpenAPI declares every failure as
 *     `{code, message, status, details}`. Everything the Apigee gateway rejects
 *     itself — every auth failure, every throttle — arrives instead as
 *     `{"fault":{"faultstring","detail":{"errorcode"}}}`, which appears nowhere
 *     in either document.
 *  2. **One status code, four situations.** (`auth/probe.ts`.) Keap answers 401
 *     for a missing credential, a malformed header, a rejected token *and* a
 *     path that does not exist — the gateway authenticates before it routes.
 *     Only `fault.detail.errorcode` tells them apart, and "reconnect this
 *     connection" versus "your token expired" are different instructions.
 *  3. **The status page is Thryv's, and its verdict is not Keap's.**
 *     (`health/service.ts`.) Keap was acquired by Thryv; `status.keap.com`
 *     301-redirects to the *apex* of `status.thryv.com`, throwing the path away,
 *     so every path there returns the same 1.29 MB HTML and the page looks like
 *     a catch-all. It is not — but the real page's `status.indicator` rolls up
 *     52 components across 6 Thryv products, of which one group of 8 is Keap.
 *  4. **A `filter` grammar, not query parameters.** (`lib/client.ts`,
 *     `lib/params.ts`.) Every v2 list endpoint declares five query parameters
 *     and no per-field ones. `?email=x` is ignored and returns everything;
 *     `?filter=email==x` is the query that works.
 *  5. **`PATCH` clears what you omit unless you send an `update_mask`.**
 *     (`actions/contact-update.ts`.) Every collection property on a contact
 *     carries "Any item not listed here will be removed if it already exists."
 *     This app always sends a mask, derived from the properties actually
 *     supplied.
 *
 * ## Both credential types, because they are not equivalent
 *
 * OAuth2 (authorization code, one scope: `full`) and Personal Access Token /
 * Service Account Key. Same `Bearer` header, very different properties: the
 * access key needs no client registration but is throttled six times harder and
 * is scoped to one Keap app, and a Personal Access Token inherits its creator's
 * permissions. That last fact is what picks the health probe — see
 * `auth/probe.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import oauth2 from "./auth/oauth2.ts";
import accessKey from "./auth/access-key.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactTagsList from "./actions/contact-tags-list.ts";
import contactNotesList from "./actions/contact-notes-list.ts";
import contactNoteCreate from "./actions/contact-note-create.ts";

import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagApply from "./actions/tag-apply.ts";
import tagRemove from "./actions/tag-remove.ts";
import tagContactsList from "./actions/tag-contacts-list.ts";

import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";

import opportunityList from "./actions/opportunity-list.ts";
import opportunityGet from "./actions/opportunity-get.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityStageList from "./actions/opportunity-stage-list.ts";

import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";

import emailSend from "./actions/email-send.ts";
import emailList from "./actions/email-list.ts";
import emailStatusGet from "./actions/email-status-get.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignSequenceList from "./actions/campaign-sequence-list.ts";
import campaignSequenceAddContacts from "./actions/campaign-sequence-add-contacts.ts";
import automationGoalAchieve from "./actions/automation-goal-achieve.ts";

import productList from "./actions/product-list.ts";
import orderList from "./actions/order-list.ts";
import subscriptionList from "./actions/subscription-list.ts";

import userList from "./actions/user-list.ts";
import businessProfileGet from "./actions/business-profile-get.ts";

import appointmentList from "./actions/appointment-list.ts";
import appointmentCreate from "./actions/appointment-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import spikeRate from "./health/spike-rate.ts";

export default {
  actions: [
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactTagsList,
    contactNotesList,
    contactNoteCreate,
    // Tags
    tagList,
    tagCreate,
    tagApply,
    tagRemove,
    tagContactsList,
    // Companies
    companyList,
    companyGet,
    companyCreate,
    // Opportunities
    opportunityList,
    opportunityGet,
    opportunityCreate,
    opportunityStageList,
    // Tasks
    taskList,
    taskCreate,
    // Email
    emailSend,
    emailList,
    emailStatusGet,
    // Campaigns and automations
    campaignList,
    campaignSequenceList,
    campaignSequenceAddContacts,
    automationGoalAchieve,
    // Commerce
    productList,
    orderList,
    subscriptionList,
    // Account
    userList,
    businessProfileGet,
    // Appointments (v1 — v2 has none)
    appointmentList,
    appointmentCreate,
  ],
  auth: [oauth2, accessKey],
  healthChecks: [service, quota, spikeRate],
} satisfies AppDefinition;
