import type { ActionDefinition } from "@w6w/types";
import { resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { FEEDPATH_PARAM, SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `GET webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` — verified against
 * Google's discovery document (`webmasters.sitemaps.get`). Returns a
 * `WmxSitemap`: processing state (`isPending`), type, and `warnings`/`errors`
 * counts as int64-typed strings.
 */
const action: ActionDefinition = {
  key: "sitemap-get",
  type: "read",
  resource: "sitemap",
  title: "Get a sitemap",
  description: "Read one sitemap's processing status and warning/error counts.",
  params: [SITE_URL_PARAM, FEEDPATH_PARAM],
  output: [
    { key: "path", type: "string", label: "Sitemap URL" },
    { key: "isPending", type: "boolean", label: "Pending" },
    { key: "isSitemapsIndex", type: "boolean", label: "Is a sitemap index" },
    { key: "type", type: "string", label: "Type" },
    { key: "lastSubmitted", type: "string", label: "Last submitted" },
    { key: "lastDownloaded", type: "string", label: "Last downloaded" },
    { key: "warnings", type: "string", label: "Warning count" },
    { key: "errors", type: "string", label: "Error count" },
    { key: "contents", type: "array", label: "Content types" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    const feedpath = String(p.feedpath ?? "").trim();
    if (!feedpath) throw new Error("`feedpath` is required");
    ctx.log("info", "getting Search Console sitemap", { siteUrl, feedpath });
    return await new SearchConsoleClient(ctx).request(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`,
    );
  },
};

export default action;
