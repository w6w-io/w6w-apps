import type { ActionDefinition } from "@w6w/types";
import { KintoneClient, parseJson } from "../lib/client.ts";
import { APP_ID_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  records: unknown;
}

interface AddRecordsResponse {
  ids: string[];
  revisions: string[];
}

/**
 * `POST /k/v1/records.json` — verified against
 * `docs/kintone/rest-api/records/add-records` 2026-09-05.
 *
 * Adds up to 100 records in one call, in the order given — response `ids[]`
 * and `revisions[]` line up with that same order. All-or-nothing: if any
 * record in the batch fails, Kintone adds none of them.
 *
 * **Not idempotent** — no client-supplied idempotency key exists on this
 * endpoint either.
 */
const action: ActionDefinition<Input, AddRecordsResponse> = {
  key: "records-add",
  type: "perform",
  resource: "record",
  title: "Add Records (Bulk)",
  description: "Create up to 100 records in one call.",
  idempotent: false,
  params: [
    APP_ID_PARAM,
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: 'JSON array of field-value objects, Kintone\'s own shape — `[{"Text": {"value": ' +
        '"Sample001"}}, {"Text": {"value": "Sample002"}}]`. Up to 100 entries per call.',
    },
  ],
  output: [
    { key: "ids", label: "Record IDs", type: "array" },
    { key: "revisions", label: "Revisions", type: "array" },
  ],

  async execute(input, ctx) {
    const records = parseJson(input.records, "records");
    if (!Array.isArray(records)) throw new Error("`records` must be a JSON array");
    if (records.length > 100) throw new Error("Kintone accepts at most 100 records per call");
    ctx.log("info", "adding Kintone records (bulk)", { appId: input.appId, count: records.length });
    return await new KintoneClient(ctx).request<AddRecordsResponse>("/records", {
      method: "POST",
      json: { app: input.appId, records },
    });
  },
};

export default action;
