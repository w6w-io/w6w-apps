import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, asFieldValue } from "../lib/client.ts";

/** `PUT /field-values/{field_value_id}` — updates an existing cell's value. */
interface Input {
  fieldValueId: number;
  value: unknown;
}

const fieldValuesUpdate: ActionDefinition<Input> = {
  key: "field-values-update",
  type: "perform",
  resource: "field-value",
  title: "Update Field Value",
  description:
    "Change the value of an existing field value. Use the field_value_id, not the field_id.",
  idempotent: false,
  params: [
    {
      key: "fieldValueId",
      label: "Field Value ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "value",
      label: "Value",
      type: "json",
      required: true,
      hint: "Same shape rules as Create Field Value — a dropdown option ID for Ranked Dropdown " +
        "fields, not a string.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Field Value ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/field-values/${input.fieldValueId}`, {
      method: "PUT",
      body: { value: asFieldValue(input.value, "value") },
    });
  },
};

export default fieldValuesUpdate;
