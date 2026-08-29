import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/** `POST /v2/subscriptions/{iden}` — the only documented field is `muted`. */
interface Input {
  iden: string;
  muted: boolean;
}

const subscriptionUpdate: ActionDefinition<Input> = {
  key: "subscription-update",
  type: "perform",
  resource: "subscription",
  title: "Update Subscription",
  description: "Mute or unmute a channel subscription.",
  idempotent: true,
  params: [
    { key: "iden", label: "Subscription ID", type: "string", required: true },
    { key: "muted", label: "Muted", type: "boolean", required: true, default: true },
  ],
  output: [
    { key: "iden", type: "string", label: "Subscription ID" },
    { key: "muted", type: "boolean", label: "Muted" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json(
      `/subscriptions/${encodeURIComponent(input.iden)}`,
      {
        method: "POST",
        body: { muted: input.muted },
      },
    );
  },
};

export default subscriptionUpdate;
