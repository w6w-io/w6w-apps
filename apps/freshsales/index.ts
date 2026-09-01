/**
 * Freshsales (Freshworks CRM, marketed as "Freshsales Suite").
 *
 * Covers the three objects a sales workflow moves between — contacts,
 * accounts (Freshsales's "Sales Accounts") and deals — plus notes and tasks.
 *
 * Two things shape this app, both different from the sibling Freshworks apps
 * (`freshdesk`, `freshservice`) in this pack even though it's the same
 * vendor:
 *
 *   - **The host pattern is different.** Freshdesk/Freshservice put the API
 *     directly on the account subdomain (`acme.freshdesk.com`). Freshsales
 *     nests it under a shared `myfreshworks.com` domain with a
 *     `/crm/sales/api` path (`acme.myfreshworks.com/crm/sales/api`) — verified
 *     against every sample request on developers.freshworks.com/crm/api/.
 *     `*.freshsales.io`, referenced once in a support-article URL on that same
 *     docs page, is NOT the API host.
 *   - **There is no flat "list all" endpoint.** Freshdesk/Freshservice list by
 *     hitting the collection directly (`GET /tickets`). Freshsales requires a
 *     saved *view* id (`GET /contacts/view/[view_id]`) for every listing —
 *     verified against the "List All Contacts"/"Accounts"/"Deals" sections,
 *     each of which documents the view path and a separate `/filters`
 *     endpoint to discover view ids, never a bare collection GET. `view-get-many`
 *     is what every `*-get-many` action's "View ID" param points a user at.
 *
 * The auth scheme is also its own: `Authorization: Token token=<api_key>`, not
 * the Basic-with-throwaway-password scheme Freshdesk/Freshservice use — see
 * `auth/api-key.ts`.
 *
 * Deliberately absent: Marketing Lists, Products/Documents (the CPQ module),
 * Custom Modules, Phone call logs, and the Search/Lookup endpoints — none of
 * these are core sales-workflow objects, and the spec's action-count budget
 * doesn't call for them. Also absent: a webhook/trigger surface — that's a
 * Trigger, not an Action.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactGetMany from "./actions/contact-get-many.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import accountCreate from "./actions/account-create.ts";
import accountGet from "./actions/account-get.ts";
import accountGetMany from "./actions/account-get-many.ts";
import accountUpdate from "./actions/account-update.ts";
import accountDelete from "./actions/account-delete.ts";

import dealCreate from "./actions/deal-create.ts";
import dealGet from "./actions/deal-get.ts";
import dealGetMany from "./actions/deal-get-many.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealDelete from "./actions/deal-delete.ts";

import noteCreate from "./actions/note-create.ts";

import taskCreate from "./actions/task-create.ts";
import taskGetMany from "./actions/task-get-many.ts";
import taskUpdate from "./actions/task-update.ts";

import viewGetMany from "./actions/view-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    // contact
    contactCreate,
    contactGet,
    contactGetMany,
    contactUpdate,
    contactDelete,
    // account
    accountCreate,
    accountGet,
    accountGetMany,
    accountUpdate,
    accountDelete,
    // deal
    dealCreate,
    dealGet,
    dealGetMany,
    dealUpdate,
    dealDelete,
    // note
    noteCreate,
    // task
    taskCreate,
    taskGetMany,
    taskUpdate,
    // views (backs every *-get-many action's "View ID" param)
    viewGetMany,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, domain],
} satisfies AppDefinition;
