/**
 * eBay — w6w app, grounded in eBay's own OpenAPI/Swagger specs
 * (developer.ebay.com) for the Buy Browse API and the Developer Analytics
 * API, plus a live-verified OAuth2 client-credentials flow.
 *
 * `developer.ebay.com` returns a `403 "Error Page | eBay"` edge block to
 * every direct `curl` — with a realistic browser User-Agent, Accept,
 * Accept-Language and Referer headers, and even to its own `robots.txt` —
 * so the specs here were read through the Wayback Machine's archived
 * copies of the real, eBay-published pages (recent snapshots, Feb–Jun
 * 2026), not reconstructed from memory:
 *
 *   - Buy Browse API: buy_browse_v1_oas3.json (v1.20.4)
 *   - Developer Analytics API: developer_analytics_v1_beta_oas3.json
 *
 * The production API host, `api.ebay.com`, is a *different* case and is
 * NOT edge-blocked: verified live that an unauthenticated request to it is
 * 403'd the same way, but a request carrying *any* Authorization header —
 * even a fabricated one — gets past the edge and returns eBay's own JSON
 * error envelope (`{"errors":[{"domain":"OAuth", ...}]}`), and the OAuth2
 * token endpoint itself answers a fabricated Basic-auth request with the
 * standard `401 {"error":"invalid_client", ...}` (RFC 6749 §5.2). This
 * app's `sign` hook always attaches a real bearer token, so a genuine call
 * never takes the unsigned edge-blocked path.
 *
 * eBay's REST platform splits public-data reads (Buy: Browse, Feed, Deal,
 * Marketing, Order) from seller-scoped writes (Sell: Inventory, Fulfillment,
 * Account, ...) along an authorization line, not a host line — both live on
 * `api.ebay.com`. Only the former uses the machine-to-machine
 * client-credentials grant this app implements (`scope=
 * https://api.ebay.com/oauth/api_scope`); the latter needs a *seller's own*
 * consent via eBay's browser authorization-code flow
 * (`auth.ebay.com/oauth2/authorize`, confirmed from the Sell Inventory
 * API's own `securitySchemes`) — a different, user-bound credential this
 * app does not request and cannot use. So this app covers the Buy Browse
 * API's read surface: search current listings, and look one up by its
 * RESTful item ID, its legacy numeric ID, or as one variation in a
 * multi-SKU listing group.
 *
 * Deliberately absent: everything that needs seller consent (Sell
 * Inventory/Fulfillment/Account), the Sandbox environment
 * (api.sandbox.ebay.com — a separate app registration with fake test
 * listings), and any Trading/Finding (legacy XML) API.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import itemSearch from "./actions/item-search.ts";
import itemGet from "./actions/item-get.ts";
import itemGetByLegacyId from "./actions/item-get-by-legacy-id.ts";
import itemGroupGet from "./actions/item-group-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    itemSearch,
    itemGet,
    itemGetByLegacyId,
    itemGroupGet,
  ],
  auth: [clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
