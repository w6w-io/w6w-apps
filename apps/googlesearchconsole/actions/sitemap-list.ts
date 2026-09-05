import type { ActionDefinition } from "@w6w/types";
import { resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `GET webmasters/v3/sites/{siteUrl}/sitemaps` — verified against Google's
 * discovery document (`webmasters.sitemaps.list`). With `sitemapIndex` unset,
 * lists every sitemap submitted directly for the site; with it set to one of
 * those sitemaps' own URL, lists the entries *inside* that sitemap index
 * instead — the one optional query parameter this method takes.
 */
const action: ActionDefinition = {
  key: "sitemap-list",
  type: "read",
  resource: "sitemap",
  title: "List sitemaps",
  description: "List the sitemaps submitted for a site, or the entries inside a sitemap index.",
  params: [
    SITE_URL_PARAM,
    {
      key: "sitemapIndex",
      label: "Sitemap Index URL",
      type: "string",
      default: "",
      placeholder: "https://www.example.com/sitemapindex.xml",
      hint: "Leave blank to list the sitemaps submitted directly. Set to a sitemap index's own " +
        "URL to list the sitemaps inside it instead.",
    },
  ],
  output: [{ key: "sitemap", type: "array", label: "Sitemaps" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    const sitemapIndex = String(p.sitemapIndex ?? "").trim() || undefined;
    ctx.log("info", "listing Search Console sitemaps", { siteUrl, sitemapIndex });
    const body = await new SearchConsoleClient(ctx).request<{ sitemap?: unknown[] }>(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
      { query: { sitemapIndex } },
    );
    return { sitemap: body?.sitemap ?? [] };
  },
};

export default action;
