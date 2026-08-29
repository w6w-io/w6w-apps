import type { ActionDefinition } from "@w6w/types";
import { MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /v1/analytics/reports/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Analytics, 2026-08-29.
 *
 * Report data shape varies by what was requested, so the response is passed
 * through verbatim rather than re-typed. Missive returns an empty 404 for an
 * incomplete, expired (60 seconds after completion), or nonexistent report —
 * that surfaces as a thrown error from the shared client, since there is no
 * body to distinguish the three cases from.
 */
const action: ActionDefinition<Input> = {
  key: "analytics-report-get",
  type: "read",
  resource: "analytics",
  title: "Get Analytics Report",
  description:
    "Fetch a report's data using the ID from Create Analytics Report. Missive suggests waiting " +
    "5 seconds after creation, then retrying every 5 seconds. A completed report expires 60 " +
    "seconds after completion; an incomplete, expired, or unknown report answers an empty 404.",
  params: [
    { key: "id", label: "Report ID", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Report data (shape depends on the request)" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    return await new MissiveClient(ctx).json(
      `/analytics/reports/${encodeURIComponent(input.id)}`,
    );
  },
};

export default action;
