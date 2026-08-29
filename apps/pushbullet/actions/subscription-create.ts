import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/subscriptions` — subscribe to a channel by tag.
 *
 * Unlike `create-chat`, the docs state no get-or-create behaviour for
 * resubscribing to a channel already subscribed to, so this is declared
 * non-idempotent rather than assumed safe.
 */
interface Input {
  channelTag: string;
}

const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Subscribe to a channel by its tag.",
  idempotent: false,
  params: [{ key: "channelTag", label: "Channel tag", type: "string", required: true }],
  output: [
    { key: "iden", type: "string", label: "Subscription ID" },
    { key: "channel", type: "object", label: "Channel" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json("/subscriptions", {
      method: "POST",
      body: { channel_tag: input.channelTag },
    });
  },
};

export default subscriptionCreate;
