import type { ActionDefinition } from "@w6w/types";
import { unwrapEnvelope, ZohoCampaignsClient } from "../lib/client.ts";

const FIELD_TYPES = [
  "Text",
  "Integer",
  "Phone",
  "Date",
  "Picklist",
  "Email",
  "Checkbox",
  "LongInteger",
  "URL",
  "textarea",
  "RadioOption",
  "Multiselect",
  "DateTime",
  "Decimal",
  "Percent",
];

interface Input {
  fieldName: string;
  fieldType: string;
  fieldLength?: number;
}

interface Output {
  message?: string;
  fieldName?: string;
  fieldType?: string;
}

/**
 * `POST /custom/add` — verified against
 * `https://www.zoho.com/campaigns/help/developers/create-custom-field.html`.
 * Uses `type=json`, not `resfmt=JSON` — see `contact-fields-list.ts` and
 * `lib/client.ts`'s module doc.
 */
const contactFieldCreate: ActionDefinition<Input, Output> = {
  key: "contact-field-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact Field",
  description: "Create a custom contact field to store extra information per contact.",
  idempotent: false,
  params: [
    { key: "fieldName", label: "Field name", type: "string", required: true },
    {
      key: "fieldType",
      label: "Field type",
      type: "select",
      required: true,
      options: FIELD_TYPES.map((value) => ({ value, label: value })),
    },
    {
      key: "fieldLength",
      label: "Field length",
      type: "number",
      default: 20,
      hint: "Maximum length of the field's value.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "fieldName", type: "string", label: "Field name" },
    { key: "fieldType", type: "string", label: "Field type" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "custom/add",
      {
        method: "POST",
        formatParam: "type",
        query: {
          fieldname: input.fieldName,
          fieldtype: input.fieldType,
          fieldlength: input.fieldLength,
        },
      },
    );
    const envelope = unwrapEnvelope<{ message?: string; fieldname?: string; fieldtype?: string }>(
      body,
    );
    return {
      message: envelope.message,
      fieldName: envelope.fieldname,
      fieldType: envelope.fieldtype,
    };
  },
};

export default contactFieldCreate;
