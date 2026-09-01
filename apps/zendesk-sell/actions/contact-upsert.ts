import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { customFieldsParam, tagsParam } from "../lib/params.ts";

/**
 * `POST /v2/contacts/upsert?<filters>` — find-or-create by a set of QUERY
 * filters (not the request body), then apply the body as an update (or as the
 * initial values, on create).
 *
 * At least one filter is required, or the vendor returns an error. If more
 * than one contact matches the filters, the vendor returns `409 Conflict`
 * rather than guessing which to update — this app surfaces that verbatim
 * rather than picking one.
 */
interface Input {
  filterEmail?: string;
  filterPhone?: string;
  filterCustomFieldName?: string;
  filterCustomFieldValue?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  customerStatus?: string;
  prospectStatus?: string;
  tags?: string;
  customFields?: unknown;
  extraFields?: unknown;
}

const contactUpsert: ActionDefinition<Input> = {
  key: "contact-upsert",
  type: "perform",
  resource: "contact",
  title: "Upsert Contact",
  description:
    "Find a contact by filter and update it, or create one if no filter matches. Prefer this " +
    "over Create when a workflow might run more than once for the same contact.",
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
    { key: "name", label: "Name (organization)", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "customerStatus",
      label: "Customer status",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "current", label: "Current customer" },
        { value: "past", label: "Past customer" },
      ],
    },
    {
      key: "prospectStatus",
      label: "Prospect status",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "current", label: "Current prospect" },
        { value: "lost", label: "Lost prospect" },
      ],
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
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
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
        name: input.name,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        customer_status: input.customerStatus,
        prospect_status: input.prospectStatus,
      }),
      tags: toList(input.tags),
      custom_fields: asOptionalJson(input.customFields, "Custom fields"),
      ...(extra ?? {}),
    };
    return await new SellClient(ctx).create(`/contacts/upsert?${search.toString()}`, data);
  },
};

export default contactUpsert;
