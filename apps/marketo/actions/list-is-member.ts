import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { LEAD_IDS_PARAM, LIST_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /rest/v1/lists/{listId}/leads/ismember.json?id=...` — verified against
 * `list-membership.md` ("Member of List"). Each result entry's `status` is
 * `memberof`, `notmemberof`, or `skipped` (lead not found) — not a boolean.
 */
const action: ActionDefinition = {
  key: "list-is-member",
  type: "read",
  resource: "list",
  title: "Check list membership",
  description: "Check whether one or more leads belong to a static list.",
  params: [LIST_ID_PARAM, LEAD_IDS_PARAM],
  output: [{ key: "result", type: "array", label: "Per-lead membership status" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = Number(p.listId);
    if (!Number.isFinite(listId)) throw new Error("`listId` must be a number");
    const ids = String(p.leadIds ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) throw new Error("`leadIds` must contain at least one numeric ID");

    ctx.log("info", "checking Marketo list membership", { listId, count: ids.length });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(
      `/lists/${listId}/leads/ismember.json`,
      { query: { id: ids } },
    );
    return res.result ?? [];
  },
};

export default action;
