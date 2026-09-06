import type { ActionDefinition } from "@w6w/types";
import { listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";
import { SESSION_FILTER_PARAMS, sessionFilters } from "../lib/sessions.ts";
import type { SessionFilterInput } from "../lib/sessions.ts";

interface Input extends SessionFilterInput {
  pageNumber?: number;
  pageSize?: number;
}

const sessionList: ActionDefinition<Input> = {
  key: "session-list",
  type: "search",
  resource: "session",
  title: "List Sessions",
  description: "List sessions across your whole workspace.",
  params: [
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    ...SESSION_FILTER_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Sessions" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>("/sessions", {
      query: { ...listQuery(input), ...sessionFilters(input) },
    });
  },
};

export default sessionList;
