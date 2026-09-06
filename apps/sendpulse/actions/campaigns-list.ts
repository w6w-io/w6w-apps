import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/** `GET /campaigns` — campaign history: id, name and status for each. */
const action: ActionDefinition<Input> = {
  key: "campaigns-list",
  type: "search",
  resource: "campaign",
  title: "List campaigns",
  description: "List past and scheduled campaigns.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "data", type: "array", label: "Campaigns" },
  ],

  async execute(input, ctx) {
    const query = compact({ limit: input.limit ?? 100, offset: input.offset ?? 0 });
    return await new SendPulseClient(ctx).bulkEmail("/campaigns", { query });
  },
};

export default action;
