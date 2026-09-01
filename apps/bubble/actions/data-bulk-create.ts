import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, formatTypeName, parseJson } from "../lib/client.ts";
import { TYPE_PARAM } from "../lib/params.ts";

interface Input {
  type: string;
  records: string | Record<string, unknown>[];
}

interface BulkResult {
  status: string;
  id?: string;
  message?: string;
}

/**
 * `POST /obj/{type}/bulk` — verified against
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests`.
 *
 * Create up to 1,000 things in one call. Bubble's own wire format is
 * `text/plain`, one JSON object per line (**not** a JSON array) — this action
 * takes a normal JSON array and does that conversion, and un-does it on the
 * way back: the response is also one JSON line per input record, in order,
 * each with its own `status`, so one malformed row does not fail the rest.
 * A request over 4 minutes times out; unprocessed rows come back marked as
 * errors.
 */
const action: ActionDefinition<Input, BulkResult[]> = {
  key: "data-bulk-create",
  type: "perform",
  resource: "data",
  title: "Bulk Create Things",
  description: "Create up to 1,000 records of a Data Type in one call.",
  idempotent: false,
  params: [
    TYPE_PARAM,
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint:
        'JSON array of field objects, e.g. `[{"Unit name": "Unit A"}, {"Unit name": "Unit B"}]`. ' +
        "Maximum 1,000 records per call.",
    },
  ],
  output: [
    { key: "status", label: "Status", type: "string" },
    { key: "id", label: "Unique ID", type: "string" },
    { key: "message", label: "Error Message", type: "string" },
  ],

  async execute(input, ctx) {
    const type = formatTypeName(input.type);
    const records = parseJson(input.records, "records");
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("`records` must be a non-empty JSON array");
    }
    if (records.length > 1000) {
      throw new Error(`\`records\` has ${records.length} items — Bubble's bulk limit is 1,000`);
    }
    const lines = records.map((r) => {
      if (!r || typeof r !== "object" || Array.isArray(r)) {
        throw new Error("every item in `records` must be a JSON object");
      }
      return JSON.stringify(r);
    }).join("\n");

    const client = new BubbleClient(ctx);
    ctx.log("info", "bulk creating Bubble things", { type, count: records.length });
    return await client.requestBulk(`/obj/${type}/bulk`, lines);
  },
};

export default action;
