import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client, compact, parseJson } from "../lib/client.ts";
import { EXTRA_FIELDS_PARAM, idParam } from "../lib/params.ts";

interface Input {
  id: number;
  title?: string;
  stageId?: string;
  opportunity?: number;
  currencyId?: string;
  closedate?: string;
  comments?: string;
  assignedById?: number;
  extraFields?: string | Record<string, unknown>;
}

/**
 * `crm.deal.update` — verified against `api-reference/crm/deals/crm-deal-update.html`.
 * DEPRECATED by the vendor in favor of `crm.item.update` (see `README.md`).
 *
 * Only the fields provided are changed. Retrying with the same input is
 * safe — it sets the same absolute values again.
 */
const action: ActionDefinition<Input, { id: number; updated: boolean }> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update an existing deal's fields.",
  idempotent: true,
  params: [
    idParam("Deal"),
    { key: "title", label: "Title", type: "string" },
    { key: "stageId", label: "Stage", type: "string" },
    { key: "opportunity", label: "Amount", type: "number" },
    { key: "currencyId", label: "Currency", type: "string", advanced: true },
    { key: "closedate", label: "Close Date", type: "date", advanced: true },
    { key: "comments", label: "Comments", type: "text", advanced: true },
    { key: "assignedById", label: "Assigned To (User ID)", type: "number", advanced: true },
    EXTRA_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "updated", type: "boolean", label: "Updated" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");

    const extra = parseJson(input.extraFields, "extraFields") as
      | Record<string, unknown>
      | undefined;
    if (extra !== undefined && (typeof extra !== "object" || Array.isArray(extra))) {
      throw new Error("`extraFields` must be a JSON object");
    }

    const fields = {
      ...(extra ?? {}),
      ...compact({
        TITLE: input.title,
        STAGE_ID: input.stageId,
        OPPORTUNITY: input.opportunity,
        CURRENCY_ID: input.currencyId,
        CLOSEDATE: input.closedate,
        COMMENTS: input.comments,
        ASSIGNED_BY_ID: input.assignedById,
      }),
    };
    if (Object.keys(fields).length === 0) {
      throw new Error("update requires at least one field to change");
    }

    ctx.log("info", "updating Bitrix24 deal", { id });
    const updated = await new Bitrix24Client(ctx).call<boolean>("crm.deal.update", { id, fields });
    return { id, updated };
  },
};

export default action;
