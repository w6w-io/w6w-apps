import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";
import { FILTER_PARAM, LIST_PARAMS, SORT_PARAM } from "../lib/params.ts";

interface TableauUser {
  id: string;
  name: string;
  siteRole?: string;
  email?: string;
  lastLogin?: string;
}

/**
 * `GET /sites/{siteId}/users` — verified against Tableau's "Get Users on
 * Site" reference page. Admin-only: "This method can only be called by
 * server administrators and site administrators." A non-admin PAT gets a
 * 403, distinct from a bad credential (401).
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description: "List the users on this site. Requires a server or site administrator PAT.",
  params: [FILTER_PARAM, SORT_PARAM, ...LIST_PARAMS],
  output: [{ key: "users", type: "array", label: "Users" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);
    const client = new TableauClient(ctx);

    ctx.log("info", "listing Tableau users", { returnAll, limit });

    const users = await client.requestList<TableauUser>(
      "/users",
      "users",
      "user",
      {
        query: { filter: (p.filter as string) || undefined, sort: (p.sort as string) || undefined },
      },
      returnAll ? Infinity : limit,
    );
    return { users };
  },
};

export default action;
