/**
 * Bitrix24 — CRM leads, contacts and deals via a portal's own inbound webhook.
 *
 * Every method, field and error shape documented here was verified against
 * `apidocs.bitrix24.com` 2026-09-06: `api-reference/crm/leads/*`,
 * `api-reference/crm/contacts/*`, `api-reference/crm/deals/*`,
 * `api-reference/common/users/profile.html`,
 * `api-reference/common/system/method-get.html` and `error-codes.html`. See
 * `lib/client.ts` for the exact citations and `README.md` for what was left
 * out and why.
 *
 * ## There is no fixed API host
 *
 * Bitrix24 is sold as shared SaaS (`https://<company>.bitrix24.com`) and as
 * self-hosted on-premise/enterprise software on a fully custom domain — every
 * customer's portal is its own deployment. So, exactly like `gitea`, `mautic`,
 * `tableau` and `bubble` in this pack, the portal's URL is a connection field
 * rather than a fixed hostname, and the egress allowlist is `["*"]`.
 *
 * ## Classic per-entity methods, not `crm.item.*`
 *
 * Bitrix24 now steers new integrations toward a universal `crm.item.*`
 * method family (one add/get/list/update/delete per `entityTypeId`), and
 * marks the classic `crm.lead.*`/`crm.contact.*`/`crm.deal.*` methods used
 * here "development halted, use crm.item.*". They remain fully documented
 * and functional — every method page checked is current, dated documentation,
 * just carrying that notice — and are used here for their simpler, per-entity
 * typed field shape; see `README.md` for the tradeoff.
 *
 * ## What is deliberately left out
 *
 *   - **OAuth2.** Bitrix24 also supports a full authorization-code flow via a
 *     local application registered per portal. The webhook auth method below
 *     reaches the same CRM surface with a single generated URL and no
 *     per-portal app registration, so only it is implemented.
 *   - **Companies, products, activities, timeline, and everything outside
 *     leads/contacts/deals.** A focused CRM core, not the whole REST surface.
 */
import type { AppDefinition } from "@w6w/types";
import webhook from "./auth/webhook.ts";

import leadAdd from "./actions/lead-add.ts";
import leadGet from "./actions/lead-get.ts";
import leadList from "./actions/lead-list.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";

import contactAdd from "./actions/contact-add.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import dealAdd from "./actions/deal-add.ts";
import dealGet from "./actions/deal-get.ts";
import dealList from "./actions/deal-list.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealDelete from "./actions/deal-delete.ts";

import service from "./health/service.ts";
import portal from "./health/portal.ts";

export default {
  actions: [
    // leads
    leadAdd,
    leadGet,
    leadList,
    leadUpdate,
    leadDelete,
    // contacts
    contactAdd,
    contactGet,
    contactList,
    contactUpdate,
    contactDelete,
    // deals
    dealAdd,
    dealGet,
    dealList,
    dealUpdate,
    dealDelete,
  ],
  auth: [webhook],
  healthChecks: [service, portal],
} satisfies AppDefinition;
