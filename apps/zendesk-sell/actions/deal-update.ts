import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { customFieldsParam, ownerIdParam, tagsParam } from "../lib/params.ts";

interface Input {
  id: number;
  name?: string;
  contactId?: number;
  value?: string;
  currency?: string;
  ownerId?: number;
  hot?: boolean;
  stageId?: number;
  sourceId?: number;
  lossReasonId?: number;
  unqualifiedReasonId?: number;
  estimatedCloseDate?: string;
  customizedWinLikelihood?: number;
  tags?: string;
  customFields?: unknown;
  extraFields?: unknown;
}

const dealUpdate: ActionDefinition<Input> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update an existing deal. Tags are replaced wholesale — supply the entire set.",
  idempotent: true,
  params: [
    { key: "id", label: "Deal ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "contactId", label: "Primary contact ID", type: "number" },
    {
      key: "value",
      label: "Value",
      type: "string",
      hint: 'Send as a string with two decimal places, e.g. "1000.50".',
    },
    { key: "currency", label: "Currency (ISO 4217)", type: "string" },
    ownerIdParam,
    { key: "hot", label: "Hot", type: "boolean" },
    { key: "stageId", label: "Stage ID", type: "number" },
    { key: "sourceId", label: "Source ID", type: "number" },
    { key: "lossReasonId", label: "Loss reason ID", type: "number" },
    { key: "unqualifiedReasonId", label: "Unqualified reason ID", type: "number" },
    { key: "estimatedCloseDate", label: "Estimated close date", type: "date" },
    {
      key: "customizedWinLikelihood",
      label: "Win likelihood (0-100)",
      type: "number",
      validation: { min: 0, max: 100 },
    },
    tagsParam,
    customFieldsParam,
    {
      key: "extraFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Merged into the request body, overriding the fields above.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const data = {
      ...compact({
        name: input.name,
        contact_id: input.contactId,
        value: input.value,
        currency: input.currency,
        owner_id: input.ownerId,
        hot: input.hot,
        stage_id: input.stageId,
        source_id: input.sourceId,
        loss_reason_id: input.lossReasonId,
        unqualified_reason_id: input.unqualifiedReasonId,
        estimated_close_date: input.estimatedCloseDate,
        customized_win_likelihood: input.customizedWinLikelihood,
      }),
      tags: toList(input.tags),
      custom_fields: asOptionalJson(input.customFields, "Custom fields"),
      ...(extra ?? {}),
    };
    return await new SellClient(ctx).update(`/deals/${encodeURIComponent(String(input.id))}`, data);
  },
};

export default dealUpdate;
