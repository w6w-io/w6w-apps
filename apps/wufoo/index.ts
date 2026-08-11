/**
 * Wufoo — forms, fields, entries and reports on the **Wufoo REST API v3**
 * (`https://{subdomain}.wufoo.com/api/v3/…`).
 *
 * Every path, parameter and operator was verified on 2026-08-11 against Wufoo's
 * own API documentation (`wufoo.github.io/docs/`) plus live probes against
 * `*.wufoo.com`. Nothing here came from a third-party integration directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **`users.json` returns every user's API key** (`auth/api-key.ts`). It is
 *     the obvious-looking whoami and it discloses *other people's* credentials,
 *     not just the caller's. It is banned from the entire app by a source-grep
 *     test, this app ships no user-listing action, and the auth probe is
 *     `forms.json` instead.
 *  2. **A rejected submission is HTTP 200** (`actions/entry-create.ts`). Wufoo
 *     answers a validation failure with `{"Success": 0, "FieldErrors": […]}`, so
 *     anything checking only the status code records a failed submission as a
 *     success. That action reads `Success` and throws with the per-field errors.
 *  3. **Entry submission is form-encoded, not JSON** (`lib/client.ts`). It is
 *     the one call in the app with a `content-type` that is not
 *     `application/json`.
 *  4. **The status page publishes no components** (`health/service.ts`), so the
 *     page-level indicator is the whole signal — unlike the sibling checks in
 *     this pack, an empty component list here is normal rather than broken.
 *
 * Entry filters are numbered query parameters with a three-word value
 * (`Filter1=Field1+Is_equal_to+Wufoo`); `lib/filters.ts` builds them from
 * structured input and validates the operator against the vendor's closed list,
 * because a misspelt operator returns an empty result set rather than an error.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import formFields from "./actions/form-fields.ts";

import entryList from "./actions/entry-list.ts";
import entryCount from "./actions/entry-count.ts";
import entryCreate from "./actions/entry-create.ts";

import reportList from "./actions/report-list.ts";
import reportEntries from "./actions/report-entries.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // forms — where a form Hash and its field ids come from
    formList,
    formGet,
    formFields,
    // entries
    entryList,
    entryCount,
    entryCreate,
    // reports — saved views over a form's entries
    reportList,
    reportEntries,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
