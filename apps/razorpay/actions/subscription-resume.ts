import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

/** `POST /v1/subscriptions/{id}/resume` — resume a paused subscription's billing. */
interface Input {
  id: string;
}

const subscriptionResume: ActionDefinition<Input> = {
  key: "subscription-resume",
  type: "perform",
  resource: "subscription",
  title: "Resume Subscription",
  description: "Resume billing on a paused subscription.",
  idempotent: true,
  params: [subscriptionIdParam()],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Now 'active' on success" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(
      `/subscriptions/${encodeURIComponent(input.id)}/resume`,
      { resume_at: "now" },
    );
  },
};

export default subscriptionResume;
