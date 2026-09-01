import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { customFieldsParam, tagsParam } from "../lib/params.ts";

/**
 * `POST /v2/deals/upsert?<filters>` — find-or-create by query filters, then
 * apply the body. See `contact-upsert.ts` for the shared behaviour.
 */
interface Input {
  filterContactId?: number;
  filterName?: string;
  filterCustomFieldName?: string;
  filterCustomFieldValue?: string;
  name?: string;
  contactId?: number;
  value?: string;
  stageId?: number;
  tags?: string;
  customFields?: unknown;
  extraFields?: unknown;
}

const dealUpsert: ActionDefinition<Input> = {
  key: "deal-upsert",
  type: "perform",
  resource: "deal",
  title: "Upsert Deal",
  description:
    "Find a deal by filter and update it, or create one if no filter matches. Prefer this over " +
    "Create when a workflow might run more than once for the same deal.",
  idempotent: true,
  params: [
    {
      key: "filterContactId",
      label: "Filter: primary contact ID",
      type: "number",
      hint: "At least one filter field is required.",
    },
    { key: "filterName", label: "Filter: name", type: "string" },
    {
      key: "filterCustomFieldName",
      label: "Filter: custom field name",
      type: "string",
      hint: "Must already be defined and marked Filterable in the Sell account.",
    },
    { key: "filterCustomFieldValue", label: "Filter: custom field value", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "contactId", label: "Primary contact ID", type: "number" },
    {
      key: "value",
      label: "Value",
      type: "string",
      hint: 'Send as a string with two decimal places, e.g. "1000.50".',
    },
    { key: "stageId", label: "Stage ID", type: "number" },
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
    if (
      !input.filterContactId && !input.filterName &&
      !(input.filterCustomFieldName && input.filterCustomFieldValue)
    ) {
      throw new Error("at least one filter (contact ID, name, or a custom field) is required");
    }

    const query = compact({
      contact_id: input.filterContactId,
      name: input.filterName,
      ...(input.filterCustomFieldName && input.filterCustomFieldValue
        ? { [`custom_fields[${input.filterCustomFieldName}]`]: input.filterCustomFieldValue }
        : {}),
    });
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) search.set(k, String(v));

    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const data = {
      ...compact({
        name: input.name,
        contact_id: input.contactId,
        value: input.value,
        stage_id: input.stageId,
      }),
      tags: toList(input.tags),
      custom_fields: asOptionalJson(input.customFields, "Custom fields"),
      ...(extra ?? {}),
    };
    return await new SellClient(ctx).create(`/deals/upsert?${search.toString()}`, data);
  },
};

export default dealUpsert;
