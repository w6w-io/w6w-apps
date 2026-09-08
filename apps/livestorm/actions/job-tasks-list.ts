import type { ActionDefinition } from "@w6w/types";
import { listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  id: string;
  pageNumber?: number;
  pageSize?: number;
}

const jobTasksList: ActionDefinition<Input> = {
  key: "job-tasks-list",
  type: "search",
  resource: "job",
  title: "List Job Tasks",
  description: "List the per-item results of an async job (e.g. each bulk registration row).",
  params: [
    { key: "id", label: "Job ID", type: "string", required: true },
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
  ],
  output: [
    { key: "data", type: "array", label: "Tasks" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>(
      `/jobs/${encodeURIComponent(input.id)}/tasks`,
      { query: listQuery(input) },
    );
  },
};

export default jobTasksList;
