import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient, toList } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/** `GET /projects/{project_id}/tasks` — the project's translation tasks. */
interface Input {
  projectId: string;
  filterTitle?: string;
  filterStatuses?: string[];
  limit?: number;
  page?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List the project's translation tasks.",
  params: [
    projectIdParam,
    { key: "filterTitle", label: "Filter by title", type: "string" },
    {
      key: "filterStatuses",
      label: "Filter by status",
      type: "multiselect",
      options: [
        { value: "created", label: "Created" },
        { value: "queued", label: "Queued" },
        { value: "in_progress", label: "In progress" },
        { value: "completed", label: "Completed" },
      ],
    },
    ...paginationParams(100).filter((p) => p.key !== "cursor"),
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    { key: "totalCount", type: "number", label: "Total tasks" },
  ],

  async execute(input, ctx) {
    const { items, totalCount } = await new LokaliseClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/tasks`,
      "tasks",
      {
        query: {
          filter_title: input.filterTitle,
          filter_statuses: toList(input.filterStatuses),
          ...paginationQuery(input),
        },
      },
    );
    return { items, totalCount };
  },
};

export default taskList;
