import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /campaigns/trigger/send` — verified against the fetched spec. Sends
 * an API-triggered campaign to an `audience` filter and/or explicit
 * `recipients`. Re-sending delivers the message again, so this is not
 * idempotent even though `ctx.invocation.invocationId` can be passed as
 * `send_id` to let Braze's own analytics correlate retries.
 */
const action: ActionDefinition = {
  key: "campaign-trigger-send",
  type: "perform",
  resource: "campaign",
  title: "Trigger Campaign Send",
  description: "Send an API-triggered campaign to an audience and/or explicit recipients.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    {
      key: "sendId",
      label: "Send ID",
      type: "string",
      hint: "Defaults to the invocation ID so Braze's analytics can correlate this send.",
    },
    {
      key: "triggerProperties",
      label: "Trigger Properties",
      type: "json",
      hint: "Personalization values referenced by the campaign's Liquid templates.",
    },
    { key: "broadcast", label: "Broadcast (no audience/recipients)", type: "boolean" },
    {
      key: "audience",
      label: "Audience Filter",
      type: "json",
      hint: "Braze connected-audience filter object (AND/OR of attribute/segment conditions).",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      hint: "Array of { external_user_id | user_alias, trigger_properties? }.",
    },
  ],
  output: [
    { key: "dispatchId", type: "string", label: "Dispatch ID" },
  ],

  async execute(input, ctx) {
    const p = input as {
      campaignId: string;
      sendId?: string;
      triggerProperties?: unknown;
      broadcast?: boolean;
      audience?: unknown;
      recipients?: unknown;
    };
    ctx.log("info", "triggering Braze campaign send", { campaignId: p.campaignId });
    return await new BrazeClient(ctx).post("/campaigns/trigger/send", {
      campaign_id: p.campaignId,
      send_id: p.sendId || ctx.invocation?.invocationId || undefined,
      trigger_properties: p.triggerProperties ?? undefined,
      broadcast: p.broadcast ?? undefined,
      audience: p.audience ?? undefined,
      recipients: p.recipients ?? undefined,
    });
  },
};

export default action;
