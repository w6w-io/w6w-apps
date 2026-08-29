import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, type InstantlyListPage } from "../lib/client.ts";
import { campaignStatusOptions, paginationParams } from "../lib/params.ts";

/**
 * `GET /api/v2/campaigns` — list the workspace's campaigns.
 *
 * `status` and `exclude_status` share Campaign's status enum (see
 * `lib/params.ts`); AI Sales Agent-managed campaigns are excluded from the
 * result by default, matching the vendor's own default.
 */
interface Input {
  search?: string;
  status?: number;
  exclude_status?: number;
  tag_ids?: string;
  ai_sales_agent_id?: string;
  include_ai_sales_agent_campaigns?: boolean;
  limit?: number;
  starting_after?: string;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns in the workspace, newest first, with optional name search and " +
    "status filters.",
  params: [
    { key: "search", label: "Search by name", type: "string" },
    { key: "status", label: "Status", type: "select", options: campaignStatusOptions },
    {
      key: "exclude_status",
      label: "Exclude status",
      type: "select",
      options: campaignStatusOptions,
    },
    {
      key: "tag_ids",
      label: "Tag IDs",
      type: "string",
      hint: "Comma-separated tag IDs. Returns campaigns with ANY of these tags.",
    },
    {
      key: "ai_sales_agent_id",
      label: "AI Sales Agent ID",
      type: "string",
      hint: "Only campaigns created by this AI Sales Agent.",
    },
    {
      key: "include_ai_sales_agent_campaigns",
      label: "Include AI Sales Agent campaigns",
      type: "boolean",
      hint: "Off by default, matching the API: campaigns managed by an AI Sales Agent are " +
        "excluded unless this is turned on.",
    },
    ...paginationParams(20),
  ],
  output: [
    { key: "items", type: "array", label: "Campaigns" },
    { key: "next_starting_after", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json<InstantlyListPage<unknown>>("/campaigns", {
      query: {
        search: input.search,
        status: input.status,
        exclude_status: input.exclude_status,
        tag_ids: input.tag_ids,
        ai_sales_agent_id: input.ai_sales_agent_id,
        include_ai_sales_agent_campaigns: input.include_ai_sales_agent_campaigns,
        limit: input.limit,
        starting_after: input.starting_after,
      },
    });
  },
};

export default campaignList;
