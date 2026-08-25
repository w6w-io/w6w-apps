import type { ActionDefinition } from "@w6w/types";
import { boxKeyParam, fieldKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `GET /boxes/{boxKey}/fields/{fieldKey}` — one field's value on one box. */
interface Input {
  boxKey: string;
  fieldKey: string;
}

const boxFieldValueGet: ActionDefinition<Input> = {
  key: "box-field-value-get",
  type: "read",
  resource: "box-field",
  title: "Get Box Field Value",
  description: "Read one custom field's value on one box.",
  params: [boxKeyParam, fieldKeyParam],
  output: [{ key: "data", type: "object", label: "{ key, value }" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(
      `/boxes/${encodeId(input.boxKey)}/fields/${encodeId(input.fieldKey)}`,
    );
  },
};

export default boxFieldValueGet;
