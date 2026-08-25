import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam, stageKeyParam } from "../lib/params.ts";

/** `DELETE /pipelines/{pipelineKey}/stages/{stageKey}`. */
interface Input {
  pipelineKey: string;
  stageKey: string;
}

const stageDelete: ActionDefinition<Input> = {
  key: "stage-delete",
  type: "perform",
  resource: "stage",
  title: "Delete Stage",
  description: "Delete a stage from a pipeline. Boxes in that stage are not deleted.",
  idempotent: true,
  params: [pipelineKeyParam, stageKeyParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new StreakClient(ctx).del(
      `/pipelines/${encodeId(input.pipelineKey)}/stages/${encodeId(input.stageKey)}`,
    );
  },
};

export default stageDelete;
