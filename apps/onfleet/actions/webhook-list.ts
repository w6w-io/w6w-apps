import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/**
 * `GET /webhooks` — every webhook on the organization, with its delivery
 * `count` and whether it has been auto-disabled.
 *
 * Onfleet disables a webhook (`isEnabled: false`) after 300 consecutive
 * failed deliveries — a workflow polling this is a cheap way to notice a
 * dead endpoint before support does.
 */
const action: ActionDefinition = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List webhooks",
  description: "List every registered webhook. `isEnabled: false` means 300+ consecutive " +
    "delivery failures auto-disabled it.",
  params: [],
  output: [{ key: "webhooks", type: "array", label: "Webhooks" }],

  async execute(_input, ctx) {
    const webhooks = await new OnfleetClient(ctx).request<unknown[]>("/webhooks");
    return { webhooks: webhooks ?? [] };
  },
};

export default action;
