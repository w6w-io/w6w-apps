import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import {
  includeTaskListParam,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  taskStatusOptions,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  filterJobId?: string;
  filterStatus?: string;
  filterOperation?: string;
  include?: string[] | string;
}

/**
 * `GET /v2/tasks` — list all tasks on the account, with their status, payload and result.
 */
const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List all your tasks, optionally filtered by job, status or operation.",
  params: [
    { key: "filterJobId", label: "Job ID", type: "string", hint: "Only tasks for this job." },
    {
      key: "filterStatus",
      label: "Status",
      type: "select",
      options: taskStatusOptions,
      hint: "Only tasks with this status.",
    },
    {
      key: "filterOperation",
      label: "Operation",
      type: "string",
      placeholder: "convert",
      hint: "Only tasks with a matching operation, e.g. convert or import/s3.",
    },
    includeTaskListParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Tasks" },
    { key: "meta", type: "object", label: "Pagination metadata (current_page, per_page, ...)" },
  ],

  execute(input, ctx) {
    return new CloudConvertClient(ctx).page(`/tasks`, {
      query: {
        "filter[job_id]": input.filterJobId,
        "filter[status]": input.filterStatus,
        "filter[operation]": input.filterOperation,
        include: input.include,
        ...paginationQuery(input),
      },
    });
  },
};

export default taskList;
