import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { LEAD_IDS_PARAM, LIST_ID_PARAM } from "../lib/params.ts";

/**
 * `DELETE /rest/v1/lists/{listId}/leads.json?id=...` — verified against
 * `list-membership.md` ("Remove from List"). Same repeated-`id`-query-param
 * shape as Add to List, just a DELETE verb. Up to 300 ids per call.
 *
 * `idempotent: true` — removing a lead already off the list, or one that
 * does not exist, just answers "skipped" for that id rather than erroring
 * the whole call.
 */
const action: ActionDefinition = {
  key: "list-remove-leads",
  type: "perform",
  resource: "list",
  title: "Remove leads from a list",
  description: "Remove one or more leads from a static list.",
  idempotent: true,
  params: [LIST_ID_PARAM, LEAD_IDS_PARAM],
  output: [{ key: "result", type: "array", label: "Per-lead remove status" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = Number(p.listId);
    if (!Number.isFinite(listId)) throw new Error("`listId` must be a number");
    const ids = String(p.leadIds ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) throw new Error("`leadIds` must contain at least one numeric ID");

    ctx.log("info", "removing leads from a Marketo list", { listId, count: ids.length });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(
      `/lists/${listId}/leads.json`,
      { method: "DELETE", query: { id: ids } },
    );
    return res.result ?? [];
  },
};

export default action;
