import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { OFFSET_PARAMS } from "../lib/params.ts";

/**
 * `GET /rest/asset/v1/smartCampaigns.json` — verified against
 * `smart-campaigns.md` ("Browse"). Asset API, offset-paged (`maxReturn`
 * default 20, max 200; `offset` default 0) rather than the token-based
 * paging the Lead Database endpoints use.
 */
const action: ActionDefinition = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List smart campaigns",
  description: "Browse smart campaigns, optionally filtered to only active trigger campaigns.",
  params: [
    {
      key: "isActive",
      label: "Active Trigger Campaigns Only",
      type: "boolean",
      hint: "Leave off to list every campaign regardless of type or activation state.",
    },
    ...OFFSET_PARAMS,
  ],
  output: [{ key: "id", type: "number", label: "ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    ctx.log("info", "listing Marketo smart campaigns");

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(
      "/smartCampaigns.json",
      {
        asset: true,
        query: {
          isActive: typeof p.isActive === "boolean" ? p.isActive : undefined,
          maxReturn: Number(p.maxReturn ?? 20),
          offset: Number(p.offset ?? 0),
        },
      },
    );
    return res.result ?? [];
  },
};

export default action;
