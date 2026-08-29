import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  personId?: number;
  sentiment?: string;
  disposition?: string;
  perPage?: number;
  page?: number;
}

/** GET /v2/activities/calls — list/filter logged calls. */
const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "read",
  resource: "call",
  title: "List Calls",
  description: "List and filter logged calls.",
  params: [
    { key: "personId", label: "Person ID", type: "number" },
    { key: "sentiment", label: "Sentiment", type: "string" },
    { key: "disposition", label: "Disposition", type: "string" },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Calls" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/activities/calls", {
      query: compact({
        person_id: input.personId,
        sentiment: input.sentiment,
        disposition: input.disposition,
        per_page: input.perPage,
        page: input.page,
      }),
    });
  },
};

export default callList;
