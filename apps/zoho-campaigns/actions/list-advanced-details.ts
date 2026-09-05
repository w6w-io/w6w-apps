import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  filterType?: "sentcampaigns" | "scheduledcampaigns" | "recentcampaigns";
  fromindex?: number;
  range?: number;
}

interface Output {
  data: Record<string, unknown>;
}

/**
 * `GET /getlistadvanceddetails` — verified against
 * `https://www.zoho.com/campaigns/help/developers/list-advanced-details.html`.
 * The response nests several endpoint-specific sections (`local_subscribers`,
 * campaign summaries, ...) rather than one uniform shape, so this action
 * returns the parsed body as-is under `data` instead of guessing which
 * fields matter.
 */
const listAdvancedDetails: ActionDefinition<Input, Output> = {
  key: "list-advanced-details",
  type: "read",
  resource: "list",
  title: "Get Mailing List Advanced Details",
  description:
    "Get a mailing list's advanced details — contact geography and the campaigns sent, " +
    "scheduled or created against it.",
  params: [
    listKey,
    {
      key: "filterType",
      label: "Filter type",
      type: "select",
      options: [
        { value: "sentcampaigns", label: "Sent campaigns" },
        { value: "scheduledcampaigns", label: "Scheduled campaigns" },
        { value: "recentcampaigns", label: "Recent campaigns" },
      ],
    },
    { key: "fromindex", label: "From index", type: "number", default: 1 },
    { key: "range", label: "Range", type: "number" },
  ],
  output: [{ key: "data", type: "object", label: "Advanced details" }],

  async execute(input, ctx) {
    const data = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "getlistadvanceddetails",
      {
        query: {
          listkey: input.listKey,
          filtertype: input.filterType,
          fromindex: input.fromindex,
          range: input.range,
        },
      },
    );
    return { data };
  },
};

export default listAdvancedDetails;
