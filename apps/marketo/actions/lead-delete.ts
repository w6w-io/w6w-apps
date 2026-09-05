import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";

/**
 * `POST /rest/v1/leads/delete.json` — verified against `leads.md`
 * ("Delete"). Body carries `{"input": [{"id": ...}, ...]}`, up to 300 ids
 * per call. There is no trash to restore a deleted lead from, so this is
 * gated behind an explicit confirmation, the pattern this pack uses for
 * every irreversible delete (e.g. `mautic`'s `contact-delete`).
 *
 * `idempotent: true` — re-issuing the same delete against an already-deleted
 * id does not create a new side effect; the lead is simply already gone.
 */
const action: ActionDefinition = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete leads",
  description: "Permanently delete one or more leads.",
  idempotent: true,
  params: [
    {
      key: "leadIds",
      label: "Lead IDs",
      type: "string",
      required: true,
      hint: "One or more lead IDs, comma-separated. Up to 300.",
    },
    {
      key: "confirm",
      label: "I understand these leads cannot be recovered",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. There is no trash to restore a deleted lead from.",
    },
  ],
  output: [{ key: "result", type: "array", label: "Per-lead delete status" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = String(p.leadIds ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) throw new Error("`leadIds` must contain at least one numeric ID");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a lead cannot be undone");
    }

    ctx.log("warn", "deleting Marketo leads", { ids });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>("/leads/delete.json", {
      method: "POST",
      body: { input: ids.map((id) => ({ id })) },
    });
    return res.result ?? [];
  },
};

export default action;
