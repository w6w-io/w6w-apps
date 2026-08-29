import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /agents` — every agent in the authenticated workspace. */
interface Input {
  cursor?: string;
  limit?: number;
}

const agentList: ActionDefinition<Input> = {
  key: "agent-list",
  type: "read",
  resource: "agent",
  title: "List Agents",
  description: "List every agent in this workspace.",
  params: paginationParams(),
  output: [
    { key: "data", type: "array", label: "Agents" },
    { key: "pagination", type: "object", label: "Cursor and hasMore for the next page" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request("/agents", { query: paginationQuery(input) });
  },
};

export default agentList;
