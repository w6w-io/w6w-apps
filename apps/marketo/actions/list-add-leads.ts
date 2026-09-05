import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { LEAD_IDS_PARAM, LIST_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /rest/v1/lists/{listId}/leads.json?id=...` — verified against
 * `list-membership.md` ("Add to List"). Lead IDs travel as repeated `id`
 * query parameters, not a JSON body. Up to 300 per call.
 *
 * `idempotent: true` — adding a lead already on the list is a no-op, not a
 * duplicate membership row.
 */
const action: ActionDefinition = {
  key: "list-add-leads",
  type: "perform",
  resource: "list",
  title: "Add leads to a list",
  description: "Add one or more leads to a static list.",
  idempotent: true,
  params: [LIST_ID_PARAM, LEAD_IDS_PARAM],
  output: [{ key: "result", type: "array", label: "Per-lead add status" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = Number(p.listId);
    if (!Number.isFinite(listId)) throw new Error("`listId` must be a number");
    const ids = String(p.leadIds ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) throw new Error("`leadIds` must contain at least one numeric ID");

    ctx.log("info", "adding leads to a Marketo list", { listId, count: ids.length });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(
      `/lists/${listId}/leads.json`,
      { method: "POST", query: { id: ids } },
    );
    return res.result ?? [];
  },
};

export default action;
