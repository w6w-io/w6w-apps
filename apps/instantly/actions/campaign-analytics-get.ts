import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";

/**
 * `GET /api/v2/campaigns/analytics` — per-campaign engagement counters
 * (leads, emails sent, opens, replies, link clicks, …).
 *
 * Leave both `id` and `ids` empty to get analytics for every campaign in the
 * workspace at once.
 */
interface Input {
  id?: string;
  ids?: string[] | string;
  start_date?: string;
  end_date?: string;
  exclude_total_leads_count?: boolean;
}

const campaignAnalyticsGet: ActionDefinition<Input> = {
  key: "campaign-analytics-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Analytics",
  description: "Get engagement analytics for one, several, or (leaving id/ids empty) every " +
    "campaign in the workspace.",
  params: [
    { key: "id", label: "Campaign ID", type: "string" },
    {
      key: "ids",
      label: "Campaign IDs",
      type: "array",
      item: { type: "string" },
      hint: "Several campaign IDs. Leave both this and Campaign ID empty for every campaign.",
    },
    {
      key: "start_date",
      label: "Start date",
      type: "string",
      placeholder: "2026-01-01",
      hint: "YYYY-MM-DD or a full ISO 8601 timestamp. A date-only value is UTC midnight.",
    },
    { key: "end_date", label: "End date", type: "string", placeholder: "2026-01-31" },
    {
      key: "exclude_total_leads_count",
      label: "Exclude total leads count",
      type: "boolean",
      hint: "Skip the total-leads figure, which considerably decreases response time on large " +
        "campaigns.",
    },
  ],
  output: [
    { key: "campaign_id", type: "string", label: "Campaign ID" },
    { key: "leads_count", type: "number", label: "Total leads" },
    { key: "emails_sent_count", type: "number", label: "Emails sent" },
    { key: "reply_count_unique", type: "number", label: "Unique replies" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/campaigns/analytics", {
      query: {
        id: input.id,
        ids: toList(input.ids),
        start_date: input.start_date,
        end_date: input.end_date,
        exclude_total_leads_count: input.exclude_total_leads_count,
      },
    });
  },
};

export default campaignAnalyticsGet;
