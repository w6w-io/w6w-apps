import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { CAMPAIGN_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /rest/asset/v1/smartCampaign/{id}.json` — verified against
 * `smart-campaigns.md` ("By Id"). Smart Campaign metadata lives on the
 * **Asset API** (`/rest/asset/v1`), a different path prefix from the Lead
 * Database API (`/rest/v1`) every other action in this app calls, though
 * both share the same instance base URL.
 */
const action: ActionDefinition = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get a smart campaign",
  description: "Get a single smart campaign by its ID.",
  params: [CAMPAIGN_ID_PARAM],
  output: [{ key: "id", type: "number", label: "ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.campaignId);
    if (!Number.isFinite(id)) throw new Error("`campaignId` must be a number");

    ctx.log("info", "getting a Marketo smart campaign", { id });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(
      `/smartCampaign/${id}.json`,
      { asset: true },
    );
    return res.result?.[0] ?? null;
  },
};

export default action;
