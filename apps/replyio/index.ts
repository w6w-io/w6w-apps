/**
 * Reply.io — sales engagement: contacts, multichannel sequences ("campaigns"),
 * email accounts, and reporting, over the Reply API v3 (`api.reply.io`).
 *
 * Every path, verb, parameter, body field and enum in this app was verified on
 * 2026-09-01 against Reply's own bundled OpenAPI 3.1 document
 * (`docs.reply.io/api-reference/bundled.yaml`, 1,878,601 bytes, `info.version`
 * `3.0.0`, 281 paths) plus live probes against `api.reply.io` and
 * `status.reply.io`. Nothing here came from a third-party integration
 * directory.
 *
 * ## v1/v2 vs v3
 *
 * Reply publishes three API generations at the same host: v1 and v2 (Postman-
 * published docs at `apidocs.reply.io`) and v3 (Mintlify docs at
 * `docs.reply.io`, backed by a real OpenAPI document). Reply's own v1/v2 docs
 * say plainly: "API V1 and V2 are still working, but both versions are
 * outdated and no longer supported... please use V3 going forward." This app
 * is v3 only.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The docs and the wire disagree on the 401 shape** (`auth/api-key.ts`,
 *     `lib/client.ts`). `docs.reply.io/api-reference/authentication` says a 401
 *     has an empty body; a live probe on 2026-09-01 shows every 401 actually
 *     carries an `application/problem+json` body. Both are handled.
 *  2. **`companySize` is spelled with two different casings depending on
 *     direction** (`lib/params.ts`): PascalCase (`"SelfEmployed"`) on write,
 *     camelCase (`"selfEmployed"`) on read — confirmed from the OpenAPI
 *     document's own separate request/response schemas, not inferred.
 *  3. **A sequence's `settings` object is all-or-nothing** (`actions/
 *     sequence-create.ts`): optional at the top level, but 7 of its fields
 *     become required together the moment it's included at all. This action
 *     omits it entirely rather than risk a 400 from a partial fill.
 *  4. **The status host blocks requests with no distinctive `User-Agent`**
 *     (`health/service.ts`): `status.reply.io` sits behind a Cloudflare rule
 *     that 403s a request with no `User-Agent`, curl's default, or even a bare
 *     `"Mozilla/5.0"` — confirmed live by varying only that one header.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import whoamiGet from "./actions/whoami-get.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactFilter from "./actions/contact-filter.ts";
import customFieldList from "./actions/custom-field-list.ts";

import sequenceList from "./actions/sequence-list.ts";
import sequenceGet from "./actions/sequence-get.ts";
import sequenceCreate from "./actions/sequence-create.ts";
import sequenceStart from "./actions/sequence-start.ts";
import sequencePause from "./actions/sequence-pause.ts";
import sequenceContactsAdd from "./actions/sequence-contacts-add.ts";
import sequenceContactList from "./actions/sequence-contact-list.ts";

import emailAccountList from "./actions/email-account-list.ts";
import emailAccountGet from "./actions/email-account-get.ts";

import emailReportingOverviewGet from "./actions/email-reporting-overview-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account
    whoamiGet,
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactFilter,
    customFieldList,
    // Sequences ("campaigns")
    sequenceList,
    sequenceGet,
    sequenceCreate,
    sequenceStart,
    sequencePause,
    sequenceContactsAdd,
    sequenceContactList,
    // Email accounts
    emailAccountList,
    emailAccountGet,
    // Reporting
    emailReportingOverviewGet,
  ],
  // Bearer API key only. Reply's v3 API documents no OAuth surface for
  // third-party apps — the key from Settings > API Key is the whole story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
