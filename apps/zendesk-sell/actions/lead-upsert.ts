import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { customFieldsParam, tagsParam } from "../lib/params.ts";

/**
 * `POST /v2/leads/upsert?<filters>` — find-or-create by query filters, then
 * apply the body. See `contact-upsert.ts` for the shared behaviour (409 on
 * ambiguous match, at least one filter required).
 */
interface Input {
  filterEmail?: string;
  filterPhone?: string;
  filterCustomFieldName?: string;
  filterCustomFieldValue?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  status?: string;
  email?: string;
  phone?: string;
  tags?: string;
  customFields?: unknown;
  extraFields?: unknown;
}

const leadUpsert: ActionDefinition<Input> = {
  key: "lead-upsert",
  type: "perform",
  resource: "lead",
  title: "Upsert Lead",
  description:
    "Find a lead by filter and update it, or create one if no filter matches. Prefer this over " +
    "Create when a workflow might run more than once for the same lead.",
  idempotent: true,
  params: [
    {
      key: "filterEmail",
      label: "Filter: email",
      type: "string",
      hint: "At least one filter field is required.",
    },
    { key: "filterPhone", label: "Filter: phone", type: "string" },
    {
      key: "filterCustomFieldName",
      label: "Filter: custom field name",
      type: "string",
      hint: "Must already be defined and marked Filterable in the Sell account.",
    },
    { key: "filterCustomFieldValue", label: "Filter: custom field value", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "organizationName", label: "Organization name", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
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
    { key: "id", type: "number", label: "Lead ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    if (
      !input.filterEmail && !input.filterPhone &&
      !(input.filterCustomFieldName && input.filterCustomFieldValue)
    ) {
      throw new Error("at least one filter (email, phone, or a custom field) is required");
    }

    const query = compact({
      email: input.filterEmail,
      phone: input.filterPhone,
      ...(input.filterCustomFieldName && input.filterCustomFieldValue
        ? { [`custom_fields[${input.filterCustomFieldName}]`]: input.filterCustomFieldValue }
        : {}),
    });
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) search.set(k, String(v));

    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const data = {
      ...compact({
        first_name: input.firstName,
        last_name: input.lastName,
        organization_name: input.organizationName,
        status: input.status,
        email: input.email,
        phone: input.phone,
      }),
      tags: toList(input.tags),
      custom_fields: asOptionalJson(input.customFields, "Custom fields"),
      ...(extra ?? {}),
    };
    return await new SellClient(ctx).create(`/leads/upsert?${search.toString()}`, data);
  },
};

export default leadUpsert;
