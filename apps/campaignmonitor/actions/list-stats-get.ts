import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/lists/{listid}/stats.json` — subscriber counts for a list.
 * **List-level.**
 *
 * Twenty-four numbers: a total and five time buckets for each of active
 * subscribers, unsubscribes, deletions and bounces.
 *
 * **The time buckets are not rolling windows**, and reading them as such is the
 * usual mistake. The vendor defines them precisely, all in the *client's*
 * timezone rather than UTC:
 *
 *  - **Today** — since midnight (00:00) in the client's timezone.
 *  - **Yesterday** — the 24 hours starting from the previous day's midnight.
 *  - **This week** — since midnight on the most recent **Sunday**.
 *  - **This month** — since midnight on the 1st.
 *  - **This year** — since midnight on January 1st.
 *
 * So "this week" on a Monday morning covers about a day. `system-date-get`
 * returns the clock those boundaries are measured against.
 */
interface Input {
  listId: string;
}

const listStatsGet: ActionDefinition<Input, Record<string, number>> = {
  key: "list-stats-get",
  type: "read",
  resource: "list",
  title: "Get List Stats",
  description:
    "Read a list's subscriber counts: totals plus today / yesterday / this week / month / year " +
    "buckets for new actives, unsubscribes, deletions and bounces. Buckets are calendar-aligned " +
    "in the client's timezone, not rolling windows.",
  params: [listIdParam],
  output: [
    { key: "TotalActiveSubscribers", type: "number", label: "Active subscribers" },
    { key: "TotalUnsubscribes", type: "number", label: "Unsubscribes" },
    { key: "TotalDeleted", type: "number", label: "Deleted subscribers" },
    { key: "TotalBounces", type: "number", label: "Bounces" },
    { key: "NewActiveSubscribersToday", type: "number", label: "New actives since local midnight" },
    {
      key: "NewActiveSubscribersThisWeek",
      type: "number",
      label: "New actives since the most recent Sunday",
    },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<Record<string, number>>(
      `/lists/${encodeId(input.listId)}/stats`,
    );
  },
};

export default listStatsGet;
