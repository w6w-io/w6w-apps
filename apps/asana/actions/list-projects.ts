import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  team?: string;
  archived?: boolean;
  limit?: number;
  offset?: string;
  opt_fields?: string;
}

const listProjects: ActionDefinition<Input> = {
  key: "list-projects",
  type: "read",
  resource: "project",
  title: "List Projects",
  description:
    "List projects in a workspace or team. Walks one page; pass back `offset` (from `next_page.offset`) to get the next.",
  params: [
    { key: "workspace", label: "Workspace ID", type: "string", required: true },
    {
      key: "team",
      label: "Team ID",
      type: "string",
      hint: "When set, results are scoped by team instead of workspace.",
    },
    { key: "archived", label: "Include archived", type: "boolean" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset (pagination cursor)", type: "string" },
    { key: "opt_fields", label: "Fields", type: "string" },
  ],

  async execute(input, ctx) {
    // n8n Asana: if `team` is set, use it and drop `workspace`; else use `workspace`.
    const query: Record<string, string | number | boolean | undefined | null> = {
      limit: input.limit ?? 100,
      offset: input.offset,
      opt_fields: input.opt_fields,
      archived: input.archived,
    };
    if (input.team) {
      query.team = input.team;
    } else {
      query.workspace = input.workspace;
    }
    return new AsanaClient(ctx).request(`/projects`, { query });
  },
};

export default listProjects;
