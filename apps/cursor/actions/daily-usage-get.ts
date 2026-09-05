import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";
import { dateRangeParams } from "../lib/params.ts";

interface Input {
  startDate: number;
  endDate: number;
  page?: number;
  pageSize?: number;
}

/**
 * `POST /teams/daily-usage-data` — per-user, per-day AI usage metrics (lines
 * added/accepted, Tab/Composer/Chat/Agent request counts, most-used model…).
 *
 * Rate limited to 20 requests/minute per team. Data is aggregated hourly —
 * the doc recommends polling at most once per hour.
 *
 * ## One endpoint, two response shapes
 *
 * This is the one action in this app where the vendor's own examples show the
 * response shape changing based on which params are present, not just its
 * contents:
 *
 *  - **Neither `page` nor `pageSize` set:** returns only users **active**
 *    during the range, no `pagination` field, no `isActive` field (every row
 *    is active by construction).
 *  - **Both set:** returns **every** team member with a membership during the
 *    range (including inactive ones, `totalLinesAdded: 0` etc.), plus an
 *    `isActive` field per row and a `pagination` envelope.
 *
 * So `page`/`pageSize` are only sent when the caller actually set at least one
 * of them — sending `page` alone without `pageSize` (or vice versa) is not a
 * documented combination, so both are required together here.
 */
const dailyUsageGet: ActionDefinition<Input> = {
  key: "daily-usage-get",
  type: "read",
  resource: "usage",
  title: "Get Daily Usage Data",
  description:
    "Retrieve daily usage metrics for your team. Without page/page size, returns only users " +
    "active during the range. With both set, returns every team member with a membership " +
    "during the range, paginated.",
  params: [
    ...dateRangeParams(),
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-indexed. Set together with Page size to get ALL team members (paginated) instead " +
        "of only active ones.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Number of users per page. Set together with Page.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Per-user, per-day usage rows" },
    { key: "period", type: "object", label: "Start and end of the requested range" },
    { key: "pagination", type: "object", label: "Pagination info (only when paginated)" },
  ],

  execute(input, ctx) {
    const paginated = input.page !== undefined && input.pageSize !== undefined;
    return new CursorClient(ctx).post("/teams/daily-usage-data", {
      startDate: input.startDate,
      endDate: input.endDate,
      ...(paginated ? { page: input.page, pageSize: input.pageSize } : {}),
    });
  },
};

export default dailyUsageGet;
