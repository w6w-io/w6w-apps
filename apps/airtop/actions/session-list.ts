import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact, csv } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

const statusOptions = [
  { value: "awaitingCapacity", label: "Awaiting capacity" },
  { value: "initializing", label: "Initializing" },
  { value: "running", label: "Running" },
  { value: "ended", label: "Ended" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

/** `GET /v1/sessions` — list sessions, optionally filtered by id or status. */
interface Input {
  sessionIds?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const sessionList: ActionDefinition<Input> = {
  key: "session-list",
  type: "read",
  resource: "session",
  title: "List Sessions",
  description: "List sessions, optionally filtered by ID or status.",
  params: [
    {
      key: "sessionIds",
      label: "Session IDs",
      type: "string",
      hint: "Comma-separated list of session IDs to retrieve. Leave empty for all.",
    },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    ...paginationParams(10),
  ],
  output: [
    { key: "sessions", type: "array", label: "Sessions" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new AirtopClient(ctx).data("/v1/sessions", {
      query: compact({
        sessionIds: csv(input.sessionIds),
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      }),
    });
  },
};

export default sessionList;
