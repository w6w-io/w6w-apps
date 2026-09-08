import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/** `GET /addressbooks` — every mailing list, with subscriber counts and status. */
const action: ActionDefinition<Input> = {
  key: "mailing-lists-list",
  type: "search",
  resource: "mailing-list",
  title: "List mailing lists",
  description: "List the account's mailing lists.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Maximum 100." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "data", type: "array", label: "Mailing lists" },
  ],

  async execute(input, ctx) {
    const query = compact({ limit: input.limit ?? 100, offset: input.offset ?? 0 });
    return await new SendPulseClient(ctx).bulkEmail("/addressbooks", { query });
  },
};

export default action;
