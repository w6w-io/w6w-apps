import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
  /** CSV: address (requires campaigns.members.address scope), campaign, currently_entitled_tiers, user, pledge_history. */
  include?: string;
  memberFields?: string;
  tierFields?: string;
  addressFields?: string;
  count?: number;
  cursor?: string;
}

const listCampaignMembers: ActionDefinition<Input> = {
  key: "list-campaign-members",
  type: "read",
  resource: "member",
  title: "List Campaign Members",
  description: "List the members (patrons) of a campaign (GET /campaigns/{campaign_id}/members). " +
    "Requires the `campaigns.members` scope; add `campaigns.members[email]` for email, " +
    "`campaigns.members.address` for the address include. Max 1000 per page (500 if " +
    "`pledge_history` is included). Cursor-paginated via `page[cursor]`.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV: address, campaign, currently_entitled_tiers, user, pledge_history",
      default: "currently_entitled_tiers",
    },
    { key: "memberFields", label: "Member fields", type: "string", hint: "CSV" },
    { key: "tierFields", label: "Tier fields", type: "string", hint: "CSV" },
    { key: "addressFields", label: "Address fields", type: "string", hint: "CSV" },
    { key: "count", label: "Page size", type: "number", hint: "page[count], max 1000" },
    {
      key: "cursor",
      label: "Page cursor",
      type: "string",
      hint: "page[cursor], from a prior response",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Members" },
    { key: "meta.pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new PatreonClient(ctx).request(
      `/campaigns/${encodeURIComponent(input.campaignId)}/members`,
      {
        query: {
          include: input.include ?? "currently_entitled_tiers",
          "fields[member]": input.memberFields,
          "fields[tier]": input.tierFields,
          "fields[address]": input.addressFields,
          "page[count]": input.count,
          "page[cursor]": input.cursor,
        },
      },
    );
  },
};

export default listCampaignMembers;
