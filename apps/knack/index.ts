/**
 * Knack — the no-code database and app builder: read, create, update and
 * delete records against a Knack application's own Object schema, over
 * Knack's object-based REST API (`api.knack.com/v1`).
 *
 * Every path, header, and error string in this app was verified on
 * 2026-09-05 against Knack's own reference docs at
 * `docs.knack.com/reference` (ReadMe-hosted — the catalog's older
 * `www.knack.com/developer-documentation/` link 301s to a marketing
 * redirect page and is dead) plus live probes against `api.knack.com` and
 * `status.knack.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **There is no schema-discovery endpoint of any kind** (`lib/client.ts`).
 *     Every documented route is scoped to `/objects/{object_key}/records[...]`
 *     or a page/view. There is no `GET /v1/objects`, no whoami, no ping — so
 *     every Action here takes an `objectKey` param, and `auth/application-key.ts`
 *     collects a dedicated `testObject` field purely so a Connection can be
 *     verified at all.
 *  2. **Error bodies are plain text, not JSON** (`lib/client.ts`,
 *     `auth/application-key.ts`). `Malformed App ID.`, `Invalid API key`,
 *     `Invalid API Request` — measured live, with `content-type: text/html` —
 *     even though every successful response is JSON.
 *  3. **Whether rate-limit headers ride an ordinary response is genuinely
 *     unconfirmed** (`health/quota.ts`). The vendor's only worked example
 *     shows them next to a `429`; a separate section implies they are always
 *     readable. Without live credentials this could not be settled, so the
 *     quota check reads what is actually present and reports `unknown`
 *     rather than assuming.
 *  4. **The Application ID is not the secret half of the credential**
 *     (`auth/application-key.ts`) — Knack's own docs warn it ships in
 *     client-side code, so only the API key is masked.
 */
import type { AppDefinition } from "@w6w/types";
import applicationKey from "./auth/application-key.ts";

import recordList from "./actions/record-list.ts";
import recordGet from "./actions/record-get.ts";
import recordCreate from "./actions/record-create.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    recordList,
    recordGet,
    recordCreate,
    recordUpdate,
    recordDelete,
  ],
  // Application ID + API key only. Knack publishes no OAuth surface and no
  // alternative credential for the object-based API this app uses.
  auth: [applicationKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
