import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { fieldKeyParam, pipelineKeyParam } from "../lib/params.ts";

/** `DELETE /pipelines/{pipelineKey}/fields/{fieldKey}`. */
interface Input {
  pipelineKey: string;
  fieldKey: string;
}

const fieldDelete: ActionDefinition<Input> = {
  key: "field-delete",
  type: "perform",
  resource: "field",
  title: "Delete Pipeline Field",
  description: "Delete a custom field from a pipeline, along with its values on every box.",
  idempotent: true,
  params: [pipelineKeyParam, fieldKeyParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new StreakClient(ctx).del(
      `/pipelines/${encodeId(input.pipelineKey)}/fields/${encodeId(input.fieldKey)}`,
    );
  },
};

export default fieldDelete;
