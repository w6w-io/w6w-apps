import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient, compact } from "../lib/client.ts";
import { pageParam, pageSizeParam, robotIdParam, taskStatusOptions } from "../lib/params.ts";

/**
 * `GET /v2/robots/{robotId}/tasks` — a robot's task history.
 *
 * `pageSize` is capped at **10** by the vendor — there is no way to ask for
 * more per page, unlike the 100+ defaults most list endpoints elsewhere in
 * this pack allow. Paging through a robot with thousands of tasks means a lot
 * of calls; `fromDate`/`toDate` (Unix-millisecond bounds) are the more
 * efficient filter when you only need a recent window.
 */
interface Input {
  robotId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  robotBulkRunId?: string;
  sort?: string;
  includeRetried?: boolean;
  fromDate?: number;
  toDate?: number;
}

interface Output {
  totalCount: number;
  pageNumber: number;
  hasMore: boolean;
  items: unknown[];
}

const taskList: ActionDefinition<Input, Output> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List a robot's tasks, newest first by default.",
  params: [
    robotIdParam,
    pageParam,
    pageSizeParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: taskStatusOptions,
      hint: "Leave empty to return tasks in any status.",
    },
    {
      key: "robotBulkRunId",
      label: "Bulk run ID",
      type: "string",
      hint: "Restrict results to tasks started by this bulk run.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "-createdAt,finishedAt",
      hint: "Comma-separated field list. Prefix a field with `-` for descending order.",
    },
    {
      key: "includeRetried",
      label: "Include retried tasks",
      type: "boolean",
      hint: "Set to false to exclude the original task of a pair Browse AI auto-retried.",
    },
    {
      key: "fromDate",
      label: "From (Unix ms)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Only tasks created at or after this Unix-millisecond timestamp.",
    },
    {
      key: "toDate",
      label: "To (Unix ms)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Only tasks created at or before this Unix-millisecond timestamp.",
    },
  ],
  output: [
    { key: "totalCount", type: "number", label: "Total tasks" },
    { key: "pageNumber", type: "number", label: "Current page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "items", type: "array", label: "Tasks" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ result: { robotTasks: Output } }>(
      `/robots/${encodeURIComponent(input.robotId)}/tasks`,
      {
        query: compact({
          page: input.page,
          pageSize: input.pageSize,
          status: input.status,
          robotBulkRunId: input.robotBulkRunId,
          sort: input.sort,
          includeRetried: input.includeRetried,
          fromDate: input.fromDate,
          toDate: input.toDate,
        }),
      },
    );
    return body.result.robotTasks;
  },
};

export default taskList;
