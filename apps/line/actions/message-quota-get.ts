import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";

/**
 * `GET /v2/bot/message/quota` — this month's configured target limit for sending messages
 * (`type: "none"` when no ceiling is configured, `"limited"` with a `value` otherwise). Also the
 * source of one half of `health/quota.ts` — see that file for how it is combined with
 * `message-quota-consumption-get`'s `totalUsage` into a headroom reading.
 */
const messageQuotaGet: ActionDefinition = {
  key: "message-quota-get",
  type: "read",
  resource: "quota",
  title: "Get Message Quota",
  description: "Get this month's configured message-sending limit, if one is set.",
  output: [
    { key: "type", type: "string", label: "none (unmetered) or limited" },
    { key: "value", type: "number", label: "The limit, when type is limited" },
  ],

  execute(_input, ctx) {
    return new LineClient(ctx).json("/v2/bot/message/quota");
  },
};

export default messageQuotaGet;
