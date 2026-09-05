/**
 * Airparser — AI email/document parsing (`api.airparser.com`).
 *
 * Every path, header, param and response field in this app was verified on
 * 2026-09-05 against Airparser's own published article,
 * `help.airparser.com/public-api/public-api` (~132 KB, fetched directly —
 * there is no separate OpenAPI document), plus live unauthenticated probes
 * against `api.airparser.com` and `status.airparser.com`. Nothing here came
 * from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **A missing key and a wrong key are byte-identical on the wire**
 *     (`lib/client.ts`, `auth/api-key.ts`) — both answer
 *     `401 {"statusCode":401,"message":"Unauthorized"}`, so the auth `test`
 *     hook does not pretend to tell them apart.
 *  2. **`GET /inboxes` is the auth probe**, not a dedicated whoami — Airparser
 *     publishes no `/me`/`/account` endpoint at all, so unlike Mailjet's
 *     `/apikey` or Follow Up Boss's `/me` there is no credential-echoing trap
 *     to avoid here; the probe was picked for being cheap, read-only, and
 *     needing no id the caller might not have yet.
 *  3. **Sync upload rejects ZIP; async upload accepts it** (`actions/
 *     document-parse-sync.ts`, `actions/document-parse-async.ts`) — the same
 *     `file` field behaves differently depending on which endpoint receives
 *     it.
 *  4. **`schema` and `schema-clone` return a bare boolean**, not an object
 *     (`lib/client.ts`) — both actions here wrap it in a named field so a
 *     workflow has something to read.
 *  5. **The list-documents `status` filter's array wire format is
 *     undocumented** (`actions/document-list.ts`) — sent as a repeated query
 *     parameter, the conventional reading, but unconfirmed against a live
 *     account.
 *
 * A vendor status page exists at `status.airparser.com` (Better Stack,
 * confirmed genuine — see `health/service.ts`); no account-level credit or
 * rate-limit endpoint is documented, so quota headroom is a declared absence
 * (`health/quota.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import documentParseSync from "./actions/document-parse-sync.ts";
import documentParseAsync from "./actions/document-parse-async.ts";
import documentGet from "./actions/document-get.ts";
import documentGetExtended from "./actions/document-get-extended.ts";
import documentList from "./actions/document-list.ts";

import inboxCreate from "./actions/inbox-create.ts";
import inboxList from "./actions/inbox-list.ts";
import inboxGet from "./actions/inbox-get.ts";
import inboxDelete from "./actions/inbox-delete.ts";

import schemaUpdate from "./actions/schema-update.ts";
import schemaClone from "./actions/schema-clone.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Documents
    documentParseSync,
    documentParseAsync,
    documentGet,
    documentGetExtended,
    documentList,
    // Inboxes
    inboxCreate,
    inboxList,
    inboxGet,
    inboxDelete,
    // Extraction schema
    schemaUpdate,
    schemaClone,
  ],
  // API key only. Airparser's Public API documents exactly one auth scheme.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
