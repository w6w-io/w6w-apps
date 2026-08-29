import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/** `DELETE /v2/subscriptions/{iden}` — unsubscribe from a channel. */
interface Input {
  iden: string;
}

const subscriptionDelete: ActionDefinition<Input> = {
  key: "subscription-delete",
  type: "perform",
  resource: "subscription",
  title: "Delete Subscription",
  description: "Unsubscribe from a channel.",
  idempotent: true,
  params: [{ key: "iden", label: "Subscription ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new PushbulletClient(ctx).status(
      `/subscriptions/${encodeURIComponent(input.iden)}`,
      { method: "DELETE" },
    );
    return { deleted: status === 200 };
  },
};

export default subscriptionDelete;
