import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/leads_lists/{id}` — fetch a single leads list, with its leads
 * embedded and paginated via the same `limit`/`offset`. Free.
 */
interface Input {
  id: number;
  limit?: number;
  offset?: number;
}

const leadsListGet: ActionDefinition<Input> = {
  key: "leads-list-get",
  type: "read",
  resource: "leads-list",
  title: "Get Leads List",
  description: "Fetch a leads list by ID, with its leads embedded. Free.",
  params: [
    { key: "id", label: "Leads list ID", type: "number", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      hint: "1–100 leads embedded per page. Default 20.",
    },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "data", type: "object", label: "id, name, type, leads_count, leads[]" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request(`/leads_lists/${encodeURIComponent(String(input.id))}`, {
      query: compact({ limit: input.limit, offset: input.offset }),
    });
  },
};

export default leadsListGet;
