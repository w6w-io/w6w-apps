import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { fieldTypeOptions, pipelineKeyParam } from "../lib/params.ts";

/**
 * `PUT /pipelines/{pipelineKey}/fields` — create a custom field.
 *
 * Form-urlencoded, like `pipeline-create` and `stage-create` — see
 * `lib/client.ts`. `PERSON` is deliberately absent from the type options:
 * the vendor's own docs list `TEXT_INPUT`, `DATE`, `TAG`, `FORMULA`,
 * `DROPDOWN`, `CHECKBOX` and `TEAM_CONTACT` as creatable, and `PERSON` shows
 * up only on Streak's own built-in fields (e.g. "Assigned To").
 */
interface Input {
  pipelineKey: string;
  name: string;
  type: string;
}

const fieldCreate: ActionDefinition<Input> = {
  key: "field-create",
  type: "perform",
  resource: "field",
  title: "Create Pipeline Field",
  description: "Add a new custom field to a pipeline.",
  idempotent: false,
  params: [
    pipelineKeyParam,
    { key: "name", label: "Name", type: "string", required: true },
    { key: "type", label: "Type", type: "select", required: true, options: fieldTypeOptions },
  ],
  output: [{ key: "data", type: "object", label: "The created field" }],

  execute(input, ctx) {
    return new StreakClient(ctx).putForm(
      `/pipelines/${encodeId(input.pipelineKey)}/fields`,
      { name: input.name, type: input.type },
    );
  },
};

export default fieldCreate;
