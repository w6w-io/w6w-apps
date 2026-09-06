import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

/** `GET /balance` — the account's overall balance and currency. */
const action: ActionDefinition = {
  key: "balance-get",
  type: "read",
  resource: "balance",
  title: "Get account balance",
  description: "Get the account's current balance and currency.",
  params: [],
  output: [
    { key: "currency", type: "string", label: "Currency" },
    { key: "balance_currency", type: "number", label: "Balance" },
  ],

  async execute(_input, ctx) {
    return await new SendPulseClient(ctx).bulkEmail("/balance");
  },
};

export default action;
