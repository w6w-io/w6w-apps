import type { ActionDefinition } from "@w6w/types";
import { json, PendoClient } from "../lib/client.ts";

/**
 * `POST /api/v1/aggregation` — run a Pendo Aggregation pipeline.
 *
 * Aggregations are the query language almost every built-in Pendo report is
 * built from: sources (events, visitors, accounts, pages, features, …)
 * piped through operators (`filter`, `reduce`, `identified`, `sort`, …).
 * Pendo's own docs are explicit that this is **not a bulk export feature** —
 * a single call is capped at a 5-minute runtime or 4 GB of output. Breaking
 * a wide query into smaller time ranges is Pendo's own recommendation for
 * anything that risks either limit.
 */
const action: ActionDefinition = {
  key: "run-aggregation",
  type: "search",
  resource: "aggregation",
  title: "Run Aggregation",
  description:
    "Run a Pendo Aggregation pipeline — the query language behind Pendo's own reports. NOT a " +
    "bulk export tool: a single call is capped at a 5-minute runtime or 4 GB of output.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "A label for this query, echoed back by Pendo for your own reference.",
    },
    {
      key: "pipeline",
      label: "Pipeline",
      type: "json",
      required: true,
      hint: 'The pipeline stages as a JSON array, e.g. [{"source":{"events":null,' +
        '"timeSeries":{"period":"dayRange","first":"now()","count":1}}},' +
        '{"identified":"visitorId"},{"reduce":[{"totalEvents":{"sum":"numEvents"}}]}]. ' +
        "See Pendo's Aggregations documentation for the full source/operator vocabulary.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Result rows" },
    { key: "startTime", type: "number", label: "Start of the time range Pendo evaluated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pipeline = json(p.pipeline, "pipeline");
    if (!Array.isArray(pipeline) || pipeline.length === 0) {
      throw new Error("`pipeline` must be a non-empty JSON array of pipeline stages");
    }

    const client = new PendoClient(ctx);
    const response = await client.api<{ startTime?: number; results?: unknown[] }>(
      "/api/v1/aggregation",
      {
        method: "POST",
        body: {
          response: { mimeType: "application/json" },
          request: {
            name: p.name || undefined,
            pipeline,
          },
        },
      },
    );

    return { results: response?.results ?? [], startTime: response?.startTime };
  },
};

export default action;
