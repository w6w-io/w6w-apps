import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client } from "../lib/client.ts";
import { CONFIRM_DELETE_PARAM, idParam } from "../lib/params.ts";

interface Input {
  id: number;
  confirm: boolean;
}

/**
 * `crm.lead.delete` — verified against `api-reference/crm/leads/crm-lead-delete.html`.
 * DEPRECATED by the vendor in favor of `crm.item.delete` (see `README.md`).
 *
 * "Removes a lead and all associated objects: tasks, history, timeline
 * records" (the vendor's own wording) — not linked-only removal, an actual
 * cascading delete. Gated behind an explicit confirmation.
 */
const action: ActionDefinition<Input, { id: number; deleted: boolean }> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Permanently delete a lead and its history.",
  idempotent: true,
  params: [idParam("Lead"), CONFIRM_DELETE_PARAM],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");
    if (input.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a lead cannot be undone");
    }

    ctx.log("warn", "deleting a Bitrix24 lead", { id });
    const deleted = await new Bitrix24Client(ctx).call<boolean>("crm.lead.delete", { id });
    return { id, deleted };
  },
};

export default action;
