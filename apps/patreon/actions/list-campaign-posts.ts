import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
  /** CSV: campaign, user. */
  include?: string;
  /** CSV of Post attributes: app_id, app_status, content, embed_data, embed_url, is_paid, is_public, published_at, tiers, title, url. */
  postFields?: string;
  count?: number;
  cursor?: string;
}

const listCampaignPosts: ActionDefinition<Input> = {
  key: "list-campaign-posts",
  type: "read",
  resource: "post",
  title: "List Campaign Posts",
  description: "List all posts on a campaign (GET /campaigns/{campaign_id}/posts). Requires the " +
    "`campaigns.posts` scope. Cursor-paginated via `page[cursor]`.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV: campaign, user",
    },
    { key: "postFields", label: "Post fields", type: "string", hint: "CSV" },
    { key: "count", label: "Page size", type: "number", hint: "page[count]" },
    {
      key: "cursor",
      label: "Page cursor",
      type: "string",
      hint: "page[cursor], from a prior response",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Posts" },
    { key: "meta.pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new PatreonClient(ctx).request(
      `/campaigns/${encodeURIComponent(input.campaignId)}/posts`,
      {
        query: {
          include: input.include,
          "fields[post]": input.postFields,
          "page[count]": input.count,
          "page[cursor]": input.cursor,
        },
      },
    );
  },
};

export default listCampaignPosts;
