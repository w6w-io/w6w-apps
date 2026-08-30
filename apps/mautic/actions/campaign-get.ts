import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CAMPAIGN_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /campaigns/{id}` — verified against Mautic's REST API docs
 * (`campaigns.html`, "Get Campaign").
 */
const action: ActionDefinition = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get a campaign",
  description: "Retrieve a single campaign by ID, including its events.",
  params: [CAMPAIGN_ID_PARAM],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.campaignId);
    if (!Number.isFinite(id)) throw new Error("`campaignId` must be a number");

    ctx.log("info", "getting a Mautic campaign", { id });

    const body = await new MauticClient(ctx).request<{ campaign: unknown }>(`/campaigns/${id}`);
    return body.campaign;
  },
};

export default action;
