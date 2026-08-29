/**
 * Pinterest — boards, Pins, saves, search, account info and (with Business
 * Access) ad accounts, over the Pinterest REST API v5 (`api.pinterest.com/v5`).
 *
 * Every path, verb, query parameter, request/response schema and OAuth detail
 * in this app was verified on 2026-08-29 against Pinterest's own OpenAPI 3.0
 * description — `github.com/pinterest/api-description`, `v5/openapi.json`
 * (2.6 MB, `info.version` `5.28.0`) — plus live probes against
 * `api.pinterest.com` and Pinterest's real, verified status page
 * (`www.pintereststatus.com`). Nothing here came from a third-party
 * integration directory; the developers.pinterest.com docs SITE itself is a
 * client-rendered app that returns no usable content to a plain fetch, so an
 * archived DOM snapshot was used only to confirm the OAuth flow's wire
 * format (scope separator, Basic client auth) — every endpoint contract
 * still comes from the OpenAPI description.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Scopes are comma-separated, not space-separated** (`auth/oauth2.ts`).
 *     Pinterest's own worked example sends
 *     `scope=ads:read,ads:write,boards:read,pins:read` — the opposite of every
 *     other OAuth2 app in this pack.
 *  2. **The token endpoint requires HTTP Basic client authentication**
 *     (`auth/oauth2.ts`), not `client_secret_post` — confirmed both by the
 *     OpenAPI description's `security: [{"basic": []}]` on `POST
 *     /oauth/token` and by the vendor's own curl example.
 *  3. **The status page mixes the developer API with the consumer website and
 *     the Ads Manager UI** (`health/service.ts`) — 41 components, of which
 *     exactly 8 (the "The Pinterest API" group) describe what this app
 *     actually calls.
 *
 * Deliberately absent, and why:
 *   - **Video Pins and multi-image/base64 Pins** (`actions/pin-create.ts`).
 *     Video needs a separate `POST /v5/media` upload-registration step whose
 *     upload target is not `api.pinterest.com`, and base64 image bodies are a
 *     materially different action shape — left for a future iteration rather
 *     than invented.
 *   - **Board sections, product tags, and the Ads Manager surface beyond
 *     ad-account read** (campaigns, ad groups, ads, billing, catalogs). All
 *     real endpoints in the OpenAPI description, but each is its own
 *     sub-domain with its own request/response shapes — out of scope for this
 *     app's boards/Pins/account/ad-account core rather than a gap.
 *   - **Pin/board analytics** (`/pins/{id}/analytics`,
 *     `/user_account/analytics`, `/ad_accounts/{id}/pins/analytics`). Each
 *     requires a date-range, granularity and metric-column contract of its
 *     own — a natural follow-up action, not bundled into `pin-get` /
 *     `user-account-get` to keep those two simple reads simple.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import boardCreate from "./actions/board-create.ts";
import boardGet from "./actions/board-get.ts";
import boardList from "./actions/board-list.ts";
import boardUpdate from "./actions/board-update.ts";
import boardDelete from "./actions/board-delete.ts";
import boardPinsList from "./actions/board-pins-list.ts";

import pinCreate from "./actions/pin-create.ts";
import pinGet from "./actions/pin-get.ts";
import pinList from "./actions/pin-list.ts";
import pinUpdate from "./actions/pin-update.ts";
import pinDelete from "./actions/pin-delete.ts";
import pinSave from "./actions/pin-save.ts";
import pinSearch from "./actions/pin-search.ts";

import userAccountGet from "./actions/user-account-get.ts";

import adAccountList from "./actions/ad-account-list.ts";
import adAccountGet from "./actions/ad-account-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  auth: [oauth2],
  actions: [
    // Boards
    boardCreate,
    boardGet,
    boardList,
    boardUpdate,
    boardDelete,
    boardPinsList,
    // Pins
    pinCreate,
    pinGet,
    pinList,
    pinUpdate,
    pinDelete,
    pinSave,
    pinSearch,
    // Account
    userAccountGet,
    // Ad accounts (Business Access)
    adAccountList,
    adAccountGet,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
