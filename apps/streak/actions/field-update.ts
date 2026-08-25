import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { fieldKeyParam, pipelineKeyParam } from "../lib/params.ts";

/**
 * `POST /pipelines/{pipelineKey}/fields/{fieldKey}` — rename a field. JSON
 * body. Streak's spec documents only `name` as editable here; the field's
 * `type` is fixed once created.
 */
interface Input {
  pipelineKey: string;
  fieldKey: string;
  name: string;
}

const fieldUpdate: ActionDefinition<Input> = {
  key: "field-update",
  type: "perform",
  resource: "field",
  title: "Update Pipeline Field",
  description: "Rename a pipeline field. A field's type cannot be changed once created.",
  idempotent: true,
  params: [pipelineKeyParam, fieldKeyParam, {
    key: "name",
    label: "Name",
    type: "string",
    required: true,
  }],
  output: [{ key: "data", type: "object", label: "The updated field" }],

  execute(input, ctx) {
    return new StreakClient(ctx).sendJson(
      "POST",
      `/pipelines/${encodeId(input.pipelineKey)}/fields/${encodeId(input.fieldKey)}`,
      { name: input.name },
    );
  },
};

export default fieldUpdate;
