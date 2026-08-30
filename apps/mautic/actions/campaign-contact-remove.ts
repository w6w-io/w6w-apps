import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CAMPAIGN_ID_PARAM, CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /campaigns/{campaignId}/contact/{contactId}/remove` — verified
 * against Mautic's REST API docs (`campaigns.html`, "Remove Contact from a
 * Campaign").
 */
const action: ActionDefinition = {
  key: "campaign-contact-remove",
  type: "perform",
  resource: "campaign",
  title: "Remove a contact from a campaign",
  description: "Manually remove a contact from a campaign.",
  idempotent: true,
  params: [CAMPAIGN_ID_PARAM, CONTACT_ID_PARAM],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const campaignId = Number(p.campaignId);
    const contactId = Number(p.contactId);
    if (!Number.isFinite(campaignId)) throw new Error("`campaignId` must be a number");
    if (!Number.isFinite(contactId)) throw new Error("`contactId` must be a number");

    ctx.log("info", "removing a contact from a Mautic campaign", { campaignId, contactId });

    return await new MauticClient(ctx).request(
      `/campaigns/${campaignId}/contact/${contactId}/remove`,
      { method: "POST" },
    );
  },
};

export default action;
