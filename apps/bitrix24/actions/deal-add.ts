import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client, compact, parseJson } from "../lib/client.ts";
import { EXTRA_FIELDS_PARAM } from "../lib/params.ts";

interface Input {
  title?: string;
  typeId?: string;
  categoryId?: number;
  stageId?: string;
  currencyId?: string;
  opportunity?: number;
  companyId?: number;
  contactIds?: string | number[];
  begindate?: string;
  closedate?: string;
  comments?: string;
  assignedById?: number;
  extraFields?: string | Record<string, unknown>;
}

/**
 * `crm.deal.add` — verified against `api-reference/crm/deals/crm-deal-add.html`.
 * DEPRECATED by the vendor in favor of `crm.item.add` (see `README.md`).
 */
const action: ActionDefinition<Input, { id: number }> = {
  key: "deal-add",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Create a new CRM deal.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", hint: 'Defaults to "Deal #{id}".' },
    {
      key: "typeId",
      label: "Deal Type",
      type: "string",
      hint: 'List types with `crm.status.list`, filter { ENTITY_ID: "DEAL_TYPE" }.',
    },
    {
      key: "categoryId",
      label: "Funnel ID",
      type: "number",
      hint: "List funnels with `crm.category.list`, entityTypeId 2. Defaults to the main funnel.",
    },
    {
      key: "stageId",
      label: "Stage",
      type: "string",
      hint: 'List stages with `crm.status.list`, filter { ENTITY_ID: "DEAL_STAGE" } (main ' +
        'funnel) or { ENTITY_ID: "DEAL_STAGE_{categoryId}" } (a named funnel).',
    },
    { key: "currencyId", label: "Currency", type: "string" },
    { key: "opportunity", label: "Amount", type: "number" },
    { key: "companyId", label: "Company ID", type: "number", advanced: true },
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "json",
      advanced: true,
      hint: "JSON array of contact ids to link, e.g. [12, 34].",
    },
    { key: "begindate", label: "Start Date", type: "date", advanced: true },
    { key: "closedate", label: "Close Date", type: "date", advanced: true },
    { key: "comments", label: "Comments", type: "text", advanced: true },
    { key: "assignedById", label: "Assigned To (User ID)", type: "number", advanced: true },
    EXTRA_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Deal ID" }],

  async execute(input, ctx) {
    const extra = parseJson(input.extraFields, "extraFields") as
      | Record<string, unknown>
      | undefined;
    if (extra !== undefined && (typeof extra !== "object" || Array.isArray(extra))) {
      throw new Error("`extraFields` must be a JSON object");
    }
    const contactIds = parseJson(input.contactIds, "contactIds");
    if (contactIds !== undefined && !Array.isArray(contactIds)) {
      throw new Error("`contactIds` must be a JSON array");
    }

    const fields = {
      ...(extra ?? {}),
      ...compact({
        TITLE: input.title,
        TYPE_ID: input.typeId,
        CATEGORY_ID: input.categoryId,
        STAGE_ID: input.stageId,
        CURRENCY_ID: input.currencyId,
        OPPORTUNITY: input.opportunity,
        COMPANY_ID: input.companyId,
        CONTACT_IDS: contactIds,
        BEGINDATE: input.begindate,
        CLOSEDATE: input.closedate,
        COMMENTS: input.comments,
        ASSIGNED_BY_ID: input.assignedById,
      }),
    };

    ctx.log("info", "creating Bitrix24 deal", { title: input.title });
    const id = await new Bitrix24Client(ctx).call<number>("crm.deal.add", { fields });
    return { id };
  },
};

export default action;
