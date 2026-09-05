import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { paginationParams, sortParam } from "../lib/params.ts";

/** `GET /projects/:project_id/sections` — the Kanban columns of one project. */
interface Input {
  projectId: number;
  status?: string;
  items?: number;
  page?: number;
  sort?: string;
}

const sectionList: ActionDefinition<Input, unknown[]> = {
  key: "section-list",
  type: "search",
  resource: "section",
  title: "List Sections",
  description: "List the sections (columns) of a project.",
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active (default)" },
        { value: "trashed", label: "Trashed" },
        { value: "all", label: "All" },
      ],
    },
    ...paginationParams,
    sortParam,
  ],
  output: [{ key: "", type: "array", label: "Sections" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(
      `/projects/${input.projectId}/sections`,
      { query: { status: input.status, items: input.items, page: input.page, sort: input.sort } },
    );
  },
};

export default sectionList;
