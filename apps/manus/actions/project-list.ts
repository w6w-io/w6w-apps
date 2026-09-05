import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type Project, type ProjectListResponse } from "../lib/client.ts";

/**
 * `GET /v2/project.list` — every project in the account. Not paginated (the
 * vendor's schema declares no cursor for this endpoint), so this is a `read`
 * rather than a `search` action.
 */
const projectList: ActionDefinition<Record<string, never>, Project[]> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List all projects in the account.",
  params: [],
  output: [{ key: "", type: "array", label: "Projects" }],

  async execute(_input, ctx) {
    const res = await new ManusClient(ctx).request<ProjectListResponse>("/v2/project.list");
    return res.data;
  },
};

export default projectList;
