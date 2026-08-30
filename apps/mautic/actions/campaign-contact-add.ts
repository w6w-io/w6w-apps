import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { CAMPAIGN_ID_PARAM, CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /campaigns/{campaignId}/contact/{contactId}/add` — verified against
 * Mautic's REST API docs (`campaigns.html`, "Add Contact to a Campaign").
 * Manually adding a contact to a campaign this way starts it at the
 * campaign's entry point, the same as Mautic's own UI action.
 */
const action: ActionDefinition = {
  key: "campaign-contact-add",
  type: "perform",
  resource: "campaign",
  title: "Add a contact to a campaign",
  description: "Manually add a contact to a campaign.",
  idempotent: true,
  params: [CAMPAIGN_ID_PARAM, CONTACT_ID_PARAM],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const campaignId = Number(p.campaignId);
    const contactId = Number(p.contactId);
    if (!Number.isFinite(campaignId)) throw new Error("`campaignId` must be a number");
    if (!Number.isFinite(contactId)) throw new Error("`contactId` must be a number");

    ctx.log("info", "adding a contact to a Mautic campaign", { campaignId, contactId });

    return await new MauticClient(ctx).request(
      `/campaigns/${campaignId}/contact/${contactId}/add`,
      { method: "POST" },
    );
  },
};

export default action;
