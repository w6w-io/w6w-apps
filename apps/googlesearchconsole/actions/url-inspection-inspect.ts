import type { ActionDefinition } from "@w6w/types";
import { compact, resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `POST v1/urlInspection/index:inspect` — verified against Google's
 * discovery document (`searchconsole.urlInspection.index.inspect`). This is
 * the newer, actually-`v1` surface (the `sites`/`sitemaps`/`searchanalytics`
 * methods are all `webmasters/v3`), so it is the one action in this app
 * whose path does not start with `webmasters/v3`.
 *
 * Returns `indexStatusResult` (coverage verdict, canonical URL, robots.txt
 * and noindex state, last crawl time) plus, when applicable,
 * `richResultsResult` and `ampResult`. The response also carries a
 * `mobileUsabilityResult`, but Google's own discovery document flags that
 * field `"deprecated": true` — Mobile-Friendly Test / mobile usability
 * reporting was retired 2023-12-01 — so it is passed through undocumented
 * rather than promoted into this action's declared `output`.
 */
const action: ActionDefinition = {
  key: "url-inspection-inspect",
  type: "read",
  resource: "url-inspection",
  title: "Inspect a URL",
  description: "Check a URL's indexing status: coverage, canonical, robots.txt, last crawl.",
  params: [
    SITE_URL_PARAM,
    {
      key: "inspectionUrl",
      label: "URL to inspect",
      type: "string",
      required: true,
      placeholder: "https://www.example.com/page",
      hint: "Must be under the property named in Site URL.",
    },
    {
      key: "languageCode",
      label: "Language",
      type: "string",
      default: "",
      placeholder: "en-US",
      hint: "IETF BCP-47 code for translated issue messages. Defaults to en-US.",
    },
  ],
  output: [
    { key: "inspectionResult", type: "object", label: "Inspection result" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    const inspectionUrl = String(p.inspectionUrl ?? "").trim();
    if (!inspectionUrl) throw new Error("`inspectionUrl` is required");

    const body = compact({
      siteUrl,
      inspectionUrl,
      languageCode: p.languageCode,
    });

    ctx.log("info", "inspecting URL", { siteUrl, inspectionUrl });

    return await new SearchConsoleClient(ctx).request(
      "v1/urlInspection/index:inspect",
      { method: "POST", body },
    );
  },
};

export default action;
