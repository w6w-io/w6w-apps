import type { ActionDefinition } from "@w6w/types";
import { SearchConsoleClient } from "../lib/client.ts";

/**
 * `GET webmasters/v3/sites` — verified against Google's discovery document
 * (`webmasters.sites.list`). Takes no parameters and returns every site the
 * credential can see, each with its `siteUrl` and `permissionLevel`
 * (`SITE_OWNER` | `SITE_FULL_USER` | `SITE_RESTRICTED_USER` |
 * `SITE_UNVERIFIED_USER`). An account with zero verified sites gets back a
 * body with no `siteEntry` key at all, so the empty-list fallback matters.
 */
const action: ActionDefinition = {
  key: "site-list",
  type: "read",
  resource: "site",
  title: "List sites",
  description: "List every Search Console site this account can access.",
  params: [],
  output: [{ key: "siteEntry", type: "array", label: "Sites" }],

  async execute(_input, ctx) {
    ctx.log("info", "listing Search Console sites");
    const body = await new SearchConsoleClient(ctx).request<{ siteEntry?: unknown[] }>(
      "webmasters/v3/sites",
    );
    return { siteEntry: body?.siteEntry ?? [] };
  },
};

export default action;
