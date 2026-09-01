import type { ActionDefinition } from "@w6w/types";
import { PendoClient } from "../lib/client.ts";

/**
 * `GET /api/v1/report/:reportId/results.json` — a saved report's rows as JSON.
 *
 * Pendo's own docs are explicit about the exclusion: "Paths, Funnels,
 * Retention, and Data Explorer reports cannot be returned with this
 * endpoint." Those report types 404 or return an unhelpful body rather than
 * rows — there is no separate endpoint for them in Pendo's published API.
 */
const action: ActionDefinition = {
  key: "report-results",
  type: "read",
  resource: "report",
  title: "Get Report Results",
  description:
    "Return a saved report's rows as JSON. Paths, Funnels, Retention, and Data Explorer " +
    "reports are NOT supported by this endpoint — Pendo publishes no API for those.",
  params: [
    {
      key: "reportId",
      label: "Report ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "results", type: "array", label: "Rows" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.reportId) throw new Error("`reportId` is required");
    const client = new PendoClient(ctx);
    const results = await client.api<unknown[]>(
      `/api/v1/report/${encodeURIComponent(String(p.reportId))}/results.json`,
    );
    return { results };
  },
};

export default action;
