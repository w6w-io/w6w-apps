/**
 * Insightly — CRUD on the four core CRM objects.
 *
 * The thing that shapes this app is that **every account lives on a regional
 * pod** — `api.na1.insightly.com`, `api.eu1.insightly.com`, and so on. A
 * static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.insightly.com`. The runtime's egress
 *     matcher accepts any subdomain and still refuses everything else.
 *   - the pod is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` records it on
 *     the connection's redacted `display`, and `lib/client.ts` reads it from
 *     there — so the client can address the right host without ever seeing a
 *     credential.
 *
 * Deliberately out of scope: file attachments, tags, links between records,
 * projects, tasks, custom objects, and the pipeline/stage/pricebook admin
 * endpoints — all real v3.1 API surfaces, left out to keep this app to the
 * four objects (Contacts, Organisations, Opportunities, Leads) a CRM
 * workflow touches most.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import contactGet from "./actions/contact-get.ts";
import contactGetMany from "./actions/contact-get-many.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import organisationGet from "./actions/organisation-get.ts";
import organisationGetMany from "./actions/organisation-get-many.ts";
import organisationCreate from "./actions/organisation-create.ts";
import organisationUpdate from "./actions/organisation-update.ts";
import organisationDelete from "./actions/organisation-delete.ts";

import opportunityGet from "./actions/opportunity-get.ts";
import opportunityGetMany from "./actions/opportunity-get-many.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityUpdate from "./actions/opportunity-update.ts";
import opportunityDelete from "./actions/opportunity-delete.ts";

import leadGet from "./actions/lead-get.ts";
import leadGetMany from "./actions/lead-get-many.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";

import service from "./health/service.ts";
import pod from "./health/pod.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // contact
    contactGet,
    contactGetMany,
    contactCreate,
    contactUpdate,
    contactDelete,
    // organisation
    organisationGet,
    organisationGetMany,
    organisationCreate,
    organisationUpdate,
    organisationDelete,
    // opportunity
    opportunityGet,
    opportunityGetMany,
    opportunityCreate,
    opportunityUpdate,
    opportunityDelete,
    // lead
    leadGet,
    leadGetMany,
    leadCreate,
    leadUpdate,
    leadDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, pod, quota],
} satisfies AppDefinition;
