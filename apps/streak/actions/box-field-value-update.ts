import type { ActionDefinition } from "@w6w/types";
import { boxKeyParam, fieldKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/**
 * `POST /boxes/{boxKey}/fields/{fieldKey}` — set one field's value on one
 * box, without resending the whole box. Cheaper than `box-update` when only
 * one field is changing.
 */
interface Input {
  boxKey: string;
  fieldKey: string;
  value: string;
}

const boxFieldValueUpdate: ActionDefinition<Input> = {
  key: "box-field-value-update",
  type: "perform",
  resource: "box-field",
  title: "Update Box Field Value",
  description: "Set one custom field's value on one box.",
  idempotent: true,
  params: [
    boxKeyParam,
    fieldKeyParam,
    {
      key: "value",
      label: "Value",
      type: "string",
      required: true,
      hint: "A DATE field takes milliseconds since epoch; a CHECKBOX field takes 'true'/'false'.",
    },
  ],
  output: [{ key: "data", type: "object", label: "{ key, value }" }],

  execute(input, ctx) {
    return new StreakClient(ctx).sendJson(
      "POST",
      `/boxes/${encodeId(input.boxKey)}/fields/${encodeId(input.fieldKey)}`,
      { value: input.value },
    );
  },
};

export default boxFieldValueUpdate;
