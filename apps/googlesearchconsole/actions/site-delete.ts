import type { ActionDefinition } from "@w6w/types";
import { resolveSiteUrl, SearchConsoleClient } from "../lib/client.ts";
import { SITE_URL_PARAM } from "../lib/params.ts";

/**
 * `DELETE webmasters/v3/sites/{siteUrl}` — verified against Google's
 * discovery document (`webmasters.sites.delete`). Removes the site from the
 * connecting account's own Search Console property list; it does not stop
 * Google crawling the site or affect other users' access to it.
 *
 * `idempotent: true` — deleting a site that is already gone (or was never
 * there) is a no-op, not an error condition worth retry-guarding against.
 */
const action: ActionDefinition = {
  key: "site-delete",
  type: "perform",
  resource: "site",
  title: "Delete a site",
  description: "Remove a site from the connecting account's Search Console properties.",
  idempotent: true,
  params: [SITE_URL_PARAM],
  output: [],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = resolveSiteUrl(ctx.connection, p.siteUrl);
    ctx.log("info", "deleting Search Console site", { siteUrl });
    await new SearchConsoleClient(ctx).request(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,
      { method: "DELETE" },
    );
    return { siteUrl };
  },
};

export default action;
