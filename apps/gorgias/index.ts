/**
 * Gorgias — a helpdesk built for ecommerce.
 *
 * Covers the ticket, message, customer, tag, view and satisfaction-survey
 * resources. The thing that shapes this app, same as `apps/freshdesk`, is
 * that **every account has its own host** — `<domain>.gorgias.com`. A static
 * manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.gorgias.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the domain is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on
 *     the connection's redacted `display`, and `lib/client.ts` reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * Deliberately absent: OAuth2 (Gorgias documents it as mandatory only for
 * *public* apps distributed through their App Store — out of scope for a
 * private-app credential), custom fields, macros, rules, integrations, jobs,
 * teams, users, widgets, voice calls and metric/statistic reporting — none of
 * these were named by the spec's core-surface list (tickets, customers,
 * messages, tags, views, satisfaction surveys), and Gorgias's own docs
 * describe several of them (rules, macros) as configuration objects rather
 * than day-to-day workflow operations.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import ticketCreate from "./actions/ticket-create.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketGetMany from "./actions/ticket-get-many.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketDelete from "./actions/ticket-delete.ts";
import ticketAddNote from "./actions/ticket-add-note.ts";
import ticketAddReply from "./actions/ticket-add-reply.ts";

import messageGetMany from "./actions/message-get-many.ts";

import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerGetMany from "./actions/customer-get-many.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";

import tagCreate from "./actions/tag-create.ts";
import tagGetMany from "./actions/tag-get-many.ts";
import tagDelete from "./actions/tag-delete.ts";

import viewGetMany from "./actions/view-get-many.ts";
import viewGet from "./actions/view-get.ts";

import surveyCreate from "./actions/survey-create.ts";
import surveyGet from "./actions/survey-get.ts";
import surveyGetMany from "./actions/survey-get-many.ts";
import surveyUpdate from "./actions/survey-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    // ticket
    ticketCreate,
    ticketGet,
    ticketGetMany,
    ticketUpdate,
    ticketDelete,
    ticketAddNote,
    ticketAddReply,
    // message
    messageGetMany,
    // customer
    customerCreate,
    customerGet,
    customerGetMany,
    customerUpdate,
    customerDelete,
    // tag
    tagCreate,
    tagGetMany,
    tagDelete,
    // view
    viewGetMany,
    viewGet,
    // satisfaction survey
    surveyCreate,
    surveyGet,
    surveyGetMany,
    surveyUpdate,
  ],
  auth: [basic],
  healthChecks: [service, quota, domain],
} satisfies AppDefinition;
