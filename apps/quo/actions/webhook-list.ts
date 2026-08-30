import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

/** `GET /v1/webhooks` — list every legacy webhook for a user (or the whole workspace). */
interface Input {
  userId?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List legacy webhooks. Not paginated.",
  params: [userIdParam],
  output: [
    {
      key: "data",
      type: "array",
      label: "Webhooks (id, userId, orgId, label, status, url, key, events, resourceIds, " +
        "createdAt, updatedAt, deletedAt)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/webhooks", { query: { userId: input.userId } });
  },
};

export default webhookList;
