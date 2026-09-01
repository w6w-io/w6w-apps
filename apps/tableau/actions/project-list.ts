import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";
import { FILTER_PARAM, LIST_PARAMS, SORT_PARAM } from "../lib/params.ts";

interface Project {
  id: string;
  name: string;
  description?: string;
  parentProjectId?: string;
  contentPermissions?: string;
  topLevelProject?: boolean;
}

/**
 * `GET /sites/{siteId}/projects` — verified against Tableau's "Query
 * Projects" reference page.
 *
 * The one list endpoint every signed-in user can call without a
 * server/site-administrator role — "users who are not administrators can
 * call this method only if they have Read permission for the project", and a
 * user with no visible projects still gets a 200 with an empty list rather
 * than a 403. That is what makes it the auth `test` probe as well as an
 * action here.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description: "List the projects on this site.",
  params: [FILTER_PARAM, SORT_PARAM, ...LIST_PARAMS],
  output: [{ key: "projects", type: "array", label: "Projects" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);
    const client = new TableauClient(ctx);

    ctx.log("info", "listing Tableau projects", { returnAll, limit });

    const projects = await client.requestList<Project>(
      "/projects",
      "projects",
      "project",
      {
        query: { filter: (p.filter as string) || undefined, sort: (p.sort as string) || undefined },
      },
      returnAll ? Infinity : limit,
    );
    return { projects };
  },
};

export default action;
