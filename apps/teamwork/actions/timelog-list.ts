import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  projectId?: number;
  taskId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

const timelogList: ActionDefinition<Input> = {
  key: "timelog-list",
  type: "search",
  resource: "timelog",
  title: "List Time Entries",
  description: "List logged time. Use the filters to narrow the set.",
  params: [
    { key: "projectId", label: "Project ID", type: "number", row: "filter" },
    { key: "taskId", label: "Task ID", type: "number", row: "filter" },
    { key: "startDate", label: "From date", type: "date", row: "range" },
    { key: "endDate", label: "To date", type: "date", row: "range" },
    ...pagination,
  ],
  output: [
    { key: "timelogs", type: "array", label: "Time entries" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    // `projectId` / `taskId` are documented deprecated in favour of the
    // plural, array-shaped `projectIds` / `taskIds` — this app uses those.
    return new TeamworkClient(ctx).request("/projects/api/v3/time.json", {
      query: {
        projectIds: input.projectId ? [input.projectId] : undefined,
        taskIds: input.taskId ? [input.taskId] : undefined,
        startDate: unset(input.startDate),
        endDate: unset(input.endDate),
        page: input.page,
        pageSize: input.pageSize,
      },
    });
  },
};

export default timelogList;
