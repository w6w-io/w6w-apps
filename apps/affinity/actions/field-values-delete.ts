import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, type SuccessBody } from "../lib/client.ts";

/** `DELETE /field-values/{field_value_id}`. */
interface Input {
  fieldValueId: number;
}

const fieldValuesDelete: ActionDefinition<Input> = {
  key: "field-values-delete",
  type: "perform",
  resource: "field-value",
  title: "Delete Field Value",
  description: "Clear a single cell (field value).",
  idempotent: true,
  params: [
    {
      key: "fieldValueId",
      label: "Field Value ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx): Promise<SuccessBody> {
    return new AffinityClient(ctx).delete(`/field-values/${input.fieldValueId}`);
  },
};

export default fieldValuesDelete;
