/**
 * Zoho Desk — customer support / helpdesk software, over the Zoho Desk REST
 * API (`https://desk.zoho.com/api/v1/...`, and its nine regional siblings).
 *
 * Every path, header, verb, query parameter, body field and error shape in
 * this app was verified on 2026-08-25 against Zoho's own documentation
 * (`https://desk.zoho.com/DeskAPIDocument#Introduction`, a single-page
 * reference covering Getting Started, OAuth/Scopes, Organizations, Tickets,
 * Contacts, Accounts, Agents, Departments, Threads, Comments, Attachments and
 * Search) and live probes against all ten regional API hosts and their
 * accounts hosts. Nothing here came from a third-party integration
 * directory.
 *
 * Scoped to **Zoho Desk specifically** — this pack already ships `zoho`
 * (Zoho CRM), `zohobooks` (Zoho Books) and `zohomail` (Zoho Mail), separate
 * products with separate API surfaces; do not confuse the four.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **`orgId` is a mandatory HTTP HEADER, not a query parameter** —
 *     (`lib/client.ts`). "All Zoho Desk APIs require these two mandatory
 *     fields in the header" (`Authorization`, `orgId`); every endpoint
 *     except `GET /organizations` requires it. Zoho Books' equivalent
 *     (`organization_id`) is a query parameter — sending Desk's `orgId` the
 *     same way silently fails.
 *  2. **Ten regional data centres, not eight** — (`lib/regions.ts`,
 *     `auth/oauth2.ts`). Desk additionally serves Singapore (SG) and the
 *     United Arab Emirates (UAE), which neither `zoho` nor `zohobooks` lists.
 *     Canada is again the one region where the OAuth host does not follow
 *     the API host's naming pattern (`accounts.zohocloud.ca`, not
 *     `accounts.zoho.ca`).
 *  3. **The Desk API host is `desk.zoho.<tld>` DIRECTLY, not the shared
 *     `www.zohoapis.<tld>` gateway** every other Zoho product in this pack
 *     uses (`lib/regions.ts`). Assuming the CRM/Books pattern points at a
 *     host that answers a generic 200/404 for every Desk path rather than
 *     the documented error shape.
 *  4. **Several scopes real endpoints require are absent from the "Scopes"
 *     reference table** — (`auth/oauth2.ts`). `Desk.accounts.*`,
 *     `Desk.agents.READ`, `Desk.departments.READ`, `Desk.organization.READ`
 *     and `Desk.contacts.DELETE` are all named on their own endpoints' "OAuth
 *     Scope" lines but never appear in the summary table at `#OAuthScopes` —
 *     a client scoped from that table alone 403s on every Account/Agent/
 *     Department action.
 *  5. **Two similarly-named organization endpoints behave oppositely on
 *     `orgId`** — (`actions/organization-list.ts`). `GET /organizations`
 *     ("all organizations the current user belongs to") needs no `orgId`
 *     header at all — it is how one is discovered. `GET
 *     /accessibleOrganizations` ("organizations accessible using the current
 *     token") sounds like the more permissive/discovery-oriented call but
 *     DOES require `orgId`, making it useless for bootstrapping a new
 *     connection. This app deliberately exposes the former.
 *  6. **Bulk-only delete: no single-record DELETE for Tickets, Contacts or
 *     Accounts** — (`lib/desk.ts`). The only delete path is `POST
 *     {resource}/moveToTrash` with a JSON array of ids (`ticketIds`,
 *     `contactIds`, `accountIds`), answering `204 No Content` — confirmed
 *     live for all three. `deskMoveToTrash` wraps this app's single-id
 *     delete actions into that array.
 *  7. **A real, documented quota header — unlike Zoho Books** —
 *     (`health/quota.ts`). `X-Rate-Limit-Remaining-v3` /
 *     `X-Rate-Limit-Request-Weight-v3` on every response; `Retry-After` once
 *     exhausted. But there is no fixed daily ceiling to compare against — it
 *     varies by edition and purchased add-on credits — so the check reports
 *     `down` only once fully exhausted rather than guessing a percentage.
 *  8. **Field names are camelCase (`lastName`, `departmentId`), unlike Zoho
 *     Books' snake_case (`contact_name`)** — worth restating in every
 *     create/update action's description, since it is exactly the kind of
 *     detail muscle memory from one Zoho product gets wrong in another.
 *
 * Deliberately absent: the vast majority of Zoho Desk's surface — SLAs,
 * business hours, custom views, blueprints, macros, chat/telephony
 * integration, Help Center/knowledge-base articles, products, contracts,
 * time entries, skill-based assignment, deduplication, domain mapping, and
 * every other module the docs list beyond Tickets/Contacts/Accounts/Agents/
 * Departments/Threads/Comments/Attachments/Search/Organizations. This is a
 * huge API surface; this app covers the core support-workflow CRUD, not the
 * whole product.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import organizationList from "./actions/organization-list.ts";

import ticketList from "./actions/ticket-list.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketCreate from "./actions/ticket-create.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketDelete from "./actions/ticket-delete.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import accountList from "./actions/account-list.ts";
import accountGet from "./actions/account-get.ts";
import accountCreate from "./actions/account-create.ts";
import accountUpdate from "./actions/account-update.ts";
import accountDelete from "./actions/account-delete.ts";

import agentList from "./actions/agent-list.ts";
import agentGet from "./actions/agent-get.ts";

import departmentList from "./actions/department-list.ts";
import departmentGet from "./actions/department-get.ts";

import ticketCommentList from "./actions/ticket-comment-list.ts";
import ticketCommentCreate from "./actions/ticket-comment-create.ts";

import ticketThreadList from "./actions/ticket-thread-list.ts";
import ticketThreadGet from "./actions/ticket-thread-get.ts";

import ticketAttachmentList from "./actions/ticket-attachment-list.ts";
import ticketAttachmentCreate from "./actions/ticket-attachment-create.ts";

import searchRecords from "./actions/search-records.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // organizations
    organizationList,
    // tickets
    ticketList,
    ticketGet,
    ticketCreate,
    ticketUpdate,
    ticketDelete,
    // contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // accounts
    accountList,
    accountGet,
    accountCreate,
    accountUpdate,
    accountDelete,
    // agents
    agentList,
    agentGet,
    // departments
    departmentList,
    departmentGet,
    // ticket comments
    ticketCommentList,
    ticketCommentCreate,
    // ticket threads
    ticketThreadList,
    ticketThreadGet,
    // ticket attachments
    ticketAttachmentList,
    ticketAttachmentCreate,
    // search
    searchRecords,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
