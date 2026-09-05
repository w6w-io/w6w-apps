import type { ActionDefinition } from "@w6w/types";
import { resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `GET webmasters/v3/sites/{siteUrl}` — verified against Google's discovery
 * document (`webmasters.sites.get`). Returns the same `WmxSite` shape as one
 * entry of `site-list`, scoped to a single site.
 */
const action: ActionDefinition = {
  key: "site-get",
  type: "read",
  resource: "site",
  title: "Get a site",
  description: "Read the connecting account's permission level for one site.",
  params: [SITE_URL_PARAM],
  output: [
    { key: "siteUrl", type: "string", label: "Site URL" },
    { key: "permissionLevel", type: "string", label: "Permission level" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    ctx.log("info", "getting Search Console site", { siteUrl });
    return await new SearchConsoleClient(ctx).request(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,
    );
  },
};

export default action;
