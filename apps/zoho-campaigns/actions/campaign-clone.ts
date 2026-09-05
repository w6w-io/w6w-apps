import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, ZohoCampaignsClient } from "../lib/client.ts";

interface Input {
  campaignInfo: unknown;
}

interface Output {
  data: Record<string, unknown>;
}

/**
 * `POST /json/clonecampaign` — verified against
 * `https://www.zoho.com/campaigns/help/developers/clone-campaign.html`.
 * `campaignInfo` is a generic JSON object of the internal params the vendor
 * documents (`campaignname`, `subject`, `oldcampaignkey`, `from_name`,
 * `from_add`, `reply_to`, `encode_type`) rather than a fixed param per field
 * — `oldcampaignkey` and `campaignname`/`subject` are the ones the vendor
 * marks mandatory.
 */
const campaignClone: ActionDefinition<Input, Output> = {
  key: "campaign-clone",
  type: "perform",
  resource: "campaign",
  title: "Clone Campaign",
  description:
    "Clone an existing campaign into a new draft. `oldcampaignkey`, `campaignname` and `subject` " +
    'are required, e.g. { "oldcampaignkey": "...", "campaignname": "Copy", "subject": "Copy" }.',
  idempotent: false,
  params: [
    {
      key: "campaignInfo",
      label: "Campaign info",
      type: "json",
      required: true,
      hint: 'Field name -> value, e.g. { "oldcampaignkey": "...", "campaignname": "Copy", ' +
        '"subject": "Copy", "from_name": "...", "from_add": "...", "reply_to": "..." }.',
    },
  ],
  output: [{ key: "data", type: "object", label: "Cloned campaign details" }],

  async execute(input, ctx) {
    const data = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "clonecampaign",
      {
        method: "POST",
        query: {
          campaigninfo: JSON.stringify(parseJsonParam(input.campaignInfo, "campaignInfo")),
        },
      },
    );
    return { data };
  },
};

export default campaignClone;
