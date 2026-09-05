/**
 * Teamleader Focus — the Belgian CRM / invoicing / project-management SaaS
 * (`www.teamleader.eu`), over its HTTP RPC API at `api.focus.teamleader.eu`.
 *
 * Every endpoint, field and status code in this app was verified on
 * 2026-09-01 against Teamleader's own developer docs
 * (`developer.focus.teamleader.eu/docs/*`, a client-rendered Docusaurus site
 * — read via a rendering proxy since it ships no server-rendered HTML and no
 * public OpenAPI/Swagger document) plus a live probe of its Atlassian
 * Statuspage instance. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that shaped the design:
 *
 *  1. **This is RPC, not REST — every call is `POST`.** The API's own docs
 *     state the choice explicitly: `POST /contacts.list` to read, `POST
 *     /contacts.add` to create, `POST /contacts.update` to change one, `POST
 *     /contacts.delete` to remove it. There is no `GET`. See `lib/client.ts`.
 *  2. **Collections are replaced wholesale on update, never merged.**
 *     `emails`, `telephones`, `addresses` and `tags` sent to `.update` REPLACE
 *     the existing set; anything omitted is deleted. `custom_fields` is the
 *     one documented exception, via `custom_fields_update_strategy: "partial"`.
 *     See `actions/contacts-update.ts` and `actions/companies-update.ts`.
 *  3. **OAuth lives on a different host than the API**, and takes no `scope`
 *     parameter at all — scopes are fixed once, per integration, at
 *     registration on the Teamleader Marketplace. See `auth/oauth2.ts`.
 *
 * OAuth 2.0 is the *only* auth Teamleader documents for third-party
 * integrations — there is no API-key alternative, unlike Apify or Copper in
 * this pack.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import contactsList from "./actions/contacts-list.ts";
import contactsInfo from "./actions/contacts-info.ts";
import contactsAdd from "./actions/contacts-add.ts";
import contactsUpdate from "./actions/contacts-update.ts";
import contactsDelete from "./actions/contacts-delete.ts";

import companiesList from "./actions/companies-list.ts";
import companiesInfo from "./actions/companies-info.ts";
import companiesAdd from "./actions/companies-add.ts";
import companiesUpdate from "./actions/companies-update.ts";

import dealsList from "./actions/deals-list.ts";
import dealsInfo from "./actions/deals-info.ts";
import dealsCreate from "./actions/deals-create.ts";
import dealsUpdate from "./actions/deals-update.ts";

import usersList from "./actions/users-list.ts";
import usersMe from "./actions/users-me.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    contactsList,
    contactsInfo,
    contactsAdd,
    contactsUpdate,
    contactsDelete,
    // Companies
    companiesList,
    companiesInfo,
    companiesAdd,
    companiesUpdate,
    // Deals
    dealsList,
    dealsInfo,
    dealsCreate,
    dealsUpdate,
    // Users
    usersList,
    usersMe,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
