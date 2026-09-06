/**
 * SendPulse — w6w app, built directly from SendPulse's own OpenAPI 3
 * documents (`https://api.sendpulse.com/.well-known/openapi/{crm,
 * bulk-email}.yaml`), grounded against the live API on the wire on
 * 2026-09-06.
 *
 * SendPulse is one account behind FOUR published API modules — CRM,
 * Bulk Email, Chatbots and Automation 360 — all under one OAuth2
 * client-credentials token (`auth/client-credentials.ts`) but NOT one base
 * path: Bulk Email lives at the host root, CRM under `/crm/v1` (see
 * `lib/client.ts`). This app covers the two modules a general-purpose
 * automation most often needs — CRM (pipelines, deals, contacts) and Bulk
 * Email (mailing lists, campaigns, senders, balance) — and leaves Chatbots
 * and Automation 360 out; see the README for why.
 *
 * `contact-create` deliberately targets `POST /contacts/create`, the
 * vendor's own documented replacement for the `deprecated: true`
 * `POST /contacts` — see that action's doc comment for what moved.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

// CRM
import usersList from "./actions/users-list.ts";
import pipelinesList from "./actions/pipelines-list.ts";
import pipelineStepsList from "./actions/pipeline-steps-list.ts";
import dealsList from "./actions/deals-list.ts";
import dealCreate from "./actions/deal-create.ts";
import dealGet from "./actions/deal-get.ts";
import contactsList from "./actions/contacts-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactEmailAdd from "./actions/contact-email-add.ts";
import contactTagsList from "./actions/contact-tags-list.ts";

// Bulk Email
import mailingListCreate from "./actions/mailing-list-create.ts";
import mailingListsList from "./actions/mailing-lists-list.ts";
import mailingListEmailsAdd from "./actions/mailing-list-emails-add.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignsList from "./actions/campaigns-list.ts";
import sendersList from "./actions/senders-list.ts";
import balanceGet from "./actions/balance-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // team / pipelines
    usersList,
    pipelinesList,
    pipelineStepsList,
    // deals
    dealsList,
    dealCreate,
    dealGet,
    // contacts
    contactsList,
    contactCreate,
    contactGet,
    contactEmailAdd,
    contactTagsList,
    // mailing lists
    mailingListCreate,
    mailingListsList,
    mailingListEmailsAdd,
    // campaigns
    campaignCreate,
    campaignsList,
    // senders / balance
    sendersList,
    balanceGet,
  ],
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
