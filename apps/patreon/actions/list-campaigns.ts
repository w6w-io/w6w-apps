import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  /** CSV, e.g. "tiers,creator,benefits,goals" — the only top-level includes this endpoint supports. */
  include?: string;
  campaignFields?: string;
  tierFields?: string;
  count?: number;
  cursor?: string;
}

const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns owned by the authorized user (GET /campaigns). Requires the " +
    "`campaigns` scope. Cursor-paginated: pass back `cursor` from a previous call's " +
    "`meta.pagination.cursors.next` to fetch the next page.",
  params: [
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV: tiers, creator, benefits, goals",
    },
    { key: "campaignFields", label: "Campaign fields", type: "string", hint: "CSV" },
    { key: "tierFields", label: "Tier fields", type: "string", hint: "CSV" },
    { key: "count", label: "Page size", type: "number", hint: "page[count], max 1000" },
    {
      key: "cursor",
      label: "Page cursor",
      type: "string",
      hint: "page[cursor], from a prior response",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Campaigns" },
    { key: "meta.pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new PatreonClient(ctx).request("/campaigns", {
      query: {
        include: input.include,
        "fields[campaign]": input.campaignFields,
        "fields[tier]": input.tierFields,
        "page[count]": input.count,
        "page[cursor]": input.cursor,
      },
    });
  },
};

export default listCampaigns;
