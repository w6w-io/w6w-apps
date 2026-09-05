import type { ActionDefinition } from "@w6w/types";
import { resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { FEEDPATH_PARAM, SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `DELETE webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` — verified
 * against Google's discovery document (`webmasters.sitemaps.delete`). Removes
 * the sitemap from the Sitemaps report only; it does not stop Google crawling
 * the sitemap or the URLs it previously listed.
 *
 * `idempotent: true` — deleting an already-deleted sitemap is a no-op.
 */
const action: ActionDefinition = {
  key: "sitemap-delete",
  type: "perform",
  resource: "sitemap",
  title: "Delete a sitemap",
  description: "Remove a sitemap from the Sitemaps report for a site.",
  idempotent: true,
  params: [SITE_URL_PARAM, FEEDPATH_PARAM],
  output: [],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    const feedpath = String(p.feedpath ?? "").trim();
    if (!feedpath) throw new Error("`feedpath` is required");
    ctx.log("info", "deleting Search Console sitemap", { siteUrl, feedpath });
    await new SearchConsoleClient(ctx).request(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`,
      { method: "DELETE" },
    );
    return { siteUrl, feedpath };
  },
};

export default action;
