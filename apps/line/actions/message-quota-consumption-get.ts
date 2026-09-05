import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";

/**
 * `GET /v2/bot/message/quota/consumption` — messages sent so far this month. LINE's own note:
 * "approximate" — for a billing-accurate count, use LINE Official Account Manager instead.
 */
const messageQuotaConsumptionGet: ActionDefinition = {
  key: "message-quota-consumption-get",
  type: "read",
  resource: "quota",
  title: "Get Message Quota Consumption",
  description: "Get the (approximate) number of messages sent so far this month.",
  output: [
    { key: "totalUsage", type: "number", label: "Messages sent this month" },
  ],

  execute(_input, ctx) {
    return new LineClient(ctx).json("/v2/bot/message/quota/consumption");
  },
};

export default messageQuotaConsumptionGet;
