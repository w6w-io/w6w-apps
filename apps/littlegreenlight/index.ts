/**
 * Little Green Light (LGL) — a web-based CRM built for small and mid-size
 * nonprofits, over LGL's own REST API v1 (`api.littlegreenlight.com/api/v1`).
 *
 * Every path, parameter and model in this app was verified on 2026-09-05
 * against LGL's own machine-readable API reference — the Swagger 1.2 index at
 * `https://api.littlegreenlight.com/api-docs/json/api-docs.json`, plus its 33
 * per-resource sub-documents at `/api-docs/json/lgl_api/v1/{resource}.json` —
 * cross-checked against live unauthenticated/garbage-credential probes of
 * `api.littlegreenlight.com`.
 *
 * The findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **Auth is Bearer, not the Basic a bare request's own `WWW-Authenticate`
 *     header implies** (`lib/client.ts`, `auth/bearer-token.ts`). A
 *     credential-less request gets `WWW-Authenticate: Basic realm="API"` with
 *     an HTML body; a request carrying `Authorization: Bearer <garbage>` gets
 *     a second, more specific `WWW-Authenticate: Bearer realm="Rack::OAuth2
 *     Protected Resources"` challenge with a structured JSON body — the real
 *     scheme, confirmed independently against a third-party open source LGL
 *     client on npm (`lgl-mcp-server`).
 *  2. **Search filters are an array of embedded `field=value` strings**
 *     (`q[]=name=brady`, `q[]=updated_from=2016-01-01`), not a single
 *     free-text search term (`lib/client.ts`, `lib/params.ts`). LGL's own
 *     reference does not enumerate the full set of valid filter field names
 *     beyond its one worked example per resource, so this app exposes a raw
 *     filter-clause list rather than guessing at named dropdowns.
 *  3. **One list envelope, shared by all 33 documented resources**:
 *     `{ api_version, items_count, total_items, limit, offset, next_item,
 *     next_link, item_type, items: [...] }` (`lib/client.ts`). There is no
 *     separate "Pagination" section in the reference — this envelope IS it,
 *     uniformly, for every resource this app covers.
 *
 * Left out, and why:
 *  - **No vendor status page.** `status.littlegreenlight.com` and
 *    `littlegreenlight.statuspage.io` are both unclaimed-Statuspage redirects
 *    to Atlassian's own marketing page — see `health/service.ts`.
 *  - **No quota/rate-limit signal.** No header or endpoint of any kind was
 *    found live or in the reference — see `health/quota.ts`.
 *  - **Delete/update actions.** LGL documents `PATCH`/`DELETE` for every
 *    resource here, but this first pass covers the read/search/create
 *    surface a workflow most commonly needs; update/delete were left out to
 *    keep this app's scope focused rather than to work around a limitation.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import constituentSearch from "./actions/constituent-search.ts";
import constituentGet from "./actions/constituent-get.ts";
import constituentCreate from "./actions/constituent-create.ts";
import giftList from "./actions/gift-list.ts";
import giftSearch from "./actions/gift-search.ts";
import giftCreate from "./actions/gift-create.ts";
import noteList from "./actions/note-list.ts";
import noteCreate from "./actions/note-create.ts";
import appealList from "./actions/appeal-list.ts";
import campaignList from "./actions/campaign-list.ts";
import fundList from "./actions/fund-list.ts";
import groupList from "./actions/group-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    constituentSearch,
    constituentGet,
    constituentCreate,
    giftList,
    giftSearch,
    giftCreate,
    noteList,
    noteCreate,
    appealList,
    campaignList,
    fundList,
    groupList,
  ],
  // Bearer token only. LGL's reference declares no OAuth surface for
  // third-party integrations — an account-level access token is the entire
  // authentication story.
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
