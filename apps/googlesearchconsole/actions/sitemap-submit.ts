import type { ActionDefinition } from "@w6w/types";
import { resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { FEEDPATH_PARAM, SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `PUT webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` — verified against
 * Google's discovery document (`webmasters.sitemaps.submit`). No request
 * body; the sitemap's own URL is the path segment.
 *
 * `idempotent: true` — resubmitting an already-submitted sitemap is the
 * documented way to ask Google to re-crawl it, not an error.
 */
const action: ActionDefinition = {
  key: "sitemap-submit",
  type: "perform",
  resource: "sitemap",
  title: "Submit a sitemap",
  description: "Submit a sitemap for a site.",
  idempotent: true,
  params: [SITE_URL_PARAM, FEEDPATH_PARAM],
  output: [],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    const feedpath = String(p.feedpath ?? "").trim();
    if (!feedpath) throw new Error("`feedpath` is required");
    ctx.log("info", "submitting Search Console sitemap", { siteUrl, feedpath });
    await new SearchConsoleClient(ctx).request(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`,
      { method: "PUT" },
    );
    return { siteUrl, feedpath };
  },
};

export default action;
