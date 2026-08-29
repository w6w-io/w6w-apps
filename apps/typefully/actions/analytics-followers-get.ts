import type { ActionDefinition } from "@w6w/types";
import { compact, TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  platform: string;
  startDate?: string;
  endDate?: string;
}

/**
 * `GET /v2/social-sets/{social_set_id}/analytics/{platform}/followers` —
 * daily follower counts between `startDate` and `endDate`, inclusive. Both are
 * optional: omitting `endDate` defaults to today in the social set's
 * timezone, and omitting `startDate` defaults to 29 days before whichever end
 * date applies — a totals-only 30-day series by default.
 *
 * **Currently only `x` is supported**, per the vendor's own stated limitation.
 * Date ranges over 366 days are rejected.
 */
const analyticsFollowersGet: ActionDefinition<Input> = {
  key: "analytics-followers-get",
  type: "read",
  resource: "analytics",
  title: "Get Followers Analytics",
  description: "Fetch a daily follower-count series for a platform. Currently X only.",
  params: [
    socialSetIdParam,
    {
      key: "platform",
      label: "Platform",
      type: "select",
      required: true,
      default: "x",
      options: [{ value: "x", label: "X" }],
      hint: "The vendor currently supports only x for analytics.",
    },
    {
      key: "startDate",
      label: "Start Date",
      type: "date",
      hint: "YYYY-MM-DD. Defaults to 29 days before End Date (or before today).",
    },
    {
      key: "endDate",
      label: "End Date",
      type: "date",
      hint: "YYYY-MM-DD. Defaults to today in the social set's timezone.",
    },
  ],
  output: [
    { key: "platform", type: "string", label: "Platform" },
    { key: "current_followers_count", type: "number", label: "Latest in-range follower count" },
    { key: "data", type: "array", label: "Daily {date, followers_count} points" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/analytics/${input.platform}/followers`,
      { query: compact({ start_date: input.startDate, end_date: input.endDate }) },
    );
  },
};

export default analyticsFollowersGet;
