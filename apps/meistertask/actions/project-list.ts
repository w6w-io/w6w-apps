import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { paginationParams, sortParam } from "../lib/params.ts";

/** `GET /projects` — every project this account can see. */
interface Input {
  status?: string;
  items?: number;
  page?: number;
  sort?: string;
}

const projectList: ActionDefinition<Input, unknown[]> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List all projects available to this account.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active (default)" },
        { value: "archived", label: "Archived" },
        { value: "all", label: "All" },
      ],
    },
    ...paginationParams,
    sortParam,
  ],
  // MeisterTask returns the bare array, not `{ items: [...] }` — the empty
  // key names the root result itself, matching this pack's convention for a
  // vendor with no list envelope (see e.g. trello's board-get-lists).
  output: [{ key: "", type: "array", label: "Projects" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>("/projects", {
      query: { status: input.status, items: input.items, page: input.page, sort: input.sort },
    });
  },
};

export default projectList;
