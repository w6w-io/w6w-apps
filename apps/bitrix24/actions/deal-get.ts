import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: number;
}

/**
 * `crm.deal.get` — verified against `api-reference/crm/deals/crm-deal-get.html`.
 * DEPRECATED by the vendor in favor of `crm.item.get` (see `README.md`).
 */
const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Retrieve a deal by its identifier.",
  params: [idParam("Deal")],
  output: [
    { key: "ID", type: "number", label: "ID" },
    { key: "TITLE", type: "string", label: "Title" },
    { key: "STAGE_ID", type: "string", label: "Stage" },
    { key: "OPPORTUNITY", type: "string", label: "Amount" },
    { key: "CURRENCY_ID", type: "string", label: "Currency" },
    { key: "CLOSED", type: "string", label: "Closed" },
    { key: "ASSIGNED_BY_ID", type: "string", label: "Assigned To (User ID)" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");
    return await new Bitrix24Client(ctx).call<Record<string, unknown>>("crm.deal.get", { id });
  },
};

export default action;
