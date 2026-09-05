/**
 * Google Search Console — manage sites and sitemaps, run Search Analytics
 * queries, and inspect a URL's index status.
 *
 * Every path, parameter, required body field and response shape was taken
 * from Google's own discovery document, fetched 2026-09-05:
 * `https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest`.
 *
 * **One host, two path prefixes**, and the split is not cosmetic:
 *
 *   - `sites.*`, `sitemaps.*` and `searchanalytics.query` live under
 *     `webmasters/v3/...` — Search Console still serves these from the
 *     legacy Webmaster Tools API name.
 *   - `urlInspection.index.inspect` lives under `v1/urlInspection/...` — the
 *     newer, actually-`v1`-versioned surface.
 *
 * Both share the same host, `searchconsole.googleapis.com`, which is the
 * only entry in `w6w.network.allow`.
 *
 * Deliberately out of scope:
 *
 *   - **`urlTestingTools.mobileFriendlyTest.run`.** Still listed in the
 *     discovery document, but Google retired the Mobile-Friendly Test tool
 *     and its backing API on 2023-12-01
 *     (`developers.google.com/search/blog/2023/11/mobile-friendly-test-tool-retirement`).
 *     A live unauthenticated call (2026-09-05) answers
 *     `403 PERMISSION_DENIED — Method doesn't allow unregistered callers`,
 *     which is what an API-key-gated method looks like rather than a normal
 *     OAuth challenge, and `UrlInspectionResult.mobileUsabilityResult` — the
 *     same signal surfaced through the URL Inspection API — is itself
 *     flagged `"deprecated": true` in the same document. Shipping a method
 *     the vendor has shut down would be worse than leaving it out.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import siteList from "./actions/site-list.ts";
import siteGet from "./actions/site-get.ts";
import siteAdd from "./actions/site-add.ts";
import siteDelete from "./actions/site-delete.ts";
import sitemapList from "./actions/sitemap-list.ts";
import sitemapGet from "./actions/sitemap-get.ts";
import sitemapSubmit from "./actions/sitemap-submit.ts";
import sitemapDelete from "./actions/sitemap-delete.ts";
import searchAnalyticsQuery from "./actions/search-analytics-query.ts";
import urlInspectionInspect from "./actions/url-inspection-inspect.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // site
    siteList,
    siteGet,
    siteAdd,
    siteDelete,
    // sitemap
    sitemapList,
    sitemapGet,
    sitemapSubmit,
    sitemapDelete,
    // reporting
    searchAnalyticsQuery,
    // url inspection
    urlInspectionInspect,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
