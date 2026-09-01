import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

/** `POST /v1/subscriptions/{id}/pause` — temporarily stop billing an active subscription. */
interface Input {
  id: string;
  pauseAt?: "now" | "cycle_end";
}

const subscriptionPause: ActionDefinition<Input> = {
  key: "subscription-pause",
  type: "perform",
  resource: "subscription",
  title: "Pause Subscription",
  description: "Temporarily stop billing an active subscription.",
  idempotent: true,
  params: [
    subscriptionIdParam(),
    {
      key: "pauseAt",
      label: "Pause",
      type: "select",
      default: "now",
      options: [
        { value: "now", label: "Immediately" },
        { value: "cycle_end", label: "After the current cycle" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Now 'paused' on success" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(
      `/subscriptions/${encodeURIComponent(input.id)}/pause`,
      { pause_at: input.pauseAt ?? "now" },
    );
  },
};

export default subscriptionPause;
