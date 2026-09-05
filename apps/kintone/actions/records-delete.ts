import type { ActionDefinition } from "@w6w/types";
import { compact, KintoneClient, parseJson } from "../lib/client.ts";
import { APP_ID_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  recordIds: unknown;
  revisions?: unknown;
}

/**
 * `DELETE /k/v1/records.json` — verified against
 * `docs/kintone/rest-api/records/delete-records` 2026-09-05.
 *
 * Kintone has no single-record delete endpoint — this bulk form (up to 100
 * IDs) is the only one that exists. All-or-nothing: if the call fails, no
 * records are deleted.
 */
const action: ActionDefinition<Input, Record<string, never>> = {
  key: "records-delete",
  type: "perform",
  resource: "record",
  title: "Delete Records",
  description: "Permanently delete up to 100 records by Record ID. Kintone has no single-record " +
    "delete endpoint.",
  idempotent: false,
  params: [
    APP_ID_PARAM,
    {
      key: "recordIds",
      label: "Record IDs",
      type: "json",
      required: true,
      hint: 'JSON array of Record IDs to delete, e.g. `["1", "2"]`. Up to 100 per call.',
    },
    {
      key: "revisions",
      label: "Expected Revisions",
      type: "json",
      advanced: true,
      hint: "Optional JSON array of expected revisions, positionally matched to Record IDs. If " +
        "any does not match its record's current revision, the whole call is refused and nothing " +
        "is deleted.",
    },
  ],
  // Kintone's own response body is `{}` — nothing to declare.
  output: [],

  async execute(input, ctx) {
    const ids = parseJson(input.recordIds, "recordIds");
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("`recordIds` must be a non-empty JSON array");
    }
    if (ids.length > 100) throw new Error("Kintone accepts at most 100 record IDs per call");
    const revisions = parseJson(input.revisions, "revisions");
    if (revisions !== undefined && !Array.isArray(revisions)) {
      throw new Error("`revisions` must be a JSON array");
    }
    ctx.log("info", "deleting Kintone records", { appId: input.appId, count: ids.length });
    return await new KintoneClient(ctx).request<Record<string, never>>("/records", {
      method: "DELETE",
      json: compact({ app: input.appId, ids, revisions }),
    });
  },
};

export default action;
