/**
 * folk — a CRM built around groups (contact lists) of people and companies,
 * over the folk External API (`api.folk.app`, verified against the vendor's
 * own OAS document at `folk-external-api.readme.io`, see `lib/client.ts`).
 *
 * Deliberately out of scope: the OAS documents exactly 12 operations across
 * 4 tags, and this app covers all 12 — there is no larger surface being
 * trimmed down, unlike most apps in this pack. See README for detail.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import getUser from "./actions/get-user.ts";

import listGroups from "./actions/list-groups.ts";
import listNetworkMembers from "./actions/list-network-members.ts";
import checkNetworkAccess from "./actions/check-network-access.ts";

import personCreate from "./actions/person-create.ts";
import personUpdate from "./actions/person-update.ts";
import personFind from "./actions/person-find.ts";
import personCustomFieldsList from "./actions/person-custom-fields-list.ts";

import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";
import companyFind from "./actions/company-find.ts";
import companyCustomFieldsList from "./actions/company-custom-fields-list.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // user
    getUser,
    // network
    listGroups,
    listNetworkMembers,
    checkNetworkAccess,
    // person
    personCreate,
    personUpdate,
    personFind,
    personCustomFieldsList,
    // company
    companyCreate,
    companyUpdate,
    companyFind,
    companyCustomFieldsList,
  ],
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
