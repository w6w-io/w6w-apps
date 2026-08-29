import type { ActionDefinition } from "@w6w/types";
import { compact, OnfleetClient } from "../lib/client.ts";
import { triggerParam } from "../lib/webhook-triggers.ts";

/** `PUT /webhooks/:id` — update a webhook's URL, trigger or settings. */
const action: ActionDefinition = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update webhook",
  description: "Update a webhook's URL, trigger, threshold or connection-events setting.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "url", label: "URL", type: "string", default: "", hint: "Must be HTTPS." },
    { key: "name", label: "Name", type: "string", default: "" },
    triggerParam(false),
    { key: "threshold", label: "Threshold", type: "number", default: "" },
    {
      key: "canReceiveConnectionEvents",
      label: "Include connected organizations' tasks",
      type: "boolean",
      default: "",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Webhook ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { webhookId } = p as { webhookId: string };
    if (!webhookId) throw new Error("`webhookId` is required");

    const body = compact({
      url: p.url,
      name: p.name,
      trigger: p.trigger !== undefined && p.trigger !== "" ? Number(p.trigger) : undefined,
      threshold: p.threshold,
      canReceiveConnectionEvents: typeof p.canReceiveConnectionEvents === "boolean"
        ? p.canReceiveConnectionEvents
        : undefined,
    });
    if (Object.keys(body).length === 0) throw new Error("no fields to update were provided");

    return await new OnfleetClient(ctx).request(`/webhooks/${encodeURIComponent(webhookId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
