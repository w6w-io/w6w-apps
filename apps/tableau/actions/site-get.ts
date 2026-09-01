import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

/**
 * `GET /sites/{siteId}` — verified against Tableau's "Query Site" reference
 * page. Admin-only ("This method can only be called by server administrators
 * and site administrators"), and scoped to the site signed into — "you can
 * only get site information for the site that you have signed in to", so
 * there is deliberately no `siteId` parameter here to get wrong.
 */
const action: ActionDefinition = {
  key: "site-get",
  type: "read",
  resource: "site",
  title: "Get this site",
  description: "Read the connection's own site — name, storage and user count. Requires a " +
    "server or site administrator PAT.",
  params: [
    {
      key: "includeUsage",
      label: "Include Usage",
      type: "boolean",
      default: false,
      hint: "Adds storage (MB) and user count to the response.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Site ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "contentUrl", type: "string", label: "Content URL" },
    { key: "state", type: "string", label: "State" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new TableauClient(ctx);
    // `client.request` already targets `/sites/{siteId}` — this call needs no
    // further path segment, just the query string.
    const body = await client.request<{ site: Record<string, unknown> }>(
      "",
      { query: { includeUsage: p.includeUsage === true ? "true" : undefined } },
    );
    return body.site;
  },
};

export default action;
