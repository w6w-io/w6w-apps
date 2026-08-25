import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { fieldKeyParam, pipelineKeyParam } from "../lib/params.ts";

/** `GET /pipelines/{pipelineKey}/fields/{fieldKey}`. */
interface Input {
  pipelineKey: string;
  fieldKey: string;
}

const fieldGet: ActionDefinition<Input> = {
  key: "field-get",
  type: "read",
  resource: "field",
  title: "Get Pipeline Field",
  description: "Fetch one field's name and type.",
  params: [pipelineKeyParam, fieldKeyParam],
  output: [{ key: "data", type: "object", label: "The field" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(
      `/pipelines/${encodeId(input.pipelineKey)}/fields/${encodeId(input.fieldKey)}`,
    );
  },
};

export default fieldGet;
