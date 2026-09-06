import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

/** `GET /senders` — every authorized "From" address, for use as `campaign-create`'s sender. */
const action: ActionDefinition = {
  key: "senders-list",
  type: "search",
  resource: "sender",
  title: "List senders",
  description: 'List the account\'s authorized sender ("From") addresses.',
  params: [],
  output: [
    { key: "data", type: "array", label: "Senders" },
  ],

  async execute(_input, ctx) {
    return await new SendPulseClient(ctx).bulkEmail("/senders");
  },
};

export default action;
