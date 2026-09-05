/**
 * Kommo — leads, contacts and companies, the CRM formerly known as amoCRM.
 *
 * Every path, parameter and response shape here was taken from Kommo's own
 * developer documentation, read 2026-09-05 via `developers.kommo.com`'s
 * ReadMe-hosted `/api/v1/docs/<slug>` JSON endpoint (which returns each
 * reference page's raw method, params and example bodies): `kommo-for-
 * developers`, `oauth20`, `get-token`, `long-lived-token`, `private-
 * integration`, `account-parameters`, `http-codes`, `limitations`,
 * `leads-list`, `adding-leads`, `getting-a-lead-by-its-id`, `updating-
 * single-lead`, `contacts-list`, `add-contacts`, `get-contact`, `update-
 * contact`, `companies-list`, `add-companies`, `get-company`, `updating-
 * company`.
 *
 * ## Every account has its own host — and it isn't always kommo.com
 *
 * Kommo rebranded from amoCRM in 2024. New accounts live at
 * `{subdomain}.kommo.com`, but Kommo's own reference-doc example responses
 * (`get-contact`, among others) still link back to
 * `https://example.amocrm.com/api/v4/...` — confirming the legacy domain is
 * still live for accounts that never moved. Neither host is knowable in
 * advance, so the account's address is a connection field and
 * `w6w.network.allow` lists both `*.kommo.com` and `*.amocrm.com`. See
 * `lib/client.ts` for the full reasoning.
 *
 * ## Auth: a Long-Lived Token, not OAuth2
 *
 * Kommo documents both a browser-redirect OAuth2 flow (built for a public
 * Marketplace integration one account owner installs into another's account)
 * and a Long-Lived Token generated once, by hand, from inside a private
 * integration the account's own admin creates. This app implements only the
 * Long-Lived Token: Kommo's own docs recommend it specifically for exactly
 * this app's shape — a single account, run unattended, with no browser
 * session available to complete a redirect. See `auth/long-lived-token.ts`
 * for the full reasoning, including why there is no `refresh` hook.
 *
 * ## Three things that go wrong quietly
 *
 *   - **Create takes a JSON array, even for one record.** `POST /leads`,
 *     `/contacts` and `/companies` all require the body to be an array —
 *     Kommo's own `adding-leads` example passes two objects — and the
 *     response echoes back only `id`/`request_id`/`_links` per row, never
 *     the fields it was given. `lib/client.ts`'s `createOne` wraps a single
 *     object in `[...]` and unwraps the single echoed row, but a caller
 *     expecting the full created record back needs a follow-up `*-get`.
 *   - **Update responds with the collection envelope, even for one ID.**
 *     `PATCH /leads/{id}` takes a plain object (not an array), but its own
 *     response example still comes back as `_embedded.leads[0]` — and, same
 *     as create, echoes back only `id`/`updated_at` (plus `name` and a
 *     couple of flags for contacts/companies), never the rest of the record.
 *   - **Companies have both a bulk and a single-record update route at the
 *     same verb.** `PATCH /api/v4/companies` (no ID, array body) is a
 *     different, bulk endpoint from `PATCH /api/v4/companies/{id}` (one ID,
 *     object body) — this app implements only the latter, matching the
 *     single-record shape `lead-update`/`contact-update` already use.
 *
 * ## Where deletion is missing, and why
 *
 * There is no `lead-delete`, `contact-delete` or `company-delete` action
 * because Kommo's v4 API documents no delete endpoint for any of the three —
 * the reference docs' full method list has delete routes for custom fields,
 * pipelines, sources, webhooks and templates, but not for a lead, contact or
 * company. Removing one of those from Kommo (to a restorable trash) is a
 * UI-only action this API cannot reach either way.
 *
 * Deliberately out of scope beyond that: pipeline/stage/custom-field
 * administration, tasks, notes, tag administration, the Chats API, the
 * Salesbot builder, and catalogs/lists. Each is its own surface, and none of
 * it is the record CRUD a workflow touches day to day.
 */
import type { AppDefinition } from "@w6w/types";
import longLivedToken from "./auth/long-lived-token.ts";

import leadList from "./actions/lead-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";

import account from "./health/account.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // leads
    leadList,
    leadGet,
    leadCreate,
    leadUpdate,
    // contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    // companies
    companyList,
    companyGet,
    companyCreate,
    companyUpdate,
  ],
  auth: [longLivedToken],
  healthChecks: [account, service],
} satisfies AppDefinition;
