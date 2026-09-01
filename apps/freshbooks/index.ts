/**
 * FreshBooks — accounting and invoicing for small businesses and
 * freelancers. Covers clients, invoices, expenses, time entries and
 * projects — the resources verified against freshbooks.com/api against
 * FreshBooks' own reference (not inferred from a sibling app).
 *
 * Two things shape the code and are worth reading before changing it:
 *
 *   - **Three API domains on one host.** `accounting` (clients, invoices,
 *     expenses) is scoped by path to an `accountId`; `timetracking` (time
 *     entries) and `projects` are scoped instead to a `businessId`. Neither
 *     id is on the OAuth token — both are discovered from the Identity Info
 *     endpoint right after connecting. See `lib/client.ts`'s doc comment for
 *     the full account, and `auth/oauth2.ts` for the discovery.
 *   - **`accounting` filters are `search[name]=value`; `timetracking`/
 *     `projects` filters are plain query params.** A real vendor
 *     inconsistency, not a bug — see `lib/params.ts`.
 *
 * Deliberately absent: estimates, credits, payments, taxes, bills, vendors,
 * staff/team, reports, webhooks and invoice attachments — all real
 * FreshBooks resources, left out to keep this first pass to the core
 * client/invoice/expense/time-tracking/project loop.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";
import clientCreate from "./actions/client-create.ts";
import clientUpdate from "./actions/client-update.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import invoiceSend from "./actions/invoice-send.ts";

import expenseList from "./actions/expense-list.ts";
import expenseGet from "./actions/expense-get.ts";
import expenseCreate from "./actions/expense-create.ts";
import expenseUpdate from "./actions/expense-update.ts";

import timeEntryList from "./actions/time-entry-list.ts";
import timeEntryGet from "./actions/time-entry-get.ts";
import timeEntryCreate from "./actions/time-entry-create.ts";
import timeEntryUpdate from "./actions/time-entry-update.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // client
    clientList,
    clientGet,
    clientCreate,
    clientUpdate,
    // invoice
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceUpdate,
    invoiceSend,
    // expense
    expenseList,
    expenseGet,
    expenseCreate,
    expenseUpdate,
    // time entry
    timeEntryList,
    timeEntryGet,
    timeEntryCreate,
    timeEntryUpdate,
    // project
    projectList,
    projectGet,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
