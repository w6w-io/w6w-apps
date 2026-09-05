import type { ActionDefinition } from "@w6w/types";
import { requireSiteUrl, SearchConsoleClient } from "../lib/client.ts";

/**
 * `PUT webmasters/v3/sites/{siteUrl}` — verified against Google's discovery
 * document (`webmasters.sites.add`). Takes no request body — the site to add
 * is entirely the path segment. `siteUrl` is required and has no connection
 * fallback here: this action provisions a *new* entry, so defaulting to the
 * connection's own site would silently re-add the site already on it instead
 * of the one the caller meant to add.
 *
 * `idempotent: true` — a PUT with no body, and re-adding an already-added
 * site is a documented no-op rather than an error.
 */
const action: ActionDefinition = {
  key: "site-add",
  type: "perform",
  resource: "site",
  title: "Add a site",
  description: "Add a site to the connecting account's Search Console properties.",
  idempotent: true,
  params: [
    {
      key: "siteUrl",
      label: "Site URL",
      type: "string",
      required: true,
      placeholder: "https://www.example.com/ or sc-domain:example.com",
      hint: "A URL-prefix property (protocol and trailing slash both significant) or a domain " +
        "property (`sc-domain:` prefix). The account still needs to verify ownership " +
        "afterward — this call only registers the property.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const siteUrl = requireSiteUrl(p.siteUrl);
    ctx.log("info", "adding Search Console site", { siteUrl });
    await new SearchConsoleClient(ctx).request(
      `webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,
      { method: "PUT" },
    );
    return { siteUrl };
  },
};

export default action;
