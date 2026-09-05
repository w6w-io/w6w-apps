/**
 * Affinity — relationship-intelligence CRM, over the Affinity API v1
 * (`api.affinity.co`).
 *
 * Every path, verb, query parameter, and body field in this app was verified
 * on 2026-09-05 against Affinity's own API reference (`api-docs.affinity.co`,
 * 481,906 bytes, titled "Affinity V1 API Reference") plus live probes against
 * `api.affinity.co` and `status.affinity.co`. Nothing here came from a
 * third-party integration directory.
 *
 * Findings that shaped the design, documented in full where they matter:
 *
 *  1. **There is no "V1 vs V2 endpoint" split — only two auth styles for one
 *     API generation.** The reference states its own v2 sibling "is not at
 *     feature parity with v1", and documents zero v2 endpoints itself. What
 *     *is* documented twice is authentication: the same v1 endpoints work
 *     with either `Authorization: Bearer <key>` or HTTP Basic (empty
 *     username, key as password). This app uses Bearer. See
 *     `lib/client.ts` and `auth/bearer-token.ts`.
 *  2. **Errors are not reliably JSON, despite the docs.** A missing/invalid
 *     key against `GET /auth/whoami` measured `401` with body
 *     `Unauthorized API Key.` under `content-type: text/html` — plain text —
 *     and an unknown path measured `404 Unknown API endpoint`, also plain
 *     text. `formatAffinityError` (`lib/client.ts`) always falls back to raw
 *     text.
 *  3. **The auth probe is `GET /auth/whoami`.** Its documented response is
 *     `{tenant, user, grant}` — instance/caller identity and auth *metadata*
 *     (type/scope/creation time) — never the key itself, and it is
 *     explicitly exempt from the account's monthly call quota. See
 *     `auth/bearer-token.ts`.
 *  4. **Pagination is not uniform.** `GET /lists`, `/fields`, `/field-values`
 *     and the two `/fields` sub-resources answer bare arrays with no
 *     cursor at all. `GET /persons`, `/organizations`, `/opportunities` and
 *     `GET /lists/{id}/list-entries` (only when `page_size` is passed)
 *     answer `{<resource>, next_page_token}`. `GET /notes` documents the
 *     same `page_size`/`page_token` params but its own "Returns" text never
 *     describes an envelope — `notes-list` passes the params through and
 *     returns the response unchanged rather than guessing its shape.
 *  5. **A field value's required shape depends on the target field**, not on
 *     this app — a Ranked Dropdown field (e.g. the built-in Status column)
 *     needs the numeric id of one of its own `dropdown_options`, never a
 *     typed string. `field-values-create`/`field-values-update` accept
 *     `value` as free-form JSON rather than guessing a shape.
 *  6. **A few "update" endpoints replace rather than merge** list-valued
 *     fields (`emails`, `organization_ids`, `person_ids`) — the docs
 *     explicitly warn that adding one new value requires resending the
 *     existing ones too. Reflected in every relevant action's description.
 *
 * Left out, and why: Interactions, Reminders, Entity Files, and Field Value
 * Changes are all documented but not implemented here — the CRM's core
 * relationship data (lists, entities, fields, notes) and its automation
 * surface (webhooks) are covered first; those four are candidates for a
 * follow-up rather than left out for any doubt about their shape.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import listsList from "./actions/lists-list.ts";
import listsGet from "./actions/lists-get.ts";
import listsCreate from "./actions/lists-create.ts";

import listEntriesList from "./actions/list-entries-list.ts";
import listEntriesGet from "./actions/list-entries-get.ts";
import listEntriesCreate from "./actions/list-entries-create.ts";
import listEntriesDelete from "./actions/list-entries-delete.ts";

import fieldsList from "./actions/fields-list.ts";

import fieldValuesList from "./actions/field-values-list.ts";
import fieldValuesCreate from "./actions/field-values-create.ts";
import fieldValuesUpdate from "./actions/field-values-update.ts";
import fieldValuesDelete from "./actions/field-values-delete.ts";

import personsSearch from "./actions/persons-search.ts";
import personsGet from "./actions/persons-get.ts";
import personsCreate from "./actions/persons-create.ts";
import personsUpdate from "./actions/persons-update.ts";
import personsDelete from "./actions/persons-delete.ts";
import personsFieldsList from "./actions/persons-fields-list.ts";

import organizationsSearch from "./actions/organizations-search.ts";
import organizationsGet from "./actions/organizations-get.ts";
import organizationsCreate from "./actions/organizations-create.ts";
import organizationsUpdate from "./actions/organizations-update.ts";
import organizationsDelete from "./actions/organizations-delete.ts";
import organizationsFieldsList from "./actions/organizations-fields-list.ts";

import opportunitiesSearch from "./actions/opportunities-search.ts";
import opportunitiesGet from "./actions/opportunities-get.ts";
import opportunitiesCreate from "./actions/opportunities-create.ts";
import opportunitiesUpdate from "./actions/opportunities-update.ts";
import opportunitiesDelete from "./actions/opportunities-delete.ts";

import notesList from "./actions/notes-list.ts";
import notesGet from "./actions/notes-get.ts";
import notesCreate from "./actions/notes-create.ts";
import notesUpdate from "./actions/notes-update.ts";
import notesDelete from "./actions/notes-delete.ts";

import webhooksList from "./actions/webhooks-list.ts";
import webhooksGet from "./actions/webhooks-get.ts";
import webhooksCreate from "./actions/webhooks-create.ts";
import webhooksUpdate from "./actions/webhooks-update.ts";
import webhooksDelete from "./actions/webhooks-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Lists
    listsList,
    listsGet,
    listsCreate,
    // List Entries
    listEntriesList,
    listEntriesGet,
    listEntriesCreate,
    listEntriesDelete,
    // Fields
    fieldsList,
    // Field Values
    fieldValuesList,
    fieldValuesCreate,
    fieldValuesUpdate,
    fieldValuesDelete,
    // Persons
    personsSearch,
    personsGet,
    personsCreate,
    personsUpdate,
    personsDelete,
    personsFieldsList,
    // Organizations
    organizationsSearch,
    organizationsGet,
    organizationsCreate,
    organizationsUpdate,
    organizationsDelete,
    organizationsFieldsList,
    // Opportunities
    opportunitiesSearch,
    opportunitiesGet,
    opportunitiesCreate,
    opportunitiesUpdate,
    opportunitiesDelete,
    // Notes
    notesList,
    notesGet,
    notesCreate,
    notesUpdate,
    notesDelete,
    // Webhooks
    webhooksList,
    webhooksGet,
    webhooksCreate,
    webhooksUpdate,
    webhooksDelete,
  ],
  // API key only. Affinity publishes no OAuth surface for third-party apps.
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
