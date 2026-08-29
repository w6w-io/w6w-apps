import type { ActionDefinition } from "@w6w/types";
import { compact, OnfleetClient } from "../lib/client.ts";
import { triggerParam } from "../lib/webhook-triggers.ts";

/**
 * `POST /webhooks` — register a URL Onfleet will `POST` to on the chosen
 * trigger.
 *
 * The URL must be HTTPS with a valid certificate. `taskEta`, `taskArrival`
 * and `taskDelayed` require `threshold` (seconds for eta/delay, meters for
 * arrival) and are capped at 10 webhooks each.
 */
const action: ActionDefinition = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create webhook",
  description: "Register an HTTPS URL to receive Onfleet events for the chosen trigger.",
  idempotent: false,
  params: [
    { key: "url", label: "URL", type: "string", required: true, hint: "Must be HTTPS." },
    { key: "name", label: "Name", type: "string", default: "" },
    triggerParam(true),
    {
      key: "threshold",
      label: "Threshold",
      type: "number",
      default: "",
      hint: "Seconds for taskEta/taskDelayed, meters for taskArrival.",
    },
    {
      key: "canReceiveConnectionEvents",
      label: "Include connected organizations' tasks",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "trigger", type: "number", label: "Trigger" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.url) throw new Error("`url` is required");
    if (p.trigger === undefined || p.trigger === null || p.trigger === "") {
      throw new Error("`trigger` is required");
    }

    const webhook = await new OnfleetClient(ctx).request<{ id?: string }>("/webhooks", {
      method: "POST",
      body: compact({
        url: p.url,
        name: p.name,
        trigger: Number(p.trigger),
        threshold: p.threshold,
        canReceiveConnectionEvents: p.canReceiveConnectionEvents === true ? true : undefined,
      }),
    });

    ctx.log("info", "created an Onfleet webhook", { webhookId: webhook?.id, url: p.url });
    return webhook;
  },
};

export default action;
