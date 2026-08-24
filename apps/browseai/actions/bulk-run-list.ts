import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient, compact } from "../lib/client.ts";
import { pageParam, robotIdParam } from "../lib/params.ts";

/** `GET /v2/robots/{robotId}/bulk-runs` — a robot's bulk-run history. */
interface Input {
  robotId: string;
  page?: number;
}

interface Output {
  totalCount: number;
  pageNumber: number;
  hasMore: boolean;
  items: unknown[];
}

const bulkRunList: ActionDefinition<Input, Output> = {
  key: "bulk-run-list",
  type: "search",
  resource: "bulk-run",
  title: "List Bulk Runs",
  description: "List a robot's bulk runs.",
  params: [robotIdParam, pageParam],
  output: [
    { key: "totalCount", type: "number", label: "Total bulk runs" },
    { key: "pageNumber", type: "number", label: "Current page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "items", type: "array", label: "Bulk runs" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ result: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/bulk-runs`,
      { query: compact({ page: input.page }) },
    );
    return body.result;
  },
};

export default bulkRunList;
