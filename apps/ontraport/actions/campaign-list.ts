import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { type CollectionInput, collectionParams, collectionQuery } from "../lib/params.ts";

/**
 * `GET /1/CampaignBuilderItems` — Ontraport's automations ("Campaign" in the
 * API; the Ontraport app itself calls the same thing an "automation").
 *
 * Read-only: the Accessible Objects table grants only GET for both Campaign
 * (75) and Campaign Builder (140) — campaigns are built in the Ontraport
 * editor, not through this API.
 */
type Input = CollectionInput;

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns (automations) — read-only; campaigns are built in the Ontraport " +
    "editor, not through the API.",
  params: collectionParams,
  output: [{ key: "items", type: "array", label: "Campaigns" }],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/CampaignBuilderItems", {
      query: collectionQuery(input),
    });
    return { items, count };
  },
};

export default campaignList;
