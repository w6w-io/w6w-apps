import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/helpdesk/tickets/search` — free-text search over
 * ticket messages, ranked by relevance. Results are capped and NOT
 * paginated (`pagination.cursor` stays null; `hasMore` only says whether
 * refining the query would surface more).
 */
interface Input {
  agentId: string;
  query: string;
  limit?: number;
}

const ticketSearch: ActionDefinition<Input> = {
  key: "ticket-search",
  type: "search",
  resource: "ticket",
  title: "Search Tickets",
  description: "Free-text search over ticket messages, ranked by relevance. Not paginated.",
  params: [
    agentIdParam,
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      validation: { maxLength: 512 },
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 50 },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Matching tickets, ranked by relevance" },
    { key: "pagination", type: "object", label: "hasMore only — cursor is always null" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/helpdesk/tickets/search`,
      { method: "POST", body: { query: input.query, limit: input.limit } },
    );
  },
};

export default ticketSearch;
