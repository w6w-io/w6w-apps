import type { ActionDefinition } from "@w6w/types";
import { listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";
import { SESSION_FILTER_PARAMS, sessionFilters } from "../lib/sessions.ts";
import type { SessionFilterInput } from "../lib/sessions.ts";

interface Input extends SessionFilterInput {
  id: string;
  pageNumber?: number;
  pageSize?: number;
  include?: string;
}

const eventSessionList: ActionDefinition<Input> = {
  key: "event-session-list",
  type: "search",
  resource: "event",
  title: "List Event Sessions",
  description: "List the sessions (individual occurrences) that belong to an event.",
  params: [
    { key: "id", label: "Event ID", type: "string", required: true },
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    ...SESSION_FILTER_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Sessions" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>(
      `/events/${encodeURIComponent(input.id)}/sessions`,
      { query: { ...listQuery(input), ...sessionFilters(input) } },
    );
  },
};

export default eventSessionList;
