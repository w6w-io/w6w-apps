import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/**
 * `PUT /pipelines/{pipelineKey}/stages` — create a stage.
 *
 * Form-urlencoded, like `pipeline-create` and `field-create` — see
 * `lib/client.ts` for why that matters.
 */
interface Input {
  pipelineKey: string;
  name: string;
}

const stageCreate: ActionDefinition<Input> = {
  key: "stage-create",
  type: "perform",
  resource: "stage",
  title: "Create Stage",
  description: "Add a new stage to a pipeline.",
  idempotent: false,
  params: [pipelineKeyParam, { key: "name", label: "Name", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The created stage" }],

  execute(input, ctx) {
    return new StreakClient(ctx).putForm(
      `/pipelines/${encodeId(input.pipelineKey)}/stages`,
      { name: input.name },
    );
  },
};

export default stageCreate;
