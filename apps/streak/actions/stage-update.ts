import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam, stageKeyParam } from "../lib/params.ts";

/** `POST /pipelines/{pipelineKey}/stages/{stageKey}` — rename a stage. JSON body. */
interface Input {
  pipelineKey: string;
  stageKey: string;
  name: string;
}

const stageUpdate: ActionDefinition<Input> = {
  key: "stage-update",
  type: "perform",
  resource: "stage",
  title: "Update Stage",
  description: "Rename a stage.",
  idempotent: true,
  params: [pipelineKeyParam, stageKeyParam, {
    key: "name",
    label: "Name",
    type: "string",
    required: true,
  }],
  output: [{ key: "data", type: "object", label: "The updated stage" }],

  execute(input, ctx) {
    return new StreakClient(ctx).sendJson(
      "POST",
      `/pipelines/${encodeId(input.pipelineKey)}/stages/${encodeId(input.stageKey)}`,
      { name: input.name },
    );
  },
};

export default stageUpdate;
