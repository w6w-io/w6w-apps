import type { ActionDefinition } from "@w6w/types";
import { compact, RetellClient } from "../lib/client.ts";
import { paginationParams, sortOrderParam } from "../lib/params.ts";

/**
 * `POST /v2/list-agents` — list agents, paginated.
 *
 * A genuine split, verified against the OpenAPI document's `parameters` vs
 * `requestBody`: `limit`, `sort_order` and `pagination_key` are QUERY
 * parameters even though this is a POST, while the `filter_criteria` (by
 * channel) lives in the JSON body. `v3/list-calls` puts everything in the
 * body instead — see `lib/client.ts` for the full picture across this API's
 * list endpoints.
 */
interface Input {
  channel?: "voice" | "chat";
  sortOrder?: "ascending" | "descending";
  limit?: number;
  paginationKey?: string;
}

interface AgentListItem {
  agent_id: string;
  agent_name: string;
  channel: string;
  user_modified_timestamp: number;
  [key: string]: unknown;
}

interface Output {
  items: AgentListItem[];
  has_more?: boolean;
  pagination_key?: string;
}

const listAgents: ActionDefinition<Input, Output> = {
  key: "list-agents",
  type: "search",
  resource: "agent",
  title: "List Agents",
  description: "List voice or chat agents in the workspace, paginated.",
  params: [
    {
      key: "channel",
      label: "Channel",
      type: "select",
      options: [
        { value: "voice", label: "Voice" },
        { value: "chat", label: "Chat" },
      ],
      hint: "Leave empty for every channel.",
    },
    sortOrderParam,
    ...paginationParams(50, "Vendor default is 50, maximum is 1000."),
  ],
  output: [
    { key: "items", type: "array", label: "Agents" },
    { key: "has_more", type: "boolean", label: "More results available" },
    { key: "pagination_key", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new RetellClient(ctx).request<Output>("/v2/list-agents", {
      method: "POST",
      query: compact({
        limit: input.limit,
        sort_order: input.sortOrder,
        pagination_key: input.paginationKey,
      }),
      body: input.channel
        ? { filter_criteria: { channel: { type: "string", op: "eq", value: input.channel } } }
        : {},
    });
  },
};

export default listAgents;
