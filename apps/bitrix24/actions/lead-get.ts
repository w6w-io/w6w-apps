import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: number;
}

/**
 * `crm.lead.get` — verified against `api-reference/crm/leads/crm-lead-get.html`.
 * DEPRECATED by the vendor in favor of `crm.item.get` (see `README.md`).
 *
 * Returns a lead by id. Bitrix24 returns every field the portal has defined
 * for leads, including custom `UF_CRM_*` ones — only the common subset is
 * declared in `output`; the raw object is returned in full.
 */
const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Retrieve a lead by its identifier.",
  params: [idParam("Lead")],
  output: [
    { key: "ID", type: "number", label: "ID" },
    { key: "TITLE", type: "string", label: "Title" },
    { key: "NAME", type: "string", label: "First Name" },
    { key: "LAST_NAME", type: "string", label: "Last Name" },
    { key: "STATUS_ID", type: "string", label: "Status" },
    { key: "SOURCE_ID", type: "string", label: "Source" },
    { key: "OPPORTUNITY", type: "string", label: "Amount" },
    { key: "CURRENCY_ID", type: "string", label: "Currency" },
    { key: "ASSIGNED_BY_ID", type: "string", label: "Assigned To (User ID)" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");
    return await new Bitrix24Client(ctx).call<Record<string, unknown>>("crm.lead.get", { id });
  },
};

export default action;
