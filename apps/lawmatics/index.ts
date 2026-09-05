/**
 * Lawmatics — legal-industry CRM and intake automation, over the vendor's
 * REST API v1 (`api.lawmatics.com`, fixed and shared across every customer —
 * confirmed, not per-tenant).
 *
 * Every host, path, verb, request/response field and enum in this app was
 * verified on 2026-09-05 against Lawmatics' own Postman collection
 * ("Lawmatics OAuth API v1.22.0", 1.29 MB, fetched from its Documenter page's
 * own data endpoint at `docs.lawmatics.com`) plus live probes against
 * `status.lawmatics.com`. Nothing here was inferred from a sibling
 * integration or Lawmatics' marketing site.
 *
 * Three findings worth knowing before extending this app:
 *
 *  1. **The wire name is not the product name.** Lawmatics' own UI calls the
 *     intake-through-case record a "Matter"; the API calls it `Prospect`
 *     everywhere (`/v1/prospects`, `type: "prospect"`). This app's action
 *     titles say "Matter" (what a user reads) and the request paths say
 *     `/prospects` (what the vendor calls it) — see `actions/list-matters.ts`.
 *  2. **The OAuth token never expires and cannot be revoked via the API.**
 *     Lawmatics states outright that access tokens "do not expire" (no
 *     `refresh_token` is ever issued) and that there is no deauthorization
 *     endpoint — see `auth/oauth2.ts` for why that app deliberately has
 *     neither a `refresh` nor a `revoke` hook.
 *  3. **The one rate-limit signal is reactive, not proactive.** A firm-wide
 *     50 req/min ceiling is documented, but no response — success or error —
 *     ever carries a rate-limit header; the only signal is the 429 itself
 *     after the fact. `health/quota.ts` declares this unavailable rather than
 *     inventing a reading.
 *
 * Every JSON:API-flavoured envelope and error shape (`{"data": …}` /
 * `{"errors": [{"status","title","detail"}]}`) is centralized in
 * `lib/client.ts`, and every list resource shares its pagination/filter/sort
 * param set from `lib/params.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// Contacts
import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import findContactByEmail from "./actions/find-contact-by-email.ts";

// Matters (Prospects)
import listMatters from "./actions/list-matters.ts";
import getMatter from "./actions/get-matter.ts";
import createMatter from "./actions/create-matter.ts";

// Tasks / Notes / Events
import createTask from "./actions/create-task.ts";
import createNote from "./actions/create-note.ts";
import createEvent from "./actions/create-event.ts";

// Users
import listUsers from "./actions/list-users.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  auth: [oauth2],
  actions: [
    // contacts
    listContacts,
    getContact,
    createContact,
    findContactByEmail,
    // matters
    listMatters,
    getMatter,
    createMatter,
    // tasks / notes / events
    createTask,
    createNote,
    createEvent,
    // users
    listUsers,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
