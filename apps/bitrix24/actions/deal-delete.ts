import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client } from "../lib/client.ts";
import { CONFIRM_DELETE_PARAM, idParam } from "../lib/params.ts";

interface Input {
  id: number;
  confirm: boolean;
}

/**
 * `crm.deal.delete` — verified against `api-reference/crm/deals/crm-deal-delete.html`.
 * DEPRECATED by the vendor in favor of `crm.item.delete` (see `README.md`).
 *
 * Cascades to the deal's own history and linked-only objects. Gated behind
 * an explicit confirmation.
 */
const action: ActionDefinition<Input, { id: number; deleted: boolean }> = {
  key: "deal-delete",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description: "Permanently delete a deal and its history.",
  idempotent: true,
  params: [idParam("Deal"), CONFIRM_DELETE_PARAM],
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");
    if (input.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a deal cannot be undone");
    }

    ctx.log("warn", "deleting a Bitrix24 deal", { id });
    const deleted = await new Bitrix24Client(ctx).call<boolean>("crm.deal.delete", { id });
    return { id, deleted };
  },
};

export default action;
