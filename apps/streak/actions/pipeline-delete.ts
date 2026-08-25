import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/**
 * `DELETE /pipelines/{pipelineKey}` — permanently delete a pipeline and
 * every box in it. Streak documents no undo.
 */
interface Input {
  pipelineKey: string;
}

const pipelineDelete: ActionDefinition<Input> = {
  key: "pipeline-delete",
  type: "perform",
  resource: "pipeline",
  title: "Delete Pipeline",
  description: "Permanently delete a pipeline and every box in it. This cannot be undone.",
  idempotent: true,
  params: [pipelineKeyParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new StreakClient(ctx).del(`/pipelines/${encodeId(input.pipelineKey)}`);
  },
};

export default pipelineDelete;
