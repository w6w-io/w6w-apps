import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { paginationParams, taskBoardIdParam, taskStatusFilterOptions } from "../lib/params.ts";

/** `GET /tasks/v1/taskboards/{taskBoardId}/tasks` — tasks on one board. */
interface Input {
  taskBoardId: string;
  taskIds?: string;
  labelIds?: string;
  userIds?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List tasks on a task board.",
  params: [
    taskBoardIdParam,
    { key: "taskIds", label: "Task IDs", type: "string", hint: "Comma-separated." },
    { key: "labelIds", label: "Label IDs", type: "string", hint: "Comma-separated." },
    {
      key: "userIds",
      label: "Assigned user IDs",
      type: "string",
      hint: "Comma-separated numeric ids. Group tasks assigned to any of these are included too.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "all",
      options: taskStatusFilterOptions,
    },
    ...paginationParams(100),
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "total", type: "number", label: "Total matching tasks (when computed)" },
  ],

  async execute(input, ctx) {
    const { data, paging } = await new ConnecteamClient(ctx).page<{ tasks: unknown[] }>(
      `/tasks/v1/taskboards/${input.taskBoardId}/tasks`,
      {
        query: {
          taskIds: toList(input.taskIds),
          labelIds: toList(input.labelIds),
          userIds: toIdList(input.userIds),
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
    return { tasks: data.tasks ?? [], ...paging };
  },
};

export default taskList;
