import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient, compact } from "../lib/client.ts";
import { bulkRunIdParam, pageParam, robotIdParam } from "../lib/params.ts";

/**
 * `GET /v2/robots/{robotId}/bulk-runs/{bulkRunId}` — a bulk run's summary plus
 * a paginated page of the tasks it started.
 *
 * `page` here paginates the **tasks inside this bulk run**, not the list of
 * bulk runs — the same param name as `bulk-run-list` means a different thing
 * depending which action you're looking at.
 */
interface Input {
  robotId: string;
  bulkRunId: string;
  page?: number;
}

interface Output {
  bulkRun: {
    id: string;
    title?: string | null;
    status?: string;
    tasksCount: number;
    successfulTasks: number;
    failedTasks: number;
  };
  robotTasks: {
    totalCount: number;
    pageNumber: number;
    hasMore: boolean;
    items: unknown[];
  };
}

const bulkRunGet: ActionDefinition<Input, Output> = {
  key: "bulk-run-get",
  type: "read",
  resource: "bulk-run",
  title: "Get Bulk Run",
  description: "Retrieve a bulk run's summary along with a page of the tasks it started.",
  params: [robotIdParam, bulkRunIdParam, pageParam],
  output: [
    { key: "bulkRun", type: "object", label: "Bulk run" },
    { key: "robotTasks", type: "object", label: "Tasks (paginated)" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ result: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/bulk-runs/${
        encodeURIComponent(input.bulkRunId)
      }`,
      { query: compact({ page: input.page }) },
    );
    return body.result;
  },
};

export default bulkRunGet;
